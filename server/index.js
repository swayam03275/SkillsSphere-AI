import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import { validateEnv } from "./src/config/validateEnv.js";

dotenv.config({ override: true });
validateEnv();

import http from "http";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { Server } from "socket.io";
import connectDB, { isConnected } from "./src/database/db.js";
import requireDB from "./src/middleware/requireDB.js";
import authRoutes from "./src/modules/auth/routes.js";
import resumeRoutes from "./src/modules/resumes/routes.js";
import jobRoutes from "./src/modules/jobs/routes.js";
import roadmapRoutes from "./src/modules/roadmap/routes.js";
import matchingRoutes from "./src/modules/matching/routes.js";
import dashboardRoutes from "./src/modules/dashboard/routes.js";
import coverLetterRoutes from "./src/modules/coverLetters/routes.js";
import classroomRoutes from "./src/modules/classrooms/routes.js";
import notificationRoutes from "./src/modules/notifications/routes.js";
import userRoutes from "./src/modules/users/routes.js";
import interviewRoutes from "./src/modules/interviews/routes.js";
import fileRoutes from "./src/modules/files/routes.js";
import chatRoutes from "./src/modules/chat/routes.js";
import { initClassroomSockets } from "./src/modules/classrooms/socket.js";
import { initInterviewSockets } from "./src/modules/interviews/socket.js";
import globalErrorHandler from "./src/middleware/errorMiddleware.js";
import { logEvaluatorConfig } from "./src/config/evaluatorConfig.js";
import { setIO } from "./src/utils/socketIO.js";
import { connectRedis } from "./src/config/redis.js";
import { initNotificationSockets } from "./src/modules/notifications/socket.js";
import { verifySocketToken } from "./src/middleware/authMiddleware.js";
import swaggerUi from "swagger-ui-express";
import swaggerSpec from "./src/config/swaggerConfig.js";
import analyticsRoutes from "./src/modules/analytics/routes.js";
import { globalLimiter } from "./src/middleware/rateLimiter.js";

const app = express();
app.set("trust proxy", 1);
const PORT = process.env.PORT || 5000;

const server = http.createServer(app);

const ALLOWED_ORIGINS = [
  process.env.FRONTEND_URL || "http://localhost:5174",
  "http://localhost:5173",
];

const io = new Server(server, {
  cors: {
    origin: ALLOWED_ORIGINS,
    methods: ["GET", "POST"],
    credentials: true,
  },
});

/**
 * Socket.io authentication middleware.
 * Every WebSocket connection must present a valid JWT in the handshake.
 * The verified user is attached to socket.user for use in event handlers.
 */
io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth?.token;
    socket.user = await verifySocketToken(token);
    next();
  } catch (err) {
    next(new Error(`Socket authentication failed: ${err.message}`));
  }
});

setIO(io);

app.use(cors({
  origin: ALLOWED_ORIGINS,
  credentials: true,
}));
app.use(express.json());

// Security headers
app.use((req, res, next) => {
  res.setHeader("Referrer-Policy", "no-referrer");
  res.setHeader("X-Content-Type-Options", "nosniff");
  next();
});

// Apply global rate limiting to all /api routes
app.use("/api", globalLimiter);

await connectDB();
logEvaluatorConfig();

app.get("/health", (req, res) => {
  res.json({ status: "OK", db: isConnected ? "connected" : "disconnected" });
});

app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

app.use("/api/auth", requireDB, authRoutes);
app.use("/api/resume", requireDB, resumeRoutes);
app.use("/api/jobs", requireDB, jobRoutes);
app.use("/api/roadmap", requireDB, roadmapRoutes);
app.use("/api/matching", requireDB, matchingRoutes);
app.use("/api/dashboard", requireDB, dashboardRoutes);
app.use("/api/cover-letters", requireDB, coverLetterRoutes);
app.use("/api/classrooms", requireDB, classroomRoutes);
app.use("/api/users", requireDB, userRoutes);
app.use("/api/interviews", requireDB, interviewRoutes);
app.use("/api/files", requireDB, fileRoutes);
app.use("/api/chat", requireDB, chatRoutes);
app.use("/api/notifications", requireDB, notificationRoutes);
app.use("/api/analytics", requireDB, analyticsRoutes);

initClassroomSockets(io);
initNotificationSockets(io);
initInterviewSockets(io);

app.use(globalErrorHandler);

server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
