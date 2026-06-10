import { v4 as uuidv4 } from "uuid";
import ClassroomSession from "../../database/models/ClassroomSession.js";
import AppError from "../../utils/AppError.js";
import { clearRoomState, getRoomState } from "./socket.js";

/**
 * Create a new live classroom session
 * @param {string} hostId - User ID of the tutor/host
 * @param {Object} sessionData - Title, subject, and optional participant limit
 * @returns {Promise<Object>} The created session document
 */
export const createSession = async (hostId, { title, subject, maxParticipants }) => {
  if (!title || !title.trim()) {
    throw new AppError("Session title is required", 400);
  }

  const roomId = uuidv4();
  const session = await ClassroomSession.create({
    roomId,
    title,
    subject,
    maxParticipants,
    host: hostId,
    status: "active",
  });

  return session;
};

/**
 * Fetch all sessions hosted by a specific tutor
 * @param {string} hostId - User ID of the tutor
 * @returns {Promise<Array>} List of session documents
 */
export const getTutorSessions = async (hostId) => {
  return await ClassroomSession.find({ host: hostId })
    .sort({ createdAt: -1 })
    .limit(50)
    .lean();
};

/**
 * Retrieve session metadata by its public Room ID
 * @param {string} roomId - UUID of the room
 * @returns {Promise<Object>} The session document
 */
export const getSessionByRoomId = async (roomId) => {
  const session = await ClassroomSession.findOne({ roomId })
    .populate("host", "name profilePic role")
    .lean();

  if (!session) {
    throw new AppError("Classroom session not found", 404);
  }

  return session;
};

/**
 * End a live classroom session (host/tutor only)
 * @param {string} roomId - UUID of the room
 * @param {string} hostId - User ID of the requesting user
 * @returns {Promise<Object>} The updated session document
 */
export const endSession = async (roomId, hostId) => {
  const session = await ClassroomSession.findOne({ roomId });

  if (!session) {
    throw new AppError("Classroom session not found", 404);
  }

  // Authorize: Only the host/tutor who created the session can end it
  if (session.host.toString() !== hostId.toString()) {
    throw new AppError("You do not have permission to end this session", 403);
  }

  if (session.status === "ended") {
    return session; // already ended
  }

  // Capture final artifacts from memory state
  const finalState = await getRoomState(roomId);
  if (finalState) {
    session.chatHistory = finalState.chatHistory || [];
    session.codeSnapshot = finalState.code || "";
  }

  session.status = "ended";
  session.endedAt = new Date();
  await session.save();

  // Clear in-memory room state to prevent memory leaks
  await clearRoomState(roomId);

  return session;
};

/**
 * Fetch all currently active classroom sessions
 * @returns {Promise<Array>} List of active session documents
 */
export const getActiveSessions = async () => {
  return await ClassroomSession.find({ status: "active" })
    .populate("host", "name profilePic role")
    .sort({ createdAt: -1 })
    .limit(20)
    .lean();
};

