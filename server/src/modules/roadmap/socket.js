import LearningProgress from "../../database/models/LearningProgress.js";

/**
 * Initialize roadmap-related socket events.
 * Every socket has socket.user attached (from io.use middleware in index.js)
 * @param {Object} io - Socket.io instance
 */
export function initRoadmapSockets(io) {
  io.on("connection", (socket) => {
    /**
     * Join a specific student's roadmap collaboration room.
     * Verifies if the authenticated user is authorized to join the room.
     */
    socket.on("join-roadmap", async ({ roadmapId }) => {
      try {
        if (!roadmapId) return;

        const progress = await LearningProgress.findById(roadmapId);
        if (!progress) {
          socket.emit("roadmap-error", { message: "Roadmap not found" });
          return;
        }

        // Authorization check: student, tracking tutor, or tracking recruiter
        const isStudent = progress.user.toString() === socket.user._id.toString();
        const isTutor = progress.tutorsTracking && progress.tutorsTracking.some(id => id.toString() === socket.user._id.toString());
        const isRecruiter = progress.recruitersTracking && progress.recruitersTracking.some(id => id.toString() === socket.user._id.toString());

        if (isStudent || isTutor || isRecruiter) {
          const roomName = `roadmap_${roadmapId}`;
          socket.join(roomName);
          socket.emit("roadmap-room-joined", { roadmapId, room: roomName });
        } else {
          socket.emit("roadmap-error", { message: "Not authorized to access this roadmap room" });
        }
      } catch (err) {
        console.error("Error joining roadmap room:", err);
        socket.emit("roadmap-error", { message: "Internal server error joining room" });
      }
    });

    /**
     * Leave a roadmap room.
     */
    socket.on("leave-roadmap", ({ roadmapId }) => {
      if (roadmapId) {
        socket.leave(`roadmap_${roadmapId}`);
      }
    });

    /**
     * Broadcast typing indicator.
     */
    socket.on("roadmap-typing", ({ roadmapId, milestoneId, isTyping }) => {
      if (!roadmapId || !milestoneId) return;
      socket.to(`roadmap_${roadmapId}`).emit("roadmap-typing-update", {
        milestoneId,
        username: socket.user.name,
        isTyping,
      });
    });
  });
}
