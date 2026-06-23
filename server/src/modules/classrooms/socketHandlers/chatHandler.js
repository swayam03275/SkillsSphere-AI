import { getOrCreateRoomState, persistRoomState } from "../socket.js";

export default function registerChatHandler(io, socket) {
  // Chat Message
  socket.on("chat-message", async ({ roomId, message }) => {
    // Validate that the socket is actually joined to this roomId
    if (!socket.data || socket.data.roomId !== roomId) {
      socket.emit("unauthorized", {
        message: "Cross-classroom action detected",
      });
      return;
    }

    // Validate payload
    if (typeof message !== "string" || message.trim().length === 0) {
      socket.emit("error", { message: "Message must be a non-empty string" });
      return;
    }

    if (message.length > 2000) {
      socket.emit("error", { message: "Message is too long (maximum 2000 characters)" });
      return;
    }

    // Sanitize HTML/XSS tags to protect clients
    const cleanMessage = message
      .trim()
      .replace(/[&<>"']/g, (char) => {
        const entityMap = {
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#x27;",
        };
        return entityMap[char] || char;
      });

    const msgObj = {
      sender: socket.data.user,
      message: cleanMessage,
      timestamp: new Date().toISOString(),
    };

    const state = getOrCreateRoomState(roomId);
    state.chatHistory.push(msgObj);
    if (state.chatHistory.length > 100) {
      state.chatHistory.shift();
    }
    persistRoomState(roomId);

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

    if (typeof isRaised !== "boolean") {
      socket.emit("error", { message: "isRaised must be a boolean value" });
      return;
    }

    const state = getOrCreateRoomState(roomId);
    if (!state.raiseHandQueue) {
      state.raiseHandQueue = [];
    }

    const existingIdx = state.raiseHandQueue.findIndex(item => item.socketId === socket.id);
    if (isRaised) {
      if (existingIdx === -1) {
        state.raiseHandQueue.push({
          socketId: socket.id,
          user: socket.data.user,
          raisedAt: new Date().toISOString()
        });
      }
    } else {
      if (existingIdx !== -1) {
        state.raiseHandQueue.splice(existingIdx, 1);
      }
    }

    persistRoomState(roomId);

    // Broadcast updated queue to everyone in the room
    io.in(roomId).emit("hand-raise-queue-updated", state.raiseHandQueue);

    // Broadcast hand raise status to others (for existing streaming tile overlays)
    socket.to(roomId).emit("hand-raise-toggled", {
      socketId: socket.id,
      isRaised,
    });
  });

  // Tutor lowers a student's hand
  socket.on("lower-student-hand", ({ roomId, targetSocketId }) => {
    if (!socket.data || socket.data.roomId !== roomId) {
      socket.emit("unauthorized", {
        message: "Cross-classroom action detected",
      });
      return;
    }

    if (socket.data.user?.role !== "tutor") {
      socket.emit("unauthorized", {
        message: "Only tutors can manage the hand-raise queue",
      });
      return;
    }

    const state = getOrCreateRoomState(roomId);
    if (!state.raiseHandQueue) {
      state.raiseHandQueue = [];
    }

    state.raiseHandQueue = state.raiseHandQueue.filter(item => item.socketId !== targetSocketId);
    persistRoomState(roomId);

    // Notify all participants
    io.in(roomId).emit("hand-raise-queue-updated", state.raiseHandQueue);
    
    // Specifically inform the target student so their button state resets
    io.to(targetSocketId).emit("hand-lowered-by-tutor");

    // Also update others for WebRTC tile indicators
    io.in(roomId).emit("hand-raise-toggled", {
      socketId: targetSocketId,
      isRaised: false,
    });
  });
}
