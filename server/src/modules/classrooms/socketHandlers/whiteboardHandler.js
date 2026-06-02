import { getOrCreateRoomState } from "../socket.js";

export default function registerWhiteboardHandler(io, socket) {
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
}
