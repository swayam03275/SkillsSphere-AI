import mongoose from "mongoose";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import dotenv from "dotenv";

// Load environment variables
dotenv.config({ path: join(dirname(fileURLToPath(import.meta.url)), "../../../../.env") });

// Import models
import QuestionBank from "../../../database/models/QuestionBank.js";
import ConceptGraph from "../../../database/models/ConceptGraph.js";

import logger from "../../../utils/logger.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export const seedInterviewData = async () => {
  try {
    // Load seed data from JSON files
    const questions = JSON.parse(
      readFileSync(join(__dirname, "questions.json"), "utf-8")
    );
    const conceptGraphs = JSON.parse(
      readFileSync(join(__dirname, "conceptGraphs.json"), "utf-8")
    );

    // Seed QuestionBank
    logger.info(`[seed] Seeding ${questions.length} questions...`);
    const existingQuestions = await QuestionBank.countDocuments();
    if (existingQuestions > 0) {
      logger.info(`[seed] QuestionBank already has ${existingQuestions} questions. Clearing...`);
      await QuestionBank.deleteMany({});
    }
    await QuestionBank.insertMany(questions);
    logger.info(`[seed] ✅ ${questions.length} questions seeded`);

    // Seed ConceptGraphs
    logger.info(`[seed] Seeding ${conceptGraphs.length} concept graphs...`);
    const existingGraphs = await ConceptGraph.countDocuments();
    if (existingGraphs > 0) {
      logger.info(`[seed] ConceptGraph already has ${existingGraphs} graphs. Clearing...`);
      await ConceptGraph.deleteMany({});
    }
    await ConceptGraph.insertMany(conceptGraphs);
    logger.info(`[seed] ✅ ${conceptGraphs.length} concept graphs seeded`);

    // Summary
    logger.info("\n[seed] === Seed Summary ===");
    const topicCounts = await QuestionBank.aggregate([
      { $group: { _id: "$topic", count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]);
    topicCounts.forEach(({ _id, count }) => {
      logger.info(`[seed]   ${_id}: ${count} questions`);
    });

    logger.info("[seed] Done! ✅");
  } catch (error) {
    logger.error("[seed] Error:", error.message);
  }
};

// Run if called directly
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const mongoUri = process.env.MONGO_URI;
  if (mongoUri) {
    mongoose.connect(mongoUri).then(() => seedInterviewData().then(() => process.exit(0)));
  }
}
