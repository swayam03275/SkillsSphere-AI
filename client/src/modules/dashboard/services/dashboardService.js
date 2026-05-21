import { apiRequest } from "../../../services/apiClient";

export const getAnalysisHistory = async () => {
  const TOKEN_KEY = "skillssphere.auth.token";
  const token = localStorage.getItem(TOKEN_KEY) || sessionStorage.getItem(TOKEN_KEY);

  return apiRequest("/api/dashboard/history", {
    method: "GET",
    token,
  });
};

export const getSkillTrends = async () => {
  const TOKEN_KEY = "skillssphere.auth.token";
  const token = localStorage.getItem(TOKEN_KEY) || sessionStorage.getItem(TOKEN_KEY);

  return apiRequest("/api/jobs/trends/skills", {
    method: "GET",
    token,
  });
};

export const getCoverLetterHistory = async () => {
  const TOKEN_KEY = "skillssphere.auth.token";
  const token = localStorage.getItem(TOKEN_KEY) || sessionStorage.getItem(TOKEN_KEY);

  return apiRequest("/api/cover-letters", {
    method: "GET",
    token,
  });
};

