import { apiRequest } from "../../../services/apiClient";

/**
 * Get AI-powered job recommendations based on the student's latest resume
 * @param {string} token - Auth token
 * @param {Object} options - Query options (sortBy, limit)
 * @returns {Promise<Object>} - { success, message, jobs, hasResume }
 */
export const getRecommendations = async (token, options = {}) => {
  const { sortBy = "score", limit = 20 } = options;
  return apiRequest(`/api/jobs/recommendations?sortBy=${sortBy}&limit=${limit}`, { token });
};