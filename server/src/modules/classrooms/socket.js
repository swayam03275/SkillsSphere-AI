import ClassroomSession from "../../database/models/ClassroomSession.js";

export function initClassroomSockets(io) {
  io.on("connection", (socket) => {
    console.log(`Socket connected: ${socket.id}`);

    // Join a specific room
    socket.on("join-room", ({ roomId }) => {
      socket.join(roomId);
      
      // Store user info in socket instance to easily retrieve later
      const user = socket.user; // Secure, derived from JWT
      socket.data = { roomId, user };

        // Validate session in database
        const session = await ClassroomSession.findOne({ roomId, status: "active" });
        if (!session) {
          socket.emit("unauthorized", { message: "Classroom session not found or has already ended" });
          socket.disconnect(true);
          return;
        }

        // Use authenticated user from middleware
        const currentUser = socket.user || user;
        if (!currentUser) {
          socket.emit("unauthorized", { message: "User authentication required" });
          socket.disconnect(true);
          return;
        }

        socket.join(roomId);
        
        // Store validated user and roomId info in socket instance
        socket.data = { 
          roomId, 
          user: { 
            id: currentUser._id || currentUser.id, 
            name: currentUser.name || currentUser.email,
            role: currentUser.role
          } 
        };

        console.log(`User ${socket.data.user.name} (${socket.id}) joined room ${roomId}`);

        // Notify others in the room that a new user joined
        socket.to(roomId).emit("user-joined", {
          socketId: socket.id,
          user: socket.data.user
        });

        // Get all clients currently in the room
        const clients = io.sockets.adapter.rooms.get(roomId);
        const participants = [];
        if (clients) {
          for (const clientId of clients) {
            const clientSocket = io.sockets.sockets.get(clientId);
            if (clientSocket && clientSocket.data?.user) {
              participants.push({
                socketId: clientId,
                user: clientSocket.data.user
              });
            }
          }
        }

        // Send the current participants list to the person who just joined
        socket.emit("room-participants", participants);
      } catch (error) {
        console.error("Error joining classroom room:", error);
        socket.emit("error", { message: "Internal server error during join" });
        socket.disconnect(true);
      }
    });

    // Chat Message
    socket.on("chat-message", ({ roomId, message }) => {
      // Validate that the socket is actually joined to this roomId
      if (!socket.data || socket.data.roomId !== roomId) {
        socket.emit("unauthorized", { message: "Cross-classroom action detected" });
        return;
      }

      socket.to(roomId).emit("chat-message", {
        sender: socket.data.user,
        message,
        timestamp: new Date().toISOString()
      });
    });

    // Toggle Hand Raise
    socket.on("toggle-hand-raise", ({ roomId, isRaised }) => {
      // Validate that the socket is actually joined to this roomId
      if (!socket.data || socket.data.roomId !== roomId) {
        socket.emit("unauthorized", { message: "Cross-classroom action detected" });
        return;
      }

      // Broadcast hand raise status to others
      socket.to(roomId).emit("hand-raise-toggled", {
        socketId: socket.id,
        isRaised
      });
    });

    // WebRTC Signaling Events
    socket.on("webrtc-offer", ({ targetSocketId, offer }) => {
      socket.to(targetSocketId).emit("webrtc-offer", {
        callerSocketId: socket.id,
        callerUser: socket.data ? socket.data.user : socket.user,
        offer
      });
    });

    socket.on("webrtc-answer", ({ targetSocketId, answer }) => {
      // Validate that both sockets exist and are in the same room
      if (!socket.data || !socket.data.roomId) {
        socket.emit("unauthorized", { message: "You must join a room first" });
        return;
      }

      const targetSocket = io.sockets.sockets.get(targetSocketId);
      if (!targetSocket || !targetSocket.data || targetSocket.data.roomId !== socket.data.roomId) {
        socket.emit("unauthorized", { message: "Target user is not in your classroom" });
        return;
      }

      socket.to(targetSocketId).emit("webrtc-answer", {
        answererSocketId: socket.id,
        answer
      });
    });

    // --- Whiteboard & Shared Coding Events ---

    // Draw stroke event
    socket.on("draw-stroke", ({ roomId, strokeData }) => {
      if (!socket.data || socket.data.roomId !== roomId) {
        socket.emit("unauthorized", { message: "Cross-classroom action detected" });
        return;
      }
      socket.to(roomId).emit("draw-stroke", {
        strokeData,
        sender: socket.data.user
      });
    });

    // Clear canvas event
    socket.on("clear-canvas", ({ roomId }) => {
      if (!socket.data || socket.data.roomId !== roomId) {
        socket.emit("unauthorized", { message: "Cross-classroom action detected" });
        return;
      }
      socket.to(roomId).emit("clear-canvas");
    });

    // Code change event
    socket.on("code-change", ({ roomId, code }) => {
      if (!socket.data || socket.data.roomId !== roomId) {
        socket.emit("unauthorized", { message: "Cross-classroom action detected" });
        return;
      }
      socket.to(roomId).emit("code-change", { code });
    });

    // Code cursor event
    socket.on("code-cursor", ({ roomId, cursorPosition }) => {
      if (!socket.data || socket.data.roomId !== roomId) {
        socket.emit("unauthorized", { message: "Cross-classroom action detected" });
        return;
      }
      socket.to(roomId).emit("code-cursor", {
        cursorPosition,
        senderId: socket.id,
        senderName: socket.data.user?.name || "Participant"
      });
    });

    // Disconnect
    socket.on("disconnect", () => {
      console.log(`Socket disconnected: ${socket.id}`);
      if (socket.data && socket.data.roomId) {
        const { roomId, user } = socket.data;
        socket.to(roomId).emit("user-left", {
          socketId: socket.id,
          user
        });
      }
    });
  });
}
