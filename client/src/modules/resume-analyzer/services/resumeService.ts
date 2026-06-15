// @ts-nocheck

import { apiRequest } from "../../../services/apiClient";
import { getToken } from "../../../utils/authToken";
import logger from "../../../utils/logger";

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
    logger.error("[resumeService] getLatestResumeAnalysis:", err);
    return null;
  }
};

export const analyzeResume = async (file, jobDescription = "") => {
  try {
    if (!file) throw new Error("Please select a resume file first.");

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
      throw new Error(response?.message || "Failed to analyze resume. Please check the file format.");
    }

    return response;
  } catch (error) {
    logger.error("[resumeService] Analysis Error:", error);
    throw error; // Let the caller (component) handle the UI toast/state
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
    logger.error("[resumeService] Cover Letter Generation Error:", error);
    throw error;
  }
};

/**
 * Fetch all resume versions for the student.
 */
export const getResumeList = async () => {
  try {
    const response = await apiRequest("/api/resume/list", {
      method: "GET",
      token: getToken(),
    });

    if (!response || response.success === false) {
      throw new Error(response?.message || "Failed to fetch resume list.");
    }

    return response.data || [];
  } catch (error) {
    logger.error("[resumeService] getResumeList Error:", error);
    throw error;
  }
};

/**
 * Set a specific resume version as active.
 */
export const setActiveResume = async (id) => {
  try {
    const response = await apiRequest(`/api/resume/${id}/active`, {
      method: "PATCH",
      token: getToken(),
    });

    if (!response || response.success === false) {
      throw new Error(response?.message || "Failed to update active resume.");
    }

    return response;
  } catch (error) {
    logger.error("[resumeService] setActiveResume Error:", error);
    throw error;
  }
};

/**
 * Rename a specific resume version.
 */
export const renameResume = async (id, title) => {
  try {
    const response = await apiRequest(`/api/resume/${id}/rename`, {
      method: "PATCH",
      body: { title },
      token: getToken(),
    });

    if (!response || response.success === false) {
      throw new Error(response?.message || "Failed to rename resume.");
    }

    return response;
  } catch (error) {
    logger.error("[resumeService] renameResume Error:", error);
    throw error;
  }
};

/**
 * Delete a specific resume version.
 */
export const deleteResume = async (id) => {
  try {
    const response = await apiRequest(`/api/resume/${id}`, {
      method: "DELETE",
      token: getToken(),
    });

    if (!response || response.success === false) {
      throw new Error(response?.message || "Failed to delete resume.");
    }

    return response;
  } catch (error) {
    logger.error("[resumeService] deleteResume Error:", error);
    throw error;
  }
};
