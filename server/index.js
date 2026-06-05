import compression from "compression";
import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import mongoose from "mongoose";
import { validateEnv } from "./src/config/validateEnv.js";
import { setupGlobalLogSanitizer } from "./src/utils/logSanitizer.js";
import logger from "./src/utils/logger.js";

dotenv.config({ override: true });
validateEnv();
setupGlobalLogSanitizer();


// Trigger nodemon restart!!!!!
import { GoogleGenerativeAI } from "@google/generative-ai";
import http from "http";
import { Server } from "socket.io";
import swaggerUi from "swagger-ui-express";
import { logEvaluatorConfig } from "./src/config/evaluatorConfig.js";
import redisClient, { connectRedis } from "./src/config/redis.js";
// import swaggerSpec from "./src/config/swaggerConfig.js";
import connectDB, { isConnected } from "./src/database/db.js";
import { protect, verifySocketToken } from "./src/middleware/authMiddleware.js";
import globalErrorHandler from "./src/middleware/errorMiddleware.js";
import { globalLimiter } from "./src/middleware/rateLimiter.js";
import requireDB from "./src/middleware/requireDB.js";
import {
  SOCKET_AUTH_ERROR_CODES,
  createSocketAuthError,
  getSocketAuthErrorMessage,
} from "./src/middleware/socketAuthError.js";
import analyticsRoutes from "./src/modules/analytics/routes.js";
import authRoutes from "./src/modules/auth/routes.js";
import createChatRouter from "./src/modules/chat/routes.js";
import classroomRoutes from "./src/modules/classrooms/routes.js";
import { initClassroomSockets } from "./src/modules/classrooms/socket.js";
import coverLetterRoutes from "./src/modules/coverLetters/routes.js";
import dashboardRoutes from "./src/modules/dashboard/routes.js";
import errorReportRoutes from "./src/modules/errors/routes.js";
import fileRoutes from "./src/modules/files/routes.js";
import interviewRoutes from "./src/modules/interviews/routes.js";
import { initInterviewSockets } from "./src/modules/interviews/socket.js";
import jobRoutes from "./src/modules/jobs/routes.js";
import matchingRoutes from "./src/modules/matching/routes.js";
import notificationRoutes from "./src/modules/notifications/routes.js";
import { initNotificationSockets } from "./src/modules/notifications/socket.js";
import recruiterRoutes from "./src/modules/recruiter/routes.js";
import resumeRoutes from "./src/modules/resumes/routes.js";
import roadmapRoutes from "./src/modules/roadmap/routes.js";
import { initRoadmapSockets } from "./src/modules/roadmap/socket.js";
import userRoutes from "./src/modules/users/routes.js";
import aiAssistantRoutes from "./src/modules/ai-assistant/routes.js";
import { setIO } from "./src/utils/socketIO.js";

import attachSocketRateLimiter from "./src/middleware/socketRateLimiter.js";

const app = express();
if (process.env.TRUST_PROXY === "true") {
  app.set("trust proxy", 1);
}
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
    if (!token) {
      return next(
        createSocketAuthError(
          "Missing auth token",
          SOCKET_AUTH_ERROR_CODES.missingToken,
        ),
      );
    }

    socket.user = await verifySocketToken(token);
    next();
  } catch (err) {
    // Harden unexpected thrown values (non-Error, Error without message, etc.)
    // so socket auth failure always returns a safe payload.
    const safeMessage =
      err instanceof Error
        ? typeof err.message === "string" && err.message.trim()
          ? err.message.trim()
          : "Invalid auth token"
        : typeof err === "string" && err.trim()
          ? err.trim()
          : "Invalid auth token";

    // Decide error code deterministically.
    // The "missingToken" case should be handled earlier when token is falsy.
    // Any thrown/failed verification is treated as invalidToken.
    const errorCode = SOCKET_AUTH_ERROR_CODES.invalidToken;

    next(
      createSocketAuthError(
        safeMessage === "Invalid auth token"
          ? safeMessage
          : `Socket authentication failed: ${safeMessage}`,
        errorCode,
      ),
    );
  }
});


setIO(io);
// Attach per-socket rate limiter to protect against message floods
attachSocketRateLimiter(io);

