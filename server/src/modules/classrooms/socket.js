import ClassroomSession from "../../database/models/ClassroomSession.js";
import { getRoomLock, clearRoomLock } from "../../utils/mutex.js";
import logger from "../../utils/logger.js";

// Socket event sub-handlers
import registerChatHandler from "./socketHandlers/chatHandler.js";
import registerWebRTCHandler from "./socketHandlers/webrtcHandler.js";
import registerWhiteboardHandler from "./socketHandlers/whiteboardHandler.js";
import registerCodeEditorHandler from "./socketHandlers/codeEditorHandler.js";

const roomStates = new Map();

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
}

export function getRoomState(roomId) {
  return roomStates.get(roomId);
}

export function initClassroomSockets(io) {
  io.on("connection", (socket) => {
    logger.log(`Socket connected: ${socket.id}`);

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

        logger.log(
          `User ${socket.data.user.name} (${socket.id}) joining room ${roomId}`,
        );

        // Update database: remove any existing/stale socket for this user in this room to prevent duplicates
        session.participants = (session.participants || []).filter(
          (p) => p.user.id.toString() !== userIdStr && p.socketId !== socket.id
        );

        // Add this new active socket participant
        session.participants.push({
          socketId: socket.id,
          user: socket.data.user,
        });

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
    socket.on("disconnect", async () => {
      logger.log(`Socket disconnected: ${socket.id}`);
      if (socket.data && socket.data.roomId) {
        const { roomId, user } = socket.data;

        // Broadcast to others in the room first
        socket.to(roomId).emit("user-left", {
          socketId: socket.id,
          user,
        });

        const lock = getRoomLock(roomId);
        const release = await lock.acquire();

        try {
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
            const finalState = getRoomState(roomId);
            if (finalState) {
              session.chatHistory = finalState.chatHistory || [];
              session.codeSnapshot = finalState.code || "";
              session.whiteboardSnapshot = finalState.whiteboard || [];
            }

            // Automatically teardown/end the classroom session in database if empty
            if (session.participants.length === 0) {
              logger.log(`Classroom ${roomId} empty. Automatically ending session.`);
              session.status = "ended";
              session.endedAt = new Date();

              clearRoomState(roomId);
              clearRoomLock(roomId);
            }

            await session.save();
          }
        } catch (error) {
          logger.error("Error during socket disconnect cleanup:", error);
        } finally {
          release();
        }
      }
    });
  });
}
