import crypto from "crypto";
import mongoose from "mongoose";
import SemanticCache from "../../server/src/database/models/SemanticCache.js";

const HF_MODEL_URL =
  "https://router.huggingface.co/hf-inference/models/sentence-transformers/all-MiniLM-L6-v2/pipeline/sentence-similarity";

const roundToTwo = (value) => Number(value.toFixed(2));

const getHash = (text) => crypto.createHash("md5").update(text.trim()).digest("hex");

/**
 * Calls the HF sentence-similarity pipeline directly.
 * Returns a similarity score between 0 and 1.
 */
const computeSimilarity = async (sourceText, compareText) => {
  const hfToken = process.env.HF_API_TOKEN;
  if (!hfToken) {
    throw new Error("HF_API_TOKEN environment variable is not set");
  }

  const response = await fetch(HF_MODEL_URL, {
    headers: {
      Authorization: `Bearer ${hfToken}`,
      "Content-Type": "application/json",
    },
    method: "POST",
    body: JSON.stringify({
      inputs: {
        source_sentence: sourceText.trim(),
        sentences: [compareText.trim()],
      },
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    console.error(`[semanticEvaluator] HF API error (${response.status}):`, errorBody);
    throw new Error(`Hugging Face API returned ${response.status}: ${response.statusText}`);
  }

  const data = await response.json();

  // HF sentence-similarity returns an array of scores, one per sentence
  if (!Array.isArray(data) || data.length === 0) {
    console.error("[semanticEvaluator] Unexpected response:", JSON.stringify(data).slice(0, 200));
    throw new Error("Invalid response format from Hugging Face API");
  }

  const similarity = data[0];
  console.log(`[semanticEvaluator] ✅ Similarity computed: ${roundToTwo(similarity * 100)}%`);
  return similarity;
};


const KEY = "semanticMatch";
const LABEL = "Semantic Match";

const buildFeedback = (score) => {
  if (score >= 85) {
    return "Strong semantic alignment between the resume and job description.";
  }
  if (score >= 65) {
    return "Moderate semantic alignment with several conceptually related skills and experiences.";
  }
  if (score >= 40) {
    return "Some semantic overlap is present, but the match is limited.";
  }
  return "Low semantic alignment between the resume and job description.";
};

export const semanticEvaluator = async ({ resumeText = "", jobDescription = "" }) => {
  if (!resumeText || typeof resumeText !== "string" || resumeText.trim().length === 0) {
    return {
      key: KEY,
      label: LABEL,
      score: 0,
      summary: "Semantic evaluation could not run because resume text was missing.",
      details: {},
      meta: {}
    };
  }

  if (!jobDescription || typeof jobDescription !== "string" || jobDescription.trim().length === 0) {
    return {
      key: KEY,
      label: LABEL,
      score: 0,
      summary: "Semantic evaluation could not run because job description was missing.",
      details: {},
      meta: {}
    };
  }

  if (!process.env.HF_API_TOKEN) {
    throw new Error("HF_API_TOKEN environment variable is not set");
  }

  try {
    const resumeHash = getHash(resumeText);
    const jdHash = getHash(jobDescription);

    // 🔍 Check cache first - ONLY IF CONNECTED TO DB
    let cachedResult = null;
    if (mongoose && mongoose.connection && mongoose.connection.readyState === 1 && SemanticCache) {
      cachedResult = await SemanticCache.findOne({ resumeHash, jdHash });
    }
    
    if (cachedResult) {
      console.log("[semanticEvaluator] ⚡ Cache hit! Skipping API call.");
      return {
        key: KEY,
        label: LABEL,
        score: cachedResult.score,
        summary: cachedResult.summary,
        details: cachedResult.details,
        meta: {
          ...cachedResult.meta,
          cached: true
        }
      };
    }

    const similarity = await computeSimilarity(resumeText, jobDescription);
    const normalized = Math.max(0, Math.min(1, similarity));
    const score = roundToTwo(normalized * 100);

    const feedback = buildFeedback(score);

    const result = {
      key: KEY,
      label: LABEL,
      score,
      summary: feedback,
      details: {
        similarityRaw: similarity,
      },
      meta: {
        model: "sentence-transformers/all-MiniLM-L6-v2",
        provider: "huggingface"
      }
    };

    // 💾 Save to cache ONLY IF CONNECTED TO DB
    if (mongoose && mongoose.connection && mongoose.connection.readyState === 1 && SemanticCache) {
      await SemanticCache.create({
        resumeHash,
        jdHash,
        similarity: normalized,
        score,
        summary: feedback,
        details: result.details,
        meta: result.meta,
      });
    }

    return result;
  } catch (error) {
    throw new Error(`Semantic evaluation failed: ${error.message}`);
  }
};
