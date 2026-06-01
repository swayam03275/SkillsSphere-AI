import InterviewSession from "../../database/models/InterviewSession.js";
import LearningProgress from "../../database/models/LearningProgress.js";
import { processAnswerSubmission } from "./service.js";
import { transcribeAudioStream } from "../../integrations/aiInterviewService.js";

import logger from "../../utils/logger.js";

export function initInterviewSockets(io) {
  io.on("connection", (socket) => {
    // Join an active interview session as Candidate, Conductor, or Observer
    socket.on("join-interview", async ({ sessionId }) => {
      try {
        const session = await InterviewSession.findById(sessionId);
        if (!session) {
          socket.emit("unauthorized", { message: "Interview session not found" });
          return;
        }

        const user = socket.user; // populated by auth middleware
        if (!user) {
          socket.emit("unauthorized", { message: "User authentication required" });
          return;
        }

        const userId = user._id;
        const isOwner = session.userId.equals(userId);
        const isConductor = session.conductorId && session.conductorId.equals(userId);
        const isObserver = session.observers && session.observers.some((id) => id.equals(userId));
        const isTutor = user.role === "tutor" &&
          await LearningProgress.findOne({ user: session.userId, tutorsTracking: userId });

        if (!isOwner && !isConductor && !isObserver && !isTutor) {
          socket.emit("unauthorized", { message: "You are not authorized to join this interview session" });
          return;
        }

        socket.join(sessionId);
        socket.data = {
          sessionId,
          user: {
            id: user._id || user.id,
            name: user.name || user.email,
            role: user.role,
          },
        };

        // Broadcast to the room that someone joined
        socket.to(sessionId).emit("participant-joined", {
          socketId: socket.id,
          user: socket.data.user,
        });

        // Send existing participants to the joiner
        const clients = io.sockets.adapter.rooms.get(sessionId);
        const participants = [];
        if (clients) {
          for (const clientId of clients) {
            const clientSocket = io.sockets.sockets.get(clientId);
            if (clientSocket && clientSocket.data?.user) {
              participants.push({
                socketId: clientId,
                user: clientSocket.data.user,
              });
            }
          }
        }
        socket.emit("interview-participants", participants);

      } catch (error) {
        logger.error("Error joining interview room:", error);
        socket.emit("error", { message: "Internal server error during join" });
      }
    });

    // Real-time answer streaming (optional, e.g. for live code/text)
    socket.on("interview-typing", ({ sessionId, text }) => {
      if (!socket.data || socket.data.sessionId !== sessionId) return;
      socket.to(sessionId).emit("interview-typing", { text });
    });

    // Private notes for observers
    socket.on("save-private-note", ({ sessionId, note }) => {
      if (!socket.data || socket.data.sessionId !== sessionId) return;
      // In a full implementation, you would save this to a notes collection
      // For now, we acknowledge success
      socket.emit("private-note-saved", { success: true, timestamp: Date.now() });
    });

    // Observer/Conductor leaves feedback
    socket.on("submit-live-feedback", ({ sessionId, feedback }) => {
       if (!socket.data || socket.data.sessionId !== sessionId) return;
       // Only broadcast to other observers/conductors, not candidate
       // Or broadcast to room, but frontend handles who sees it
       socket.to(sessionId).emit("live-feedback-received", {
         sender: socket.data.user,
         feedback,
         timestamp: Date.now()
       });
    });

    // Handle answer submission
    socket.on("submit-answer", async ({ sessionId, transcript, audioBuffer }) => {
      logger.log(`[Socket] Received submit-answer for session ${sessionId}, transcript: ${transcript}`);
      if (!socket.data || socket.data.sessionId !== sessionId) {
        logger.log(`[Socket] Missing socket.data or mismatched sessionId. socket.data:`, socket.data);
        return;
      }

      try {
        const audioFile = audioBuffer ? { buffer: audioBuffer } : null;

        const result = await processAnswerSubmission({
          sessionId,
          userId: socket.data.user.id,
          transcript,
          audioFile,
        });

        logger.log(`[Socket] Answer evaluated successfully for session ${sessionId}`);
        // Emit the result back to this specific client
        socket.emit("answer-evaluated", result);
      } catch (error) {
        logger.error("Error evaluating answer via socket:", error);
        socket.emit("evaluation-error", { message: error.message || "Failed to evaluate answer" });
      }
    });

    // Real-time audio streaming
    socket.on("start-audio-stream", ({ sessionId }) => {
      if (!socket.data || socket.data.sessionId !== sessionId) return;

      try {
        const pyWs = transcribeAudioStream();
        socket.data.pyWs = pyWs;

        pyWs.on("message", (data) => {
          try {
            const parsed = JSON.parse(data);
            if (parsed.transcript !== undefined) {
              socket.emit("live-transcript", { transcript: parsed.transcript });
            } else if (parsed.error) {
              logger.error("Python WS Error:", parsed.error);
            }
          } catch (err) {
            logger.error("Failed to parse Python WS message", err);
          }
        });

        pyWs.on("error", (err) => {
          logger.error("Python WS Connection Error:", err);
        });
      } catch (error) {
        logger.error("Failed to start audio stream", error);
      }
    });

    socket.on("audio-chunk", ({ sessionId, chunk }) => {
      if (!socket.data || socket.data.sessionId !== sessionId) return;
      const pyWs = socket.data.pyWs;
      if (pyWs && pyWs.readyState === 1 /* OPEN */) {
        pyWs.send(chunk);
      }
    });

    socket.on("end-audio-stream", ({ sessionId }) => {
      if (!socket.data || socket.data.sessionId !== sessionId) return;
      const pyWs = socket.data.pyWs;
      if (pyWs && pyWs.readyState === 1 /* OPEN */) {
        pyWs.send("STOP");
      }
    });

    socket.on("disconnect", () => {
      if (socket.data && socket.data.sessionId) {
        const { sessionId, user } = socket.data;
        socket.to(sessionId).emit("participant-left", {
          socketId: socket.id,
          user,
        });
      }
    });

    socket.on("rehydrate-interview", (payload) => {
      if (!socket.data || socket.data.sessionId !== payload.sessionId) return;
      socket.to(payload.sessionId).emit("participant-rehydrated", {
        user: socket.data.user,
        currentIndex: payload.currentIndex
      });
    });
  });
}
