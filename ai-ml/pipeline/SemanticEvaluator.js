import crypto from "crypto";
// Lazily import optional DB dependencies to keep the evaluator test-friendly
let mongoose;
let SemanticCache;

const HF_MODEL_URL =
  "https://router.huggingface.co/hf-inference/models/sentence-transformers/all-MiniLM-L6-v2/pipeline/sentence-similarity";

const roundToTwo = (value) => Number(value.toFixed(2));
const getHash = (text) => crypto.createHash("md5").update(text.trim()).digest("hex");

// ─── Retry config ─────────────────────────────────────────────────────────────
const MAX_RETRIES = 2;
const BASE_BACKOFF_MS = 1000; // 1s, 2s

// ─── Circuit breaker (in-memory, per process) ─────────────────────────────────
// Prevents hammering HF when the free tier is exhausted.
// Trips after FAILURE_THRESHOLD consecutive 429s; resets after RESET_AFTER_MS.
const CIRCUIT = {
  failures: 0,
  FAILURE_THRESHOLD: 3,
  RESET_AFTER_MS: 60_000, // 1 minute
  trippedAt: null,

  isOpen() {
    if (this.trippedAt === null) return false;
    if (Date.now() - this.trippedAt > this.RESET_AFTER_MS) {
      console.log("[semanticEvaluator] 🔁 Circuit breaker reset — retrying HF API.");
      this.failures = 0;
      this.trippedAt = null;
      return false;
    }
    return true;
  },

  recordFailure() {
    this.failures += 1;
    if (this.failures >= this.FAILURE_THRESHOLD) {
      this.trippedAt = Date.now();
      console.warn(
        `[semanticEvaluator] ⛔ Circuit breaker tripped after ${this.failures} consecutive ` +
          `rate-limit errors. HF calls suspended for ${this.RESET_AFTER_MS / 1000}s.`
      );
    }
  },

  recordSuccess() {
    this.failures = 0;
    this.trippedAt = null;
  },
};

// ─── Custom error class ───────────────────────────────────────────────────────
class HFRateLimitError extends Error {
  constructor(retryAfter) {
    super("HuggingFace API rate limit (429)");
    this.name = "HFRateLimitError";
    this.retryAfter = retryAfter; // seconds | null
  }
}

// ─── Sleep helper ─────────────────────────────────────────────────────────────
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// ─── Core HF call (single attempt) ───────────────────────────────────────────
async function callHFOnce(sourceText, compareText, hfToken) {
  const response = await fetch(HF_MODEL_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${hfToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      inputs: {
        source_sentence: sourceText.trim(),
        sentences: [compareText.trim()],
      },
    }),
  });

  if (response.status === 429) {
    const retryAfterHeader = response.headers.get("Retry-After");
    const retryAfter = retryAfterHeader ? parseInt(retryAfterHeader, 10) : null;
    throw new HFRateLimitError(retryAfter);
  }

  if (!response.ok) {
    const errorBody = await response.text();
    console.error(`[semanticEvaluator] HF API error (${response.status}):`, errorBody);
    throw new Error(`Hugging Face API returned ${response.status}: ${response.statusText}`);
  }

  const data = await response.json();

  if (!Array.isArray(data) || data.length === 0) {
    console.error("[semanticEvaluator] Unexpected response:", JSON.stringify(data).slice(0, 200));
    throw new Error("Invalid response format from Hugging Face API");
  }

  return data[0]; // similarity score 0–1
}

// ─── computeSimilarity: retry with exponential backoff on 429 ─────────────────
const computeSimilarity = async (sourceText, compareText, hfToken) => {
  if (!hfToken) throw new Error("HF_API_TOKEN environment variable is not set");

  // Short-circuit if the circuit breaker is open
  if (CIRCUIT.isOpen()) {
    throw new HFRateLimitError(null);
  }

  let lastError;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const similarity = await callHFOnce(sourceText, compareText, hfToken);
      CIRCUIT.recordSuccess();
      console.log(
        `[semanticEvaluator] ✅ Similarity computed: ${roundToTwo(similarity * 100)}%` +
          (attempt > 0 ? ` (after ${attempt} retry)` : "")
      );
      return similarity;
    } catch (err) {
      lastError = err;

      if (err instanceof HFRateLimitError) {
        CIRCUIT.recordFailure();

        if (attempt < MAX_RETRIES) {
          // Honor Retry-After if HF gave one; otherwise use exponential backoff
          const waitMs =
            err.retryAfter != null
              ? err.retryAfter * 1000
              : BASE_BACKOFF_MS * Math.pow(2, attempt);

          console.warn(
            `[semanticEvaluator] ⚠️  429 on attempt ${attempt + 1}/${MAX_RETRIES + 1}. ` +
              `Retrying in ${waitMs / 1000}s...`
          );
          await sleep(waitMs);
          continue;
        }

        // All retries exhausted — log clearly and propagate
        console.warn(
          `[semanticEvaluator] ⚠️  HuggingFace rate limit hit — all ${MAX_RETRIES + 1} attempts ` +
            "exhausted. Falling back to keyword-only scoring."
        );
      }

      // Non-429 error — don't retry
      break;
    }
  }

  throw lastError;
};

