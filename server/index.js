import express from "express";
import dotenv from "dotenv";
import cors from "cors";
dotenv.config({ override: true });

import http from "http";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { Server } from "socket.io";
import connectDB from "./src/database/db.js";
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
import { initClassroomSockets } from "./src/modules/classrooms/socket.js";
import { initInterviewSockets } from "./src/modules/interviews/socket.js";
import globalErrorHandler from "./src/middleware/errorMiddleware.js";
import { logEvaluatorConfig } from "./src/config/evaluatorConfig.js";
import { setIO } from "./src/utils/socketIO.js";
import { initNotificationSockets } from "./src/modules/notifications/socket.js";
import { verifySocketToken } from "./src/middleware/authMiddleware.js";
import swaggerUi from 'swagger-ui-express';
import swaggerSpec from './src/config/swaggerConfig.js';
import { validateEnv } from './src/config/validateEnv.js';
import analyticsRoutes from "./src/modules/analytics/routes.js";
const app = express();
app.set("trust proxy", 1);
const PORT = process.env.PORT || 5000;

validateEnv();

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

app.use(cors());
app.use(express.json());

// Security headers
app.use((req, res, next) => {
  res.setHeader("Referrer-Policy", "no-referrer");
  res.setHeader("X-Content-Type-Options", "nosniff");
  next();
});

await connectDB();
logEvaluatorConfig();

app.get("/health", (req, res) => {
  res.json({ status: "OK" });
});

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

app.post("/api/chat", async (req, res) => {
  try {
    const { message } = req.body;
    if (!message) {
      return res.status(400).json({ error: "Message required" });
    }

    if (!process.env.GEMINI_API_KEY) {
      return res.status(503).json({ error: "AI service is currently unconfigured. Please set GEMINI_API_KEY in .env" });
    }

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const prompt = `You are the "SkillsSphere Career Assistant", an expert AI specializing in tech careers, resumes, recruitment, and technical interviews. 
Keep your answers concise, helpful, and professional. If the user asks something completely unrelated to careers or the platform, politely decline to answer.
User message: ${message}`;

    const result = await model.generateContent(prompt);
    const reply = result.response.text();

    res.json({ reply });
  } catch (error) {
    console.error("Chat API error:", error);
    res.status(500).json({ error: "Failed to generate AI response" });
  }
});

app.use("/api/auth", authRoutes);
app.use("/api/resume", resumeRoutes);
app.use("/api/jobs", jobRoutes);
app.use("/api/roadmap", roadmapRoutes);
app.use("/api/matching", matchingRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/cover-letters", coverLetterRoutes);
app.use("/api/classrooms", classroomRoutes);
app.use("/api/users", userRoutes);
app.use("/api/interviews", interviewRoutes);
app.use("/api/files", fileRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/analytics", analyticsRoutes);

initClassroomSockets(io);
initNotificationSockets(io);
initInterviewSockets(io);

app.use(globalErrorHandler);

server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});