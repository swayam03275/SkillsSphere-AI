import { getOrCreateRoomState, persistRoomState } from "../roomStateManager.js";

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

    // Broadcast hand raise status to others
    socket.to(roomId).emit("hand-raise-toggled", {
      socketId: socket.id,
      isRaised,
    });
  });
}
