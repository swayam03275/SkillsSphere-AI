export default function registerWebRTCHandler(io, socket) {
  // WebRTC Signaling Events - Offer
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
      // Gracefully drop unauthorized stream injection attempts
      return;
    }

    socket.to(targetSocketId).emit("webrtc-offer", {
      callerSocketId: socket.id,
      callerUser: socket.data ? socket.data.user : socket.user,
      offer,
    });
  });

  // WebRTC Signaling Events - Answer
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
      // Gracefully drop unauthorized stream signaling answers
      return;
    }

    socket.to(targetSocketId).emit("webrtc-answer", {
      answererSocketId: socket.id,
      answer,
    });
  });
}
