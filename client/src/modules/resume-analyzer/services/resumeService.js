import { apiRequest } from "../../../services/apiClient";
import {
  enqueueResumeAnalyze,
  pollAiJobUntilDone,
} from "../../../services/aiJobService";

const TOKEN_KEY = "skillssphere.auth.token";
const getToken = () =>
  localStorage.getItem(TOKEN_KEY) || sessionStorage.getItem(TOKEN_KEY);

/**
 * Fetch the student's latest stored resume analysis from the database.
 * Returns null when no prior analysis exists (first-time user).
 */
export const getLatestResumeAnalysis = async () => {
  try {
    const response = await apiRequest("/api/resume/me/latest", {
      method: "GET",
      token: getToken(),
    });

    if (!response || response.success === false || !response.data) return null;

    const doc = response.data;

    // Normalize DB field names → shape expected by AnalysisResult
    return {
      ...doc,
      resumeId: doc._id,
      // DB stores aggregatedScore; AnalysisResult reads result.score
      score: doc.aggregatedScore ?? doc.score ?? 0,
      // Derive isJDProvided from whether a jobDescription was saved
      isJDProvided: !!doc.jobDescription,
    };
  } catch (err) {
    // 404 means no prior scan — treat as "no data", not an error
    if (err?.status === 404 || err?.message?.includes("404")) return null;
    console.error("[resumeService] getLatestResumeAnalysis:", err);
    return null;
  }
};

export const analyzeResume = async (file, jobDescription = "", options = {}) => {
  try {
    if (!file) throw new Error("Please select a resume file first.");

    const useAsync = options.useAsync !== false;

    if (useAsync) {
      const idempotencyKey =
        options.idempotencyKey ||
        (typeof crypto !== "undefined" && crypto.randomUUID
          ? crypto.randomUUID()
          : `analyze-${Date.now()}`);

      const enqueued = await enqueueResumeAnalyze(file, jobDescription, {
        idempotencyKey,
      });

      if (!enqueued?.jobId) {
        throw new Error(enqueued?.message || "Failed to queue resume analysis.");
      }

      if (enqueued.status === "completed" && enqueued.result) {
        return enqueued.result;
      }

      const completed = await pollAiJobUntilDone(enqueued.jobId, {
        onProgress: options.onProgress,
      });

      if (!completed?.result) {
        throw new Error("Analysis completed but no result was returned.");
      }

      return completed.result;
    }

    const formData = new FormData();
    formData.append("resume", file);

    if (jobDescription && jobDescription.trim()) {
      formData.append("jobDescription", jobDescription.trim());
    }

    const response = await apiRequest("/api/resume/analyze", {
      method: "POST",
      body: formData,
      token: getToken(),
    });

    if (!response || response.success === false) {
      throw new Error(
        response?.message || "Failed to analyze resume. Please check the file format."
      );
    }

    return response;
  } catch (error) {
    console.error("[resumeService] Analysis Error:", error);
    throw error;
  }
};

export const generateCoverLetter = async (resumeId, jobDescription, tone = "Professional", language = "English") => {
  try {
    if (!resumeId) throw new Error("Resume ID is missing.");
    if (!jobDescription || !jobDescription.trim()) throw new Error("Job description is required.");

    const response = await apiRequest(`/api/resume/${resumeId}/cover-letter`, {
      method: "POST",
      body: { 
        jobDescription: jobDescription.trim(),
        tone,
        language
      },
      token: getToken(),
    });

    if (!response || response.success === false) {
      throw new Error(response?.message || response?.error || "Failed to generate cover letter.");
    }

    return response;
  } catch (error) {
    console.error("[resumeService] Cover Letter Generation Error:", error);
    throw error;
  }
};