// ─── Evaluator contract ───────────────────────────────────────────────────────
const KEY = "semanticMatch";
const LABEL = "Semantic Match";

const buildFeedback = (score) => {
  if (score >= 85) return "Strong semantic alignment between the resume and job description.";
  if (score >= 65) return "Moderate semantic alignment with several conceptually related skills and experiences.";
  if (score >= 40) return "Some semantic overlap is present, but the match is limited.";
  return "Low semantic alignment between the resume and job description.";
};

export const semanticEvaluator = async ({ resumeText = "", jobDescription = "" }) => {
  if (!resumeText || typeof resumeText !== "string" || resumeText.trim().length === 0) {
    return {
      key: KEY, label: LABEL, score: 0,
      summary: "Semantic evaluation could not run because resume text was missing.",
      details: {}, meta: {},
    };
  }

  if (!jobDescription || typeof jobDescription !== "string" || jobDescription.trim().length === 0) {
    return {
      key: KEY, label: LABEL, score: 0,
      summary: "Semantic evaluation could not run because job description was missing.",
      details: {}, meta: {},
    };
  }

  const hfToken = process.env.HF_API_TOKEN;
  if (!hfToken) {
    // If no HF token is configured, do not throw — return an 'unavailable' result
    // so pipelines and CI do not fail. This also makes the evaluator opt-in.
    return {
      key: KEY,
      label: LABEL,
      score: null,
      summary: "Semantic matching is unconfigured: HF_API_TOKEN not set.",
      details: {},
      meta: { unavailable: true, reason: "no_token" },
    };
  }

  try {
    const resumeHash = getHash(resumeText);
    const jdHash = getHash(jobDescription);

    // 🔍 Cache check — skip API entirely if we've seen this pair before
    try {
      if (!mongoose) mongoose = await import('mongoose');
      if (!SemanticCache) SemanticCache = (await import('../../server/src/database/models/SemanticCache.js')).default;

      if (mongoose.connection && mongoose.connection.readyState === 1) {
        const cachedResult = await SemanticCache.findOne({ resumeHash, jdHash });
        if (cachedResult) {
          console.log("[semanticEvaluator] ⚡ Cache hit — skipping API call.");
          return {
            key: KEY, label: LABEL,
            score: cachedResult.score,
            summary: cachedResult.summary,
            details: cachedResult.details,
            meta: { ...cachedResult.meta, cached: true },
          };
        }
      }
    } catch (e) {
      // If DB or model isn't available (e.g., running unit tests), skip caching.
    }

    const similarity = await computeSimilarity(resumeText, jobDescription, hfToken);
    const normalized = Math.max(0, Math.min(1, similarity));
    const score = roundToTwo(normalized * 100);
    const feedback = buildFeedback(score);

    const result = {
      key: KEY, label: LABEL, score, summary: feedback,
      details: { similarityRaw: similarity },
      meta: { model: "sentence-transformers/all-MiniLM-L6-v2", provider: "huggingface" },
    };

    // 💾 Cache the result
    if (mongoose.connection.readyState === 1) {
      await SemanticCache.create({
        resumeHash, jdHash,
        similarity: normalized, score,
        summary: feedback,
        details: result.details,
        meta: result.meta,
      });
    }

    return result;

  } catch (error) {
    if (error instanceof HFRateLimitError) {
      const retryMsg = error.retryAfter != null
        ? `Please try again in ${error.retryAfter} seconds.`
        : "Please try again in a moment.";

      return {
        key: KEY,
        label: LABEL,
        score: null,        // null = excluded from weighted average in aggregator
        summary: `Semantic matching temporarily unavailable — rate limit reached. ${retryMsg}`,
        details: {},
        meta: {
          rateLimited: true,
          retryAfter: error.retryAfter ?? null,
          unavailable: true,
        },
      };
    }

    throw new Error(`Semantic evaluation failed: ${error.message}`);
  }
};