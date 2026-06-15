// @ts-nocheck

import { apiRequest } from "../../../services/apiClient";

/**
 * Fetch jobs with optional filters
 * @param {Object} filters - Filter parameters
 * @param {string} token - Auth token
 * @returns {Promise<Object>} - API response
 */
export const getJobs = async (filters = {}, token, page = 1, limit = 10) => {
  const queryParams = new URLSearchParams();
  
  if (filters.designation) queryParams.append("designation", filters.designation);
  if (filters.minSalary) queryParams.append("minSalary", filters.minSalary);
  if (filters.maxSalary) queryParams.append("maxSalary", filters.maxSalary);
  if (filters.postedWithin) queryParams.append("postedWithin", filters.postedWithin);
  queryParams.append("page", page);
  queryParams.append("limit", limit);

  const queryString = queryParams.toString();
  const path = `/api/jobs${queryString ? `?${queryString}` : ""}`;

  return apiRequest(path, { token });
};

/**
 * Apply to a job posting
 * @param {string} jobId - Job ID
 * @param {string} token - Auth token
 * @param {Object} options - Application fields (resumeLink, coverNote)
 * @returns {Promise<Object>} - API response
 */
export const applyToJob = async (jobId, token, options = {}) => {
  return apiRequest(`/api/jobs/${jobId}/apply`, {
    method: "POST",
    body: options,
    token,
  });
};

/**
 * Get current student's applied job IDs
 * @param {string} token - Auth token
 * @returns {Promise<Object>} - API response with appliedJobIds array
 */
export const getMyAppliedJobIds = async (token) => {
  return apiRequest("/api/jobs/my-applications", { token });
};

/**
 * Get current student's applied jobs with full details (paginated)
 * @param {string} token - Auth token
 * @param {number} page - Page number
 * @param {number} limit - Items per page
 * @returns {Promise<Object>} - API response with applications, pagination info
 */
export const getMyApplicationsDetailed = async (token, page = 1, limit = 10) => {
  return apiRequest(`/api/jobs/my-applications/details?page=${page}&limit=${limit}`, { token });
};

/**
 * Withdraw a job application
 * @param {string} jobId - Job ID
 * @param {string} token - Auth token
 * @returns {Promise<Object>} - API response
 */
export const withdrawApplication = async (jobId, token) => {
  return apiRequest(`/api/jobs/${jobId}/withdraw`, {
    method: "PATCH",
    token,
  });
};

/**
 * Update the student's personal CRM status for an application
 * @param {string} applicationId - Application ID
 * @param {string} studentStatus - New CRM status
 * @param {string} token - Auth token
 * @returns {Promise<Object>} - API response
 */
export const updateStudentApplicationStatus = async (applicationId, studentStatus, token) => {
  return apiRequest(`/api/jobs/applications/${applicationId}/student-status`, {
    method: "PATCH",
    body: { studentStatus },
    token,
  });
};
