/**
 * AI Interview Service Integration
 *
 * Handles communication with the Python AI microservice for:
 * - Speech-to-text (audio transcription via faster-whisper)
 * - Answer evaluation (semantic similarity + concept detection)
 *
 * Features:
 * - Retry logic with exponential backoff (3 attempts)
 * - Configurable timeouts for transcription and evaluation
 * - Graceful fallback to mock scores when Python service is unavailable
 * - Request timing logs for performance monitoring
 * - WebSocket streaming support for real-time transcription
 */

import WebSocket from "ws";

import logger from "../utils/logger.js";

const AI_SERVICE_URL =
  process.env.INTERVIEW_AI_URL || "http://localhost:8000";
const EVAL_TIMEOUT = parseInt(process.env.INTERVIEW_AI_TIMEOUT || "5000", 10);
const TRANSCRIBE_TIMEOUT = parseInt(
  process.env.INTERVIEW_AI_TRANSCRIBE_TIMEOUT || "30000",
  10
);
const MAX_RETRIES = 3;

/**
 * Sleep for a given number of milliseconds.
 * Used for exponential backoff between retries.
 */
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Check if the Python AI service is available.
 * Uses a 2-second timeout to avoid blocking the request pipeline.
 *
 * @returns {Promise<boolean>} True if the service is reachable and healthy.
 */
const isServiceAvailable = async () => {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2000);

    const res = await fetch(`${AI_SERVICE_URL}/health`, {
      signal: controller.signal,
    });
    clearTimeout(timeout);
    return res.ok;
  } catch {
    return false;
  }
};

/**
 * Make an HTTP request to the Python service with retry logic.
 * Retries up to MAX_RETRIES times with exponential backoff on failure.
 *
 * @param {string} endpoint - The API endpoint path (e.g. '/api/evaluate').
 * @param {object} options - Fetch options (method, headers, body).
 * @param {number} timeoutMs - Request timeout in milliseconds.
 * @returns {Promise<Response>} The fetch response.
 * @throws {Error} If all retry attempts fail.
 */
const fetchWithRetry = async (endpoint, options, timeoutMs) => {
  let lastError;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), timeoutMs);

      const startTime = Date.now();
      const res = await fetch(`${AI_SERVICE_URL}${endpoint}`, {
        ...options,
        signal: controller.signal,
      });
      clearTimeout(timeout);

      const duration = Date.now() - startTime;
      logger.log(
        `[aiInterviewService] ${endpoint} responded in ${duration}ms (attempt ${attempt})`
      );

      if (res.ok) return res;

      // Non-retryable status codes
      if (res.status === 400 || res.status === 422) {
        const error = await res.json().catch(() => ({}));
        throw new Error(
          error.detail || `Request failed with status ${res.status}`
        );
      }

      lastError = new Error(`Request failed with status ${res.status}`);
    } catch (err) {
      lastError = err;

      if (err.name === "AbortError") {
        lastError = new Error(
          `Request to ${endpoint} timed out after ${timeoutMs}ms`
        );
      }

      if (attempt < MAX_RETRIES) {
        const backoff = Math.pow(2, attempt - 1) * 500; // 500ms, 1s, 2s
        logger.log(
          `[aiInterviewService] Attempt ${attempt} failed for ${endpoint}, retrying in ${backoff}ms...`
        );
        await sleep(backoff);
      }
    }
  }

  throw lastError;
};

/**
 * Generate mock evaluation scores when the Python service is unavailable.
 * Uses basic keyword matching as a simple fallback.
 *
 * @param {string} transcript - The student's answer text.
 * @param {string} expectedAnswer - The expected/ideal answer.
 * @param {string[]} expectedConcepts - Concept IDs to check for.
 * @returns {object} Mock evaluation result matching the Python API contract.
 */
