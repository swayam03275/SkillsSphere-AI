import { apiRequest } from "../../../services/apiClient";

/**
 * Create a new live classroom session
 * @param {Object} sessionData - { title, subject, maxParticipants }
 * @param {string} token - User's JWT token
 */
export const createClassroomSession = async (sessionData, token) => {
  return await apiRequest("/api/classrooms/create", {
    method: "POST",
    body: sessionData,
    token,
  });
};

/**
 * Get all sessions hosted by the authenticated tutor
 * @param {string} token - User's JWT token
 */
export const getTutorClassroomSessions = async (token) => {
  return await apiRequest("/api/classrooms/my-sessions", {
    method: "GET",
    token,
  });
};

/**
 * Retrieve classroom session metadata by room ID
 * @param {string} roomId - UUID of the room
 * @param {string} token - User's JWT token
 */
export const getClassroomSession = async (roomId, token) => {
  return await apiRequest(`/api/classrooms/${roomId}`, {
    method: "GET",
    token,
  });
};

/**
 * End a live classroom session
 * @param {string} roomId - UUID of the room
 * @param {string} token - User's JWT token
 */
export const endClassroomSession = async (roomId, token) => {
  return await apiRequest(`/api/classrooms/${roomId}/end`, {
    method: "PATCH",
    token,
  });
};

/**
 * Get all active classroom sessions
 * @param {string} token - User's JWT token
 */
export const getActiveClassroomSessions = async (token) => {
  return await apiRequest("/api/classrooms/active", {
    method: "GET",
    token,
  });
};

