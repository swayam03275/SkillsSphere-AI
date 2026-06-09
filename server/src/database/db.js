import dns from "node:dns";
import mongoose from "mongoose";

export let isConnected = false;

import { seedInterviewData } from "../modules/interviews/seed/seedInterviewData.js";
import { seedJobData } from "../modules/jobs/seed/seedJobData.js";
import QuestionBank from "./models/QuestionBank.js";
import JobPosting from "./models/JobPosting.js";
import { seedTutorRoadmap } from "../modules/roadmap/seed/seedTutorRoadmap.js";

import logger from "../utils/logger.js";

const connectDB = async () => {
  const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI;

  if (mongoUri === "memory") {
    const { MongoMemoryServer } = await import("mongodb-memory-server");
    const mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    logger.info(`Started ephemeral Memory Database at: ${uri}`);
    process.env.MONGO_URI = uri;
    const res = await connectDB();
    logger.info("Memory DB connected.");
    // NOTE: If you need to seed interview data in memory mode,
    // call seedInterviewData() from app.js after connectDB() resolves.
    logger.info("Memory DB connected. Auto-seeding mock interview data and job postings...");
    await seedInterviewData();
    await seedJobData();
    await seedTutorRoadmap();
    return res;
  }

  if (!mongoUri) {
    logger.warn("MONGO_URI not set — running in degraded mode (DB unavailable)");
    return;
  }

  if (mongoUri.startsWith("mongodb+srv://") && process.platform === "win32") {
    dns.setServers(["8.8.8.8", "8.8.4.4"]);
    dns.setDefaultResultOrder("ipv4first");
  }

  try {
    const conn = await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 15000,
      maxPoolSize: 10,
      minPoolSize: 2,
    });
    isConnected = true;
    logger.info(`MongoDB Connected Successfully! : ${conn.connection.host}`);

    // Seed data if collections are empty
    try {
      if ((await QuestionBank.countDocuments()) === 0) {
        logger.info("QuestionBank is empty — seeding interview data...");
        await seedInterviewData();
      }
      if ((await JobPosting.countDocuments()) === 0) {
        logger.info("JobPosting is empty — seeding job data...");
        await seedJobData();
      }
    } catch (seedError) {
      logger.warn(`Seed error (non-fatal): ${seedError.message}`);
    }
  } catch (error) {
    logger.warn(`MongoDB Connection Error: ${error.message}`);
    logger.warn("Server will continue in degraded mode — DB-dependent features will return 503");
  }
};

mongoose.connection.on("disconnected", () => {
  isConnected = false;
  logger.warn("MongoDB disconnected — entering degraded mode");
});

mongoose.connection.on("reconnected", () => {
  isConnected = true;
  logger.info("MongoDB reconnected — restored full functionality");
});

export default connectDB;