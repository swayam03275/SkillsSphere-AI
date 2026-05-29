import { apiRequest } from "./apiClient";

const TOKEN_KEY = "skillssphere.auth.token";
const getToken = () =>
  localStorage.getItem(TOKEN_KEY) || sessionStorage.getItem(TOKEN_KEY);

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Poll GET /api/ai-jobs/:jobId until completed or failed.
 */
export const pollAiJobUntilDone = async (
  jobId,
  { intervalMs = 1500, maxAttempts = 120, onProgress } = {}
) => {
  const token = getToken();

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const response = await apiRequest(`/api/ai-jobs/${jobId}`, {
      method: "GET",
      token,
    });

    if (onProgress && response?.progress) {
      onProgress(response.progress);
    }

    if (response?.status === "completed") {
      return response;
    }

    if (response?.status === "failed") {
      const message =
        response?.error?.message || "AI job failed. Please try again.";
      throw new Error(message);
    }

    await sleep(intervalMs);
  }

  throw new Error("Analysis timed out. Please try again.");
};

export const enqueueResumeAnalyze = async (file, jobDescription = "", options = {}) => {
  const formData = new FormData();
  formData.append("resume", file);
  if (jobDescription?.trim()) {
    formData.append("jobDescription", jobDescription.trim());
  }

  const headers = {};
  if (options.idempotencyKey) {
    headers["Idempotency-Key"] = options.idempotencyKey;
  }

  return apiRequest("/api/ai-jobs/resume-analyze", {
    method: "POST",
    body: formData,
    token: getToken(),
    headers,
  });
};

export const enqueueMatchingEvaluate = async (file = null, options = {}) => {
  const init = {
    method: "POST",
    token: getToken(),
    headers: {},
  };

  if (options.idempotencyKey) {
    init.headers["Idempotency-Key"] = options.idempotencyKey;
  }

  if (file) {
    const formData = new FormData();
    formData.append("resume", file);
    init.body = formData;
  }

  return apiRequest("/api/ai-jobs/matching-evaluate", init);
};