const mockEvaluate = (transcript, expectedAnswer, expectedConcepts) => {
  const transcriptLower = transcript.toLowerCase();
  const expectedLower = expectedAnswer.toLowerCase();

  // Simple keyword overlap for technical score
  const expectedWords = expectedLower.split(/\s+/).filter((w) => w.length > 3);
  const matchedWords = expectedWords.filter((w) => transcriptLower.includes(w));
  const technical = Math.min(
    100,
    Math.round((matchedWords.length / Math.max(expectedWords.length, 1)) * 100)
  );

  // Concept detection via keyword matching
  const detected = expectedConcepts.filter((c) =>
    transcriptLower.includes(c.replace(/-/g, " ").toLowerCase())
  );
  const missed = expectedConcepts.filter((c) => !detected.includes(c));
  const relevance = Math.round(
    (detected.length / Math.max(expectedConcepts.length, 1)) * 100
  );

  // Basic communication score based on answer length
  const wordCount = transcript.split(/\s+/).length;
  let communication = 50;
  if (wordCount > 20 && wordCount < 300) communication = 70;
  if (wordCount > 50 && wordCount < 200) communication = 85;

  // Count filler words
  const fillers = [
    "um", "uh", "like", "you know", "basically", "actually", "so yeah",
  ];
  const fillerCount = fillers.reduce((count, filler) => {
    const regex = new RegExp(`\\b${filler}\\b`, "gi");
    return count + (transcriptLower.match(regex) || []).length;
  }, 0);

  return {
    technical,
    communication: Math.max(0, communication - fillerCount * 5),
    relevance,
    concepts: { detected, missed },
    fillerWords: fillerCount,
    speakingSpeed: wordCount < 30 ? "slow" : wordCount > 150 ? "fast" : "normal",
    _mock: true,
  };
};

/**
 * Send audio to the Python service for transcription.
 * Uses a longer timeout (30s default) since audio processing is slower.
 *
 * @param {Buffer} audioBuffer - Raw audio file buffer.
 * @param {string} [filename='audio.webm'] - Original filename for format detection.
 * @returns {Promise<object>} Object with 'transcript' field.
 * @throws {Error} If the service is unavailable or transcription fails.
 */
export const transcribeAudio = async (audioBuffer, filename = "audio.webm") => {
  const available = await isServiceAvailable();

  if (!available) {
    logger.warn(
      "[aiInterviewService] ⚠️ Python AI service is not reachable at",
      AI_SERVICE_URL
    );
    throw new Error(
      "AI transcription service is not available. Please submit text instead."
    );
  }

  const formData = new FormData();
  formData.append("audio", new Blob([audioBuffer]), filename);

  const res = await fetchWithRetry(
    "/api/transcribe",
    { method: "POST", body: formData },
    TRANSCRIBE_TIMEOUT
  );

  return res.json();
};

/**
 * Open a WebSocket connection to the Python AI service for real-time streaming transcription.
 * @returns {WebSocket} The connected WebSocket instance.
 */
export const transcribeAudioStream = () => {
  const wsUrl = AI_SERVICE_URL.replace(/^http/, "ws") + "/api/ws/transcribe";
  const ws = new WebSocket(wsUrl);
  return ws;
};

/**
 * Send transcript to the Python service for evaluation.
 * Falls back to mock evaluation if the service is unavailable or errors out.
 *
 * @param {string} transcript - The student's answer text.
 * @param {string} expectedAnswer - The expected/ideal answer.
 * @param {string[]} expectedConcepts - Concept IDs to check for.
 * @returns {Promise<object>} Evaluation result with technical, communication, relevance scores.
 */
export const evaluateAnswer = async (
  transcript,
  expectedAnswer,
  expectedConcepts
) => {
  const available = await isServiceAvailable();

  if (!available) {
    logger.warn(
      "[aiInterviewService] ⚠️ Python service unavailable, falling back to mock evaluation"
    );
    return mockEvaluate(transcript, expectedAnswer, expectedConcepts);
  }

  try {
    const res = await fetchWithRetry(
      "/api/evaluate",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcript, expectedAnswer, expectedConcepts }),
      },
      EVAL_TIMEOUT
    );

    return res.json();
  } catch (err) {
    if (
      err.message.includes("ECONNREFUSED") || 
      err.message.includes("ECONNABORTED") || 
      err.name === "AbortError" ||
      err.message.includes("timed out")
    ) {
      logger.warn(`[aiInterviewService] ⚠️ AI Service unreachable or timed out: ${err.message}`);
      return mockEvaluate(transcript, expectedAnswer, expectedConcepts);
    }

    logger.warn(
      `[aiInterviewService] ⚠️ Evaluation failed: ${err.message}`
    );
    logger.warn("[aiInterviewService] Falling back to mock evaluation");
    return mockEvaluate(transcript, expectedAnswer, expectedConcepts);
  }
};

/**
 * Get the current connection status of the Python AI service.
 * Useful for health check endpoints and debugging.
 *
 * @returns {Promise<object>} Status info including url, available, and mock mode.
 */
export const getServiceStatus = async () => {
  const available = await isServiceAvailable();
  return {
    url: AI_SERVICE_URL,
    available,
    mode: available ? "ai" : "mock",
    timeouts: {
      evaluation: EVAL_TIMEOUT,
      transcription: TRANSCRIBE_TIMEOUT,
    },
  };
};
