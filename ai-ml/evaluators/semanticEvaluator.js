import crypto from "crypto";
import mongoose from "mongoose";
import SemanticCache from "../../server/src/database/models/SemanticCache.js";

const HF_MODEL_URL =
  "https://router.huggingface.co/hf-inference/models/sentence-transformers/all-MiniLM-L6-v2/pipeline/sentence-similarity";

const roundToTwo = (value) => Number(value.toFixed(2));
const getHash = (text) => crypto.createHash("md5").update(text.trim()).digest("hex");

const MAX_RETRIES = 2;
const BASE_BACKOFF_MS = 1000;

// --- Text preprocessing ---
const MAX_TOKENS = 512;

function truncateToTokenLimit(text, limit = MAX_TOKENS) {
  const words = text.trim().split(/\s+/);
  return words.length > limit ? words.slice(0, limit).join(" ") : text.trim();
}

function preprocessText(text) {
  return text
    .replace(/[^\w\s.,!?@#$%&*()\-+]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// --- Score normalization curve ---
// Raw cosine similarity from MiniLM tends to cluster 0.4–0.9
// Stretch to 0–100 with a floor/ceiling remap
function normalizeScore(rawSimilarity) {
  const FLOOR = 0.2;
  const CEILING = 0.95;
  const clamped = Math.max(FLOOR, Math.min(CEILING, rawSimilarity));
  const normalized = (clamped - FLOOR) / (CEILING - FLOOR);
  return roundToTwo(normalized * 100);
}

// --- Circuit breaker ---
const CIRCUIT = {
  failures: 0,
  FAILURE_THRESHOLD: 3,
  RESET_AFTER_MS: 60_000,
  trippedAt: null,
  isOpen() {
    if (this.trippedAt === null) return false;
    if (Date.now() - this.trippedAt > this.RESET_AFTER_MS) {
      this.failures = 0;
      this.trippedAt = null;
      return false;
    }
    return true;
  },
  recordFailure() {
    this.failures += 1;
    if (this.failures >= this.FAILURE_THRESHOLD) this.trippedAt = Date.now();
  },
  recordSuccess() {
    this.failures = 0;
    this.trippedAt = null;
  },
};

class HFRateLimitError extends Error {
  constructor(retryAfter) {
    super("HuggingFace API rate limit (429)");
    this.name = "HFRateLimitError";
    this.retryAfter = retryAfter;
  }
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

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
    throw new Error(
      `Hugging Face API returned ${response.status}: ${response.statusText}`
    );
  }

  const data = await response.json();
  if (!Array.isArray(data) || data.length === 0)
    throw new Error("Invalid response format from Hugging Face API");
  return data[0];
}

const computeSimilarity = async (sourceText, compareText) => {
  const hfToken = process.env.HF_API_TOKEN;
  if (!hfToken) throw new Error("HF_API_TOKEN environment variable is not set");
  if (CIRCUIT.isOpen()) throw new HFRateLimitError(null);

  // Preprocess and truncate before sending
  const processedSource = truncateToTokenLimit(preprocessText(sourceText));
  const processedCompare = truncateToTokenLimit(preprocessText(compareText));

  let lastError;
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const similarity = await callHFOnce(processedSource, processedCompare, hfToken);
      CIRCUIT.recordSuccess();
      console.log(
        `[semanticEvaluator] Similarity computed: ${roundToTwo(similarity * 100)}%` +
          (attempt > 0 ? ` (after ${attempt} retry)` : "")
      );
      return similarity;
    } catch (err) {
      lastError = err;
      if (err instanceof HFRateLimitError) {
        CIRCUIT.recordFailure();
        if (attempt < MAX_RETRIES) {
          const waitMs =
            err.retryAfter != null
              ? err.retryAfter * 1000
              : BASE_BACKOFF_MS * Math.pow(2, attempt);
          console.warn(
            `[semanticEvaluator] 429 on attempt ${attempt + 1}/${MAX_RETRIES + 1}. Retrying in ${waitMs / 1000}s...`
          );
          await sleep(waitMs);
          continue;
        }
      }
      break;
    }
  }
  throw lastError;
};

const KEY = "semanticMatch";
const LABEL = "Semantic Match";

const buildFeedback = (score) => {
  if (score >= 85) return "Strong semantic alignment between the resume and job description.";
  if (score >= 65) return "Moderate semantic alignment with several conceptually related skills and experiences.";
  if (score >= 40) return "Some semantic overlap is present, but the match is limited.";
  return "Low semantic alignment between the resume and job description.";
};

// --- Confidence tier based on normalized score ---
function getConfidenceTier(score) {
  if (score >= 85) return "high";
  if (score >= 65) return "moderate";
  if (score >= 40) return "low";
  return "very_low";
}

export const semanticEvaluator = async ({
  resumeText = "",
  jobDescription = "",
} = {}) => {
  if (
    !resumeText ||
    typeof resumeText !== "string" ||
    resumeText.trim().length === 0
  ) {
    return {
      key: KEY,
      label: LABEL,
      score: 0,
      summary: "Semantic evaluation could not run because resume text was missing.",
      details: {},
      meta: {},
    };
  }

  if (
    !jobDescription ||
    typeof jobDescription !== "string" ||
    jobDescription.trim().length === 0
  ) {
    return {
      key: KEY,
      label: LABEL,
      score: 0,
      summary:
        "Semantic evaluation could not run because job description was missing.",
      details: {},
      meta: {},
    };
  }

  if (!process.env.HF_API_TOKEN) {
    throw new Error("HF_API_TOKEN environment variable is not set");
  }

  try {
    const resumeHash = getHash(resumeText);
    const jdHash = getHash(jobDescription);

    if (mongoose.connection.readyState === 1) {
      const cachedResult = await SemanticCache.findOne({ resumeHash, jdHash });
      if (cachedResult) {
        console.log("[semanticEvaluator] Cache hit — skipping API call.");
        return {
          key: KEY,
          label: LABEL,
          score: cachedResult.score,
          summary: cachedResult.summary,
          details: cachedResult.details,
          meta: { ...cachedResult.meta, cached: true },
        };
      }
    }

    const similarity = await computeSimilarity(resumeText, jobDescription);
    const score = normalizeScore(similarity);
    const feedback = buildFeedback(score);
    const confidenceTier = getConfidenceTier(score);

    const result = {
      key: KEY,
      label: LABEL,
      score,
      summary: feedback,
      details: {
        similarityRaw: roundToTwo(similarity),
        similarityNormalized: score,
        confidenceTier,
        resumeTruncated: resumeText.trim().split(/\s+/).length > MAX_TOKENS,
        jdTruncated: jobDescription.trim().split(/\s+/).length > MAX_TOKENS,
      },
      meta: {
        model: "sentence-transformers/all-MiniLM-L6-v2",
        provider: "huggingface",
        normalization: { floor: 0.2, ceiling: 0.95 },
      },
    };

    if (mongoose.connection.readyState === 1) {
      await SemanticCache.create({
        resumeHash,
        jdHash,
        similarity: roundToTwo(similarity),
        score,
        summary: feedback,
        details: result.details,
        meta: result.meta,
      });
    }

    return result;
  } catch (error) {
    if (error instanceof HFRateLimitError) {
      const retryMsg =
        error.retryAfter != null
          ? `Please try again in ${error.retryAfter} seconds.`
          : "Please try again in a moment.";

      return {
        key: KEY,
        label: LABEL,
        score: null,
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