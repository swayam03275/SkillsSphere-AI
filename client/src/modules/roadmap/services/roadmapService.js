import { apiRequest } from "../../../services/apiClient";

const TOKEN_KEY = "skillssphere.auth.token";
const getToken = () => localStorage.getItem(TOKEN_KEY) || sessionStorage.getItem(TOKEN_KEY);

export const getMyRoadmap = async () => {
  return await apiRequest("/api/roadmap/me", {
    method: "GET",
    token: getToken(),
  });
};

export const syncRoadmap = async (targetRole, topics) => {
  return await apiRequest("/api/roadmap/sync", {
    method: "POST",
    body: { targetRole, topics },
    token: getToken(),
  });
};

export const updateTopicStatus = async (topicId, status) => {
  return await apiRequest("/api/roadmap/update-topic", {
    method: "PATCH",
    body: { topicId, status },
    token: getToken(),
  });
};

export const getStudentsRoadmaps = async () => {
  return await apiRequest("/api/roadmap/tutor/students", {
    method: "GET",
    token: getToken(),
  });
};

export const getStudentRoadmap = async (studentId) => {
  return await apiRequest(`/api/roadmap/tutor/students/${studentId}`, {
    method: "GET",
    token: getToken(),
  });
};

export const assignTutorResource = async (studentId, topicId, title, url, type) => {
  return await apiRequest("/api/roadmap/tutor/assign-resource", {
    method: "POST",
    body: { studentId, topicId, title, url, type },
    token: getToken(),
  });
};

export const verifyTopic = async (studentId, topicId, isVerified) => {
  return await apiRequest("/api/roadmap/tutor/verify-topic", {
    method: "POST",
    body: { studentId, topicId, isVerified },
    token: getToken(),
  });
};

export const addTutorMilestone = async (studentId, topicName) => {
  return await apiRequest("/api/roadmap/tutor/add-milestone", {
    method: "POST",
    body: { studentId, topicName },
    token: getToken(),
  });
};

export const optInRecruiterTracking = async (recruiterId) => {
  return await apiRequest("/api/roadmap/student/opt-in-tracking", {
    method: "POST",
    body: { recruiterId },
    token: getToken(),
  });
};

export const getTrackedRoadmaps = async () => {
  return await apiRequest("/api/roadmap/recruiter/tracked", {
    method: "GET",
    token: getToken(),
  });
};

export const getRoadmapComments = async (roadmapId, milestoneId = "") => {
  let url = `/api/roadmap/${roadmapId}/comments`;
  if (milestoneId) {
    url += `?milestoneId=${milestoneId}`;
  }
  return await apiRequest(url, {
    method: "GET",
    token: getToken(),
  });
};

export const postRoadmapComment = async (roadmapId, milestoneId, content, type = "comment") => {
  return await apiRequest(`/api/roadmap/${roadmapId}/comments`, {
    method: "POST",
    body: { milestoneId, content, type },
    token: getToken(),
  });
};
