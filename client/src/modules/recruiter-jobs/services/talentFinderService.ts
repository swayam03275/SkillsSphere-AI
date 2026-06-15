// @ts-nocheck

import { apiRequest, normalizeApiError } from "../../../services/apiClient";

/**
 * Normalize api errors for recruiter operations
 */
const handleServiceError = (error) => {
  let normalized = normalizeApiError(error);

  if (!normalized || typeof normalized !== "object") {
    normalized = {
      message: error?.message || "Something went wrong",
      status: error?.status || 500,
      errors: error?.errors || {},
    };
  }

  if (normalized.status === 401 || normalized.status === 403) {
    return {
      ...normalized,
      message: "You are not authorized to perform this action. Please log in again.",
    };
  }

  return normalized;
};

/**
 * Search the student database
 * @param {Object} filters - Search parameters (q, skills, graduationYear, minAtsScore, page, limit, specialization)
 * @param {string} token - Auth bearer token
 * @returns {Promise<Object>}
 */
export const searchTalent = async (filters = {}, token) => {
  try {
    const params = new URLSearchParams();
    
    Object.entries(filters).forEach(([key, val]) => {
      if (val !== undefined && val !== null && val !== "") {
        params.append(key, val);
      }
    });

    const url = `/api/recruiter/talent-finder?${params.toString()}`;
    const response = await apiRequest(url, { token });

    return {
      success: true,
      candidates: response.data || [],
      pagination: response.pagination || { page: 1, limit: 10, total: 0, pages: 1 }
    };
  } catch (error) {
    throw handleServiceError(error);
  }
};

/**
 * Run Gemini AI Match for a specific candidate against a job description
 * @param {string} candidateId - Candidate user ID
 * @param {string} jobId - Job posting ID
 * @param {string} token - Auth bearer token
 * @returns {Promise<Object>}
 */
export const matchCandidate = async (candidateId, jobId, token) => {
  try {
    const response = await apiRequest("/api/recruiter/match-candidate", {
      method: "POST",
      body: { candidateId, jobId },
      token
    });

    return {
      success: true,
      matchResult: response.data
    };
  } catch (error) {
    throw handleServiceError(error);
  }
};

/**
 * Invite a student candidate to apply for a job posting
 * @param {string} candidateId - Candidate user ID
 * @param {string} jobId - Job posting ID
 * @param {string} token - Auth token
 * @returns {Promise<Object>}
 */
export const inviteCandidate = async (candidateId, jobId, token) => {
  try {
    const response = await apiRequest("/api/recruiter/invite-candidate", {
      method: "POST",
      body: { candidateId, jobId },
      token
    });

    return {
      success: true,
      message: response.message || "Invitation sent successfully."
    };
  } catch (error) {
    throw handleServiceError(error);
  }
};
