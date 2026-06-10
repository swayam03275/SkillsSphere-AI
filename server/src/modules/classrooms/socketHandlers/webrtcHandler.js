export default function registerWebRTCHandler(io, socket) {
  const getAuthorizedRoomId = () => socket.data?.roomId;

  const getSameRoomTargetSocket = (targetSocketId) => {
    const roomId = getAuthorizedRoomId();
    if (!roomId) {
      socket.emit("unauthorized", { message: "You must join a room first" });
      return null;
    }

    const targetSocket = io.sockets.sockets.get(targetSocketId);
    if (!targetSocket || targetSocket.data?.roomId !== roomId) {
      return null;
    }

    return targetSocket;
  };

  const emitToAuthorizedRoom = (event, payload) => {
    const roomId = getAuthorizedRoomId();
    if (!roomId) {
      socket.emit("unauthorized", { message: "You must join a room first" });
      return;
    }

    socket.to(roomId).emit(event, payload);
  };

  // WebRTC Signaling Events - Offer
  socket.on("webrtc-offer", ({ targetSocketId, offer }) => {
    if (!getSameRoomTargetSocket(targetSocketId)) {
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
    if (!getSameRoomTargetSocket(targetSocketId)) {
      // Gracefully drop unauthorized stream signaling answers
      return;
    }

    socket.to(targetSocketId).emit("webrtc-answer", {
      answererSocketId: socket.id,
      answer,
    });
  });

  // WebRTC Signaling Events - ICE Candidate
  socket.on("ice-candidate", ({ targetSocketId, candidate }) => {
    if (!getSameRoomTargetSocket(targetSocketId)) {
      // Gracefully drop unauthorized ICE candidate injection attempts
      return;
    }

    socket.to(targetSocketId).emit("ice-candidate", {
      senderSocketId: socket.id,
      candidate,
    });
  });

  // WebRTC call presence
  socket.on("user-joined-call", () => {
    emitToAuthorizedRoom("user-joined-call", {
      socketId: socket.id,
      user: socket.data?.user,
    });
  });

  socket.on("user-left-call", () => {
    emitToAuthorizedRoom("user-left-call", {
      socketId: socket.id,
      user: socket.data?.user,
    });
  });

  // Toggle Mute
  socket.on("toggle-mute", ({ roomId, isMuted }) => {
    if (!socket.data || socket.data.roomId !== roomId) return;
    socket.to(roomId).emit("mute-toggled", { socketId: socket.id, isMuted });
  });

  // Toggle Video
  socket.on("toggle-video", ({ roomId, isVideoOff }) => {
    if (!socket.data || socket.data.roomId !== roomId) return;
    socket.to(roomId).emit("video-toggled", { socketId: socket.id, isVideoOff });
  });

  // Toggle Screen Share
  socket.on("toggle-screen-share", ({ roomId, isScreenSharing }) => {
    if (!socket.data || socket.data.roomId !== roomId) return;
    socket.to(roomId).emit("screen-share-toggled", { socketId: socket.id, isScreenSharing });
  });
}
