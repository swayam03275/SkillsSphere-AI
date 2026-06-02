import { apiRequest } from "../../../services/apiClient";

const TOKEN_KEY = "skillssphere.auth.token";

const getToken = () =>
  localStorage.getItem(TOKEN_KEY) || sessionStorage.getItem(TOKEN_KEY);

/**
 * Fetch available interview topics with question counts and difficulty levels.
 */
export const getTopics = async () => {
  return apiRequest("/api/interviews/topics", {
    method: "GET",
    token: getToken(),
  });
};

/**
 * Start a new interview session.
 * @param {string} topic - The interview topic (e.g. 'react', 'nodejs', 'dsa').
 * @param {string} difficulty - Difficulty level ('easy', 'medium', 'hard').
 * @param {string} persona - Interviewer persona ('friendly', 'faang', 'startup', 'hr').
 */
export const startSession = async (topic, difficulty, persona) => {
  return apiRequest("/api/interviews/start", {
    method: "POST",
    token: getToken(),
    body: { topic, difficulty, persona },
  });
};

/**
 * Submit an answer for the current question.
 * @param {string} sessionId - The interview session ID.
 * @param {string} transcript - The student's answer text.
 */
export const submitAnswer = async (sessionId, transcript) => {
  return apiRequest(`/api/interviews/${sessionId}/answer`, {
    method: "POST",
    token: getToken(),
    body: { transcript },
  });
};

/**
 * Complete the interview and calculate final scores.
 * @param {string} sessionId - The interview session ID.
 */
export const completeInterview = async (sessionId) => {
  return apiRequest(`/api/interviews/${sessionId}/complete`, {
    method: "POST",
    token: getToken(),
  });
};

/**
 * Get detailed results for a completed interview session.
 * @param {string} sessionId - The interview session ID.
 */
export const getResults = async (sessionId) => {
  return apiRequest(`/api/interviews/${sessionId}/results`, {
    method: "GET",
    token: getToken(),
  });
};

/**
 * Get paginated interview history for the current user.
 * @param {number} page - Page number (default: 1).
 * @param {number} limit - Results per page (default: 10).
 */
export const getHistory = async (page = 1, limit = 10) => {
  return apiRequest(`/api/interviews/history?page=${page}&limit=${limit}`, {
    method: "GET",
    token: getToken(),
  });
};
