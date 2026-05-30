import dns from "node:dns";
import mongoose from "mongoose";

export let isConnected = false;

import { seedInterviewData } from "../modules/interviews/seed/seedInterviewData.js";

const connectDB = async () => {
  const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI;

  if (mongoUri === "memory") {
    const { MongoMemoryServer } = await import("mongodb-memory-server");
    const mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    console.log(`Started ephemeral Memory Database at: ${uri}`);
    process.env.MONGO_URI = uri;
    const res = await connectDB();
    console.log("Memory DB connected. Auto-seeding mock interview data...");
    await seedInterviewData();
    return res;
  }

  if (!mongoUri) {
    console.warn("MONGO_URI not set — running in degraded mode (DB unavailable)");
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
    console.log(`MongoDB Connected Successfully! : ${conn.connection.host}`);
  } catch (error) {
    console.warn(`MongoDB Connection Error: ${error.message}`);
    console.warn("Server will continue in degraded mode — DB-dependent features will return 503");
  }
};

mongoose.connection.on("disconnected", () => {
  isConnected = false;
  console.warn("MongoDB disconnected — entering degraded mode");
});

mongoose.connection.on("reconnected", () => {
  isConnected = true;
  console.log("MongoDB reconnected — restored full functionality");
});

export default connectDB;