app.use(compression());
app.use(
  cors({
    origin: ALLOWED_ORIGINS,
    credentials: true,
  }),
);
app.use(express.json({ limit: "1mb" }));

// Security headers
app.use((req, res, next) => {
  res.setHeader("Referrer-Policy", "no-referrer");
  res.setHeader("X-Content-Type-Options", "nosniff");
  next();
});

// Apply global rate limiting to all /api routes
app.use("/api", globalLimiter);

// Safe startup: MongoDB/Redis may be temporarily unavailable.
// Keep server running in degraded mode instead of crashing the process.
let didConnectRedis = false;
try {
  await connectDB();
} catch (err) {
  logger.error(
    "MongoDB startup error (degraded mode):",
    err instanceof Error ? err.message : err,
  );
}

try {
  await connectRedis();
  didConnectRedis = true;
} catch (err) {
  logger.error(
    "Redis startup error (degraded mode):",
    err instanceof Error ? err.message : err,
  );
}

// Expose a simple readiness signal for /health without relying on redisClient internals.
globalThis.__REDIS_READY__ = didConnectRedis;

logEvaluatorConfig();



// Initialize Gemini AI client logic moved to src/modules/ai-assistant/controller.js

app.get("/health", (req, res) => {
  res.json({
    status: "OK",
    db: isConnected ? "connected" : "disconnected",
    redis: globalThis.__REDIS_READY__ ? "connected" : "disconnected",

  });
});

// app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

app.post("/api/chat", protect, async (req, res) => {
  try {
    const { message } = req.body;
    if (!message) {
      return res.status(400).json({ error: "Message required" });
    }

    if (!geminiModel) {
      return res.status(503).json({
        error:
          "AI service is currently unconfigured. Please set GEMINI_API_KEY in .env",
      });
    }

    const prompt = `You are the "SkillsSphere Career Assistant", an expert AI specializing in tech careers, resumes, recruitment, and technical interviews. 
Keep your answers concise, helpful, and professional. If the user asks something completely unrelated to careers or the platform, politely decline to answer.
User message: ${message}`;

    const result = await geminiModel.generateContent(prompt);
    const reply = result.response.text();

    res.json({ reply });
  } catch (error) {
    logger.error("Chat API error:", error);
    next(error);
  }
});


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
app.use("/api/errors", errorReportRoutes);
app.use("/api/files", requireDB, fileRoutes);
app.use("/api/notifications", requireDB, notificationRoutes);
app.use("/api/analytics", requireDB, analyticsRoutes);
app.use("/api/recruiter", requireDB, recruiterRoutes);
app.use("/api/chat", requireDB, aiAssistantRoutes);

initClassroomSockets(io);
initNotificationSockets(io);
initInterviewSockets(io);
initRoadmapSockets(io);

// Catch-all 404 handler for API routes
// This prevents Express from returning HTML on missing routes, which crashes frontend JSON parsers.
app.use("/api/*", (req, res) => {
  res.status(404).json({
    success: false,
    message: `API route not found: ${req.method} ${req.originalUrl}`,
  });
});

// Global 404 JSON handler for non-API routes.
// Prevents Express from returning HTML for unknown routes which may break JSON-based frontend calls.
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`,
  });
});

app.use(globalErrorHandler);


server.listen(PORT, () => {
  logger.log(`Server running on http://localhost:${PORT}`);
});

// --- Graceful Shutdown ---
const gracefulShutdown = async (signal) => {
  logger.log(`\nReceived ${signal}. Gracefully shutting down...`);
  try {
    if (redisClient && redisClient.isReady) {
      await redisClient.quit();
      logger.log("Redis client disconnected.");
    }
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.close();
      logger.log("MongoDB connection closed.");
    }
    server.close(() => {
      logger.log("Express server closed.");
      process.exit(0);
    });

    // Fallback force kill if connections hang for more than 10 seconds
    setTimeout(() => {
      logger.error(
        "Could not close connections in time, forcefully shutting down",
      );
      process.exit(1);
    }, 10000);
  } catch (err) {
    logger.error("Error during graceful shutdown:", err);
    process.exit(1);
  }
};

process.on("SIGINT", () => gracefulShutdown("SIGINT"));
process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
