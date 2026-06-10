import ClassroomSession from "../../database/models/ClassroomSession.js";
import { getRoomLock, clearRoomLock } from "../../utils/mutex.js";
import logger from "../../utils/logger.js";

// Socket event sub-handlers
import registerChatHandler from "./socketHandlers/chatHandler.js";
import registerWebRTCHandler from "./socketHandlers/webrtcHandler.js";
import registerWhiteboardHandler from "./socketHandlers/whiteboardHandler.js";
import registerCodeEditorHandler from "./socketHandlers/codeEditorHandler.js";

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

export function initClassroomSockets(io) {
  // Start a periodic background sweeper to clean up empty classroom sessions across all instances
  setInterval(async () => {
    try {
      const activeSessions = await ClassroomSession.find({ status: "active" });

      for (const session of activeSessions) {
        let activeSockets = [];
        try {
          activeSockets = await io.in(session.roomId).fetchSockets();
        } catch (fetchErr) {
          logger.error(`Error fetching sockets for room ${session.roomId}:`, fetchErr);
          continue;
        }

        if (activeSockets.length === 0) {
          // If the room has no active socket connections, check/set emptySince
          if (!session.emptySince) {
            logger.info(`Background Sweeper: Room ${session.roomId} is empty. Starting 30-second teardown countdown...`);
            session.emptySince = new Date();
            await session.save();
          } else {
            const gracePeriodMs = 30000; // 30 seconds
            const cutoffTime = new Date(Date.now() - gracePeriodMs);
            if (session.emptySince < cutoffTime) {
              logger.info(`Background Sweeper: Ending empty classroom session ${session.roomId}`);
              session.status = "ended";
              session.endedAt = new Date();
              await session.save();

              await clearRoomState(session.roomId);
              clearRoomLock(session.roomId);
            }
          }
        } else {
          // If there are active sockets, ensure emptySince is null and participants list in DB is updated/cleaned
          let dbChanged = false;
          if (session.emptySince !== null) {
            session.emptySince = null;
            dbChanged = true;
          }

          // Clean up participants in DB that are no longer active sockets
          const activeSocketIds = new Set(activeSockets.map((s) => s.id));
          const updatedParticipants = (session.participants || []).filter((p) =>
            activeSocketIds.has(p.socketId)
          );
          if (updatedParticipants.length !== (session.participants || []).length) {
            session.participants = updatedParticipants;
            dbChanged = true;
          }

          if (dbChanged) {
            await session.save();
          }
        }
      }
    } catch (err) {
      logger.error("Background Sweeper Error:", err);
    }
  }, 10000); // Check every 10 seconds

  io.on("connection", (socket) => {
    logger.info(`Socket connected: ${socket.id}`);

    // Join a specific room
    socket.on("join-room", async ({ roomId }) => {
      const lock = getRoomLock(roomId);
      const release = await lock.acquire();

      try {
        // Validate session in database
        const session = await ClassroomSession.findOne({
          roomId,
          status: "active",
        });
        if (!session) {
          socket.emit("unauthorized", {
            message: "Classroom session not found or has already ended",
          });
          socket.disconnect(true);
          return;
        }

        // Use authenticated user from middleware
        const currentUser = socket.user;
        if (!currentUser) {
          socket.emit("unauthorized", {
            message: "User authentication required",
          });
          socket.disconnect(true);
          return;
        }

        socket.join(roomId);

        // Store validated user and roomId info in socket instance
        const userIdStr = (currentUser._id || currentUser.id).toString();
        socket.data = {
          roomId,
          user: {
            id: userIdStr,
            name: currentUser.name || currentUser.email,
            role: currentUser.role,
          },
        };

        // Ensure state is loaded from Redis/DB into memory
        await loadRoomState(roomId, session);

        logger.info(
          `User ${socket.data.user.name} (${socket.id}) joining room ${roomId}`,
        );

        // Count active socket connections for this user in this room to prevent spam
        const roomSockets = io.sockets.adapter.rooms.get(roomId);
        let userConnectionCount = 0;
        if (roomSockets) {
          for (const socketId of roomSockets) {
            const connectedSocket = io.sockets.sockets.get(socketId);
            if (
              connectedSocket &&
              connectedSocket.data &&
              connectedSocket.data.user &&
              connectedSocket.data.user.id === userIdStr &&
              connectedSocket.id !== socket.id
            ) {
              userConnectionCount += 1;
            }
          }
        }

        if (userConnectionCount >= 3) {
          socket.emit("unauthorized", {
            message: "Connection limit exceeded (maximum 3 active connections allowed)",
          });
          socket.disconnect(true);
          return;
        }

        // Update database: actively purge any stale/ghost socket IDs for this specific user
        session.participants = (session.participants || []).filter(
          (p) => p.socketId !== socket.id && p.user?.id !== userIdStr
        );

        // Add this new active socket participant
        session.participants.push({
          socketId: socket.id,
          user: socket.data.user,
        });

        // Reset emptySince timer since a user has joined
        session.emptySince = null;

        await session.save();

        // Notify others in the room that a new user joined
        socket.to(roomId).emit("user-joined", {
          socketId: socket.id,
          user: socket.data.user,
        });

        // Get participants list directly from the database for ultimate reliability
        const participants = session.participants.map((p) => ({
          socketId: p.socketId,
          user: p.user,
        }));

        // Send the current participants list to the person who just joined
        socket.emit("room-participants", participants);

        // Sync the current room state (chat, code, whiteboard)
        const state = getOrCreateRoomState(roomId);
        if (state.chatHistory.length === 0 && !state.code && state.whiteboard.length === 0) {
          state.chatHistory = session.chatHistory || [];
          state.code = session.codeSnapshot || "";
          state.whiteboard = session.whiteboardSnapshot || [];
        }
        socket.emit("sync-state", state);
      } catch (error) {
        logger.error("Error joining classroom room:", error);
        socket.emit("error", { message: "Internal server error during join" });
        socket.disconnect(true);
      } finally {
        release();
      }
    });

    // Mount modular event sub-handlers
    registerChatHandler(io, socket);
    registerWebRTCHandler(io, socket);
    registerWhiteboardHandler(io, socket);
    registerCodeEditorHandler(io, socket);

    // Disconnect
    socket.on("disconnecting", async () => {
      logger.info(`Socket disconnecting: ${socket.id}`);
      // Find all rooms this socket joined (excluding its own private room)
      const joinedRooms = Array.from(socket.rooms).filter((r) => r !== socket.id);

      for (const roomId of joinedRooms) {
        const user = socket.data?.user || { name: "Participant", role: "student" };

        // Broadcast to others in the room first
        socket.to(roomId).emit("user-left", {
          socketId: socket.id,
          user,
        });

        const lock = getRoomLock(roomId);
        let release;
        try {
          release = await lock.acquire();
          const session = await ClassroomSession.findOne({
            roomId,
            status: "active",
          });

          if (session) {
            // Atomically remove this participant socket connection
            session.participants = (session.participants || []).filter(
              (p) => p.socketId !== socket.id
            );

            // Sync transient in-memory state back to DB archive on disconnect
            const finalState = await getRoomState(roomId);
            if (finalState) {
              session.chatHistory = finalState.chatHistory || [];
              session.codeSnapshot = finalState.code || "";
              session.whiteboardSnapshot = finalState.whiteboard || [];
            }

            // Automatically teardown/end the classroom session in database if empty
            if (session.participants.length === 0) {
              logger.info(`Classroom ${roomId} empty. Initiating 30-second teardown countdown...`);
              session.emptySince = new Date();
            }

            await session.save();
          }
        } catch (error) {
          logger.error(`Error during socket disconnect cleanup for room ${roomId}:`, error);
        } finally {
          if (release) release();
        }
      }
    });
  });
}


