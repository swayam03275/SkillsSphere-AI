import { getOrCreateRoomState } from "../socket.js";

export default function registerChatHandler(io, socket) {
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
}
