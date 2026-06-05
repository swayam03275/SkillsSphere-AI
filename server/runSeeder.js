import dotenv from "dotenv";
dotenv.config();

import { seedJobData } from "./src/modules/jobs/seed/seedJobData.js";
import logger from "./src/utils/logger.js";
import { default as connectDB } from "./src/database/db.js";

const run = async () => {
  try {
    await connectDB();
    logger.log("Connected to MongoDB for seeding.");
    await seedJobData();
    process.exit(0);
  } catch (error) {
    logger.error("Seeding failed", error);
    process.exit(1);
  }
};
run();
