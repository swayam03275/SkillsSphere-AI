import express from "express";
import dotenv from "dotenv";
import cors from "cors";
dotenv.config();

import http from "http";
import { Server } from "socket.io";
import connectDB from "./src/database/db.js";
import authRoutes from "./src/modules/auth/routes.js";
import resumeRoutes from "./src/modules/resumes/routes.js";
import jobRoutes from "./src/modules/jobs/routes.js";
import roadmapRoutes from "./src/modules/roadmap/routes.js";
import matchingRoutes from "./src/modules/matching/routes.js";
import dashboardRoutes from "./src/modules/dashboard/routes.js";
import classroomRoutes from "./src/modules/classrooms/routes.js";
import userRoutes from "./src/modules/users/routes.js";
import interviewRoutes from "./src/modules/interviews/routes.js";
import fileRoutes from "./src/modules/files/routes.js";
import { initClassroomSockets } from "./src/modules/classrooms/socket.js";
import globalErrorHandler from "./src/middleware/errorMiddleware.js";
import { logEvaluatorConfig } from "./src/config/evaluatorConfig.js";
import { setIO } from "./src/utils/socketIO.js";
import { initNotificationSockets } from "./src/modules/notifications/socket.js";

const app = express();
const PORT = process.env.PORT || 5000;

// Create HTTP server for Socket.io
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*", // allow frontend access
    methods: ["GET", "POST"]
  }
});

setIO(io);

app.use(cors());

app.use(express.json());
// Uploads are NOT served publicly — use /api/files/* with auth (see files/routes.js)

await connectDB();
logEvaluatorConfig();

app.get("/health", (req, res) => {
  res.json({ status: "OK" });
});

app.post("/api/chat", (req, res) => {
  try {
    const { message } = req.body;

    // validation
    if (!message) {
      return res.status(400).json({ error: "Message required" });
    }

    let reply = "I didn’t understand that.";

    const msg = message.toLowerCase();

    if (msg.includes("hello") || msg.includes("hi")) {
      reply = "Hi! How can I help you?";
    } else if (msg.includes("help")) {
      reply = "Sure! Tell me what you need help with.";
    } else if (msg.includes("resume")) {
      reply = "You can upload or manage your resumes here.";
    }

    res.json({ reply });
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
});

app.use("/api/auth", authRoutes);
app.use("/api/resume", resumeRoutes);
app.use("/api/jobs", jobRoutes);
app.use("/api/roadmap", roadmapRoutes);
app.use("/api/matching", matchingRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/classrooms", classroomRoutes);
app.use("/api/users", userRoutes);
app.use("/api/interviews", interviewRoutes);
app.use("/api/files", fileRoutes);

// Initialize Sockets
initClassroomSockets(io);
initNotificationSockets(io);

app.use(globalErrorHandler);

server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});