import { apiRequest, normalizeApiError } from "../../../services/apiClient";

/**
 * Service for managing recruiter job postings.
 * All API calls use the shared apiRequest helper for consistent
 * auth, headers, and error handling.
 */

/**
 * Normalize service errors for consistent frontend handling
 */
const handleServiceError = (error) => {
  const normalized = normalizeApiError(error);

  // Map status codes to user-friendly messages
  if (normalized.status === 401 || normalized.status === 403) {
    return {
      ...normalized,
      message: "You are not authorized to perform this action. Please log in again.",
    };
  }

  if (normalized.status === 422 || normalized.status === 400) {
    // Validation errors - preserve field-level errors
    return {
      ...normalized,
      message: normalized.message || "Please check your input and try again.",
    };
  }

  if (normalized.status === 0 || normalized.status >= 500) {
    return {
      ...normalized,
      message: "Unable to connect to the server. Please try again later.",
    };
  }

  return normalized;
};

/**
 * Fetch all job postings for the authenticated recruiter
 * @param {string} token - Auth bearer token
 * @returns {Promise<{success: boolean, jobs: Array}>}
 */
export const getRecruiterJobs = async (token, page = 1, limit = 10) => {
  try {
    const response = await apiRequest(`/api/jobs/recruiter?page=${page}&limit=${limit}`, { token });
    return {
      success: true,
      jobs: response.jobs || response.data || [],
      currentPage: response.currentPage || 1,
      totalPages: response.totalPages || 1,
      totalCount: response.totalCount || 0,
    };
  } catch (error) {
    const normalizedError = handleServiceError(error);
    throw normalizedError;
  }
};

/**
 * Create a new job posting
 * @param {Object} jobData - Job posting payload
 * @param {string} token - Auth bearer token
 * @returns {Promise<{success: boolean, job: Object}>}
 */
export const createJobPosting = async (jobData, token) => {
  try {
    // Transform skills from comma-separated string to array if needed
    const payload = {
      ...jobData,
      skills: Array.isArray(jobData.skills)
        ? jobData.skills
        : jobData.skills.split(",").map((s) => s.trim()).filter(Boolean),
    };

    const response = await apiRequest("/api/jobs", {
      method: "POST",
      body: payload,
      token,
    });

    return {
      success: true,
      job: response.job || response.data,
    };
  } catch (error) {
    const normalizedError = handleServiceError(error);
    throw normalizedError;
  }
};

/**
 * Get a single job posting by ID
 * @param {string} id - Job posting ID
 * @param {string} token - Auth bearer token
 * @returns {Promise<{success: boolean, job: Object}>}
 */
export const getJobPostingById = async (id, token) => {
  try {
    const response = await apiRequest(`/api/jobs/${id}`, { token });
    return {
      success: true,
      job: response.job || response.data,
    };
  } catch (error) {
    const normalizedError = handleServiceError(error);
    throw normalizedError;
  }
};

/**
 * Fetch aggregated analytics for the authenticated recruiter
 * @param {string} token - Auth bearer token
 * @returns {Promise<{success: boolean, analytics: Object}>}
 */
export const getRecruiterAnalytics = async (token) => {
  try {
    const response = await apiRequest("/api/jobs/recruiter/analytics", { token });
    return {
      success: true,
      analytics: response.analytics || {},
    };
  } catch (error) {
    const normalizedError = handleServiceError(error);
    throw normalizedError;
  }
};

/**
 * Update an existing job posting
 * @param {string} id - Job posting ID
 * @param {Object} jobData - Job posting payload
 * @param {string} token - Auth bearer token
 * @returns {Promise<{success: boolean, job: Object}>}
 */
export const updateJobPosting = async (id, jobData, token) => {
  try {
    const payload = {
      ...jobData,
      skills: Array.isArray(jobData.skills)
        ? jobData.skills
        : jobData.skills.split(",").map((s) => s.trim()).filter(Boolean),
    };

    const response = await apiRequest(`/api/jobs/${id}`, {
      method: "PUT",
      body: payload,
      token,
    });

    return {
      success: true,
      job: response.job || response.data,
    };
  } catch (error) {
    const normalizedError = handleServiceError(error);
    throw normalizedError;
  }
};

/**
 * Delete a job posting
 * @param {string} id - Job posting ID
 * @param {string} token - Auth bearer token
 * @returns {Promise<{success: boolean}>}
 */
export const deleteJobPosting = async (id, token) => {
  try {
    await apiRequest(`/api/jobs/${id}`, {
      method: "DELETE",
      token,
    });

    return {
      success: true,
    };
  } catch (error) {
    const normalizedError = handleServiceError(error);
    throw normalizedError;
  }
};

/**
 * Fetch all applications for a specific job posting
 * @param {string} jobId - Job posting ID
 * @param {string} token - Auth bearer token
 * @returns {Promise<{success: boolean, applications: Array}>}
 */
export const getJobApplications = async (jobId, token) => {
  try {
    const response = await apiRequest(`/api/jobs/${jobId}/applications`, { token });
    return {
      success: true,
      applications: response.applications || [],
    };
  } catch (error) {
    const normalizedError = handleServiceError(error);
    throw normalizedError;
  }
};

/**
 * Update the status of a job application
 * @param {string} applicationId - Application ID
 * @param {string} status - New status (reviewed, shortlisted, rejected)
 * @param {string} comment - Feedback comment
 * @param {string} token - Auth bearer token
 * @returns {Promise<{success: boolean, application: Object}>}
 */
export const updateApplicationStatus = async (applicationId, status, comment, token) => {
  try {
    const response = await apiRequest(`/api/jobs/applications/${applicationId}/status`, {
      method: "PATCH",
      body: { status, comment },
      token,
    });

    return {
      success: true,
      application: response.application,
    };
  } catch (error) {
    const normalizedError = handleServiceError(error);
    throw normalizedError;
  }
};
