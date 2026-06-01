import ClassroomSession from "../../database/models/ClassroomSession.js";
import { executeCode } from "../../utils/codeExecutor.js";
import { getRoomLock, clearRoomLock } from "../../utils/mutex.js";

import logger from "../../utils/logger.js";

const roomStates = new Map();

function getOrCreateRoomState(roomId) {
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
        socket.emit("sync-state", state);
      } catch (error) {
        logger.error("Error joining classroom room:", error);
        socket.emit("error", { message: "Internal server error during join" });
        socket.disconnect(true);
      } finally {
        release();
      }
    });

    // Chat Message
    socket.on("chat-message", ({ roomId, message }) => {
      // Validate that the socket is actually joined to this roomId
      if (!socket.data || socket.data.roomId !== roomId) {
        socket.emit("unauthorized", {
          message: "Cross-classroom action detected",
        });
        return;
      }

      const msgObj = {
        sender: socket.data.user,
        message,
        timestamp: new Date().toISOString(),
      };

      const state = getOrCreateRoomState(roomId);
      state.chatHistory.push(msgObj);
      if (state.chatHistory.length > 100) {
        state.chatHistory.shift();
      }

      socket.to(roomId).emit("chat-message", msgObj);
    });

    // Toggle Hand Raise
    socket.on("toggle-hand-raise", ({ roomId, isRaised }) => {
      // Validate that the socket is actually joined to this roomId
      if (!socket.data || socket.data.roomId !== roomId) {
        socket.emit("unauthorized", {
          message: "Cross-classroom action detected",
        });
        return;
      }

      // Broadcast hand raise status to others
      socket.to(roomId).emit("hand-raise-toggled", {
        socketId: socket.id,
        isRaised,
      });
    });

    // WebRTC Signaling Events
    socket.on("webrtc-offer", ({ targetSocketId, offer }) => {
      // Validate that the requesting socket is in a room
      if (!socket.data || !socket.data.roomId) {
        socket.emit("unauthorized", { message: "You must join a room first" });
        return;
      }

      // Validate that the target socket exists and is in the same room
      const targetSocket = io.sockets.sockets.get(targetSocketId);
      if (
        !targetSocket ||
        !targetSocket.data ||
        targetSocket.data.roomId !== socket.data.roomId
      ) {
        // Gracefully and silently drop the unauthorized stream injection attempt
        return;
      }

      socket.to(targetSocketId).emit("webrtc-offer", {
        callerSocketId: socket.id,
        callerUser: socket.data ? socket.data.user : socket.user,
        offer,
      });
    });

    socket.on("webrtc-answer", ({ targetSocketId, answer }) => {
      // Validate that both sockets exist and are in the same room
      if (!socket.data || !socket.data.roomId) {
        socket.emit("unauthorized", { message: "You must join a room first" });
        return;
      }

      const targetSocket = io.sockets.sockets.get(targetSocketId);
      if (
        !targetSocket ||
        !targetSocket.data ||
        targetSocket.data.roomId !== socket.data.roomId
      ) {
        // Gracefully and silently drop the unauthorized stream signaling answer
        return;
      }

      socket.to(targetSocketId).emit("webrtc-answer", {
        answererSocketId: socket.id,
        answer,
      });
    });

    // --- Whiteboard & Shared Coding Events ---

    // Draw stroke event
    socket.on("draw-stroke", ({ roomId, strokeData }) => {
      if (!socket.data || socket.data.roomId !== roomId) {
        socket.emit("unauthorized", {
          message: "Cross-classroom action detected",
        });
        return;
      }
      const payload = {
        strokeData,
        sender: socket.data.user,
      };

      const state = getOrCreateRoomState(roomId);
      state.whiteboard.push(payload);

      socket.to(roomId).emit("draw-stroke", payload);
    });

    // Clear canvas event
    socket.on("clear-canvas", ({ roomId }) => {
      if (!socket.data || socket.data.roomId !== roomId) {
        socket.emit("unauthorized", {
          message: "Cross-classroom action detected",
        });
        return;
      }
      const state = getOrCreateRoomState(roomId);
      state.whiteboard = [];
      socket.to(roomId).emit("clear-canvas");
    });

    // Code change event
    socket.on("code-change", ({ roomId, code }) => {
      if (!socket.data || socket.data.roomId !== roomId) {
        socket.emit("unauthorized", {
          message: "Cross-classroom action detected",
        });
        return;
      }
      const state = getOrCreateRoomState(roomId);
      state.code = code;
      socket.to(roomId).emit("code-change", { code });
    });

    // Code cursor event
    socket.on("code-cursor", ({ roomId, cursorPosition }) => {
      if (!socket.data || socket.data.roomId !== roomId) {
        socket.emit("unauthorized", {
          message: "Cross-classroom action detected",
        });
        return;
      }
      socket.to(roomId).emit("code-cursor", {
        cursorPosition,
        senderId: socket.id,
        senderName: socket.data.user?.name || "Participant",
      });
    });

    // Execute code event
    socket.on("execute-code-request", async ({ roomId, code, language }) => {
      if (!socket.data || socket.data.roomId !== roomId) {
        socket.emit("unauthorized", {
          message: "Cross-classroom action detected",
        });
        return;
      }

      // Broadcast that execution has started
      io.to(roomId).emit("execution-started", {
        senderName: socket.data.user?.name || "Participant",
      });

      // Execute code via API
      const result = await executeCode(language, code);

      // Broadcast result
      io.to(roomId).emit("execution-result", {
        output: result.output,
        isError: result.isError,
        senderName: socket.data.user?.name || "Participant",
      });
    });

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

            // Automatically teardown/end the classroom session in database if empty
            if (session.participants.length === 0) {
              logger.log(`Classroom ${roomId} empty. Automatically ending session.`);
              session.status = "ended";
              session.endedAt = new Date();

              // Sync transient in-memory state back to DB archive
              const finalState = getRoomState(roomId);
              if (finalState) {
                session.chatHistory = finalState.chatHistory || [];
                session.codeSnapshot = finalState.code || "";
              }

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

