import ClassroomSession from "../../database/models/ClassroomSession.js";
import logger from "../../utils/logger.js";
import redisClient from "../../config/redis.js";

const roomStates = new Map();

const getRedisKey = (roomId) => `classroom:state:${roomId}`;

export async function loadRoomState(roomId, session = null) {
  if (roomStates.has(roomId)) return roomStates.get(roomId);

  const key = getRedisKey(roomId);
  if (redisClient.isReady) {
    try {
      const cached = await redisClient.get(key);
      if (cached) {
        const state = JSON.parse(cached);
        roomStates.set(roomId, state);
        return state;
      }
    } catch (err) {
      logger.error(`Redis loadRoomState error for ${roomId}:`, err);
    }
  }

  // Fallback: load from database
  const activeSession = session || await ClassroomSession.findOne({ roomId, status: "active" });
  const state = {
    chatHistory: activeSession ? activeSession.chatHistory || [] : [],
    code: activeSession ? activeSession.codeSnapshot || "" : "",
    whiteboard: activeSession ? activeSession.whiteboardSnapshot || [] : []
  };

  roomStates.set(roomId, state);

  if (redisClient.isReady) {
    try {
      await redisClient.set(key, JSON.stringify(state));
    } catch (err) {
      logger.error(`Redis save default state error for ${roomId}:`, err);
    }
  }
  return state;
}

export function persistRoomState(roomId) {
  const state = roomStates.get(roomId);
  if (!state) return;

  const key = getRedisKey(roomId);
  if (redisClient.isReady) {
    redisClient.set(key, JSON.stringify(state)).catch((err) => {
      logger.error(`Redis persistRoomState error for ${roomId}:`, err);
    });
  }
}

export function getOrCreateRoomState(roomId) {
  if (!roomStates.has(roomId)) {
    roomStates.set(roomId, {
      chatHistory: [],
      code: "",
      whiteboard: []
    });
  }
  return roomStates.get(roomId);
}

export function clearRoomState(roomId) {
  roomStates.delete(roomId);
  const key = getRedisKey(roomId);
  if (redisClient.isReady) {
    redisClient.del(key).catch((err) => {
      logger.error(`Redis clearRoomState error for ${roomId}:`, err);
    });
  }
}

export function getRoomState(roomId) {
  return roomStates.get(roomId);
}
