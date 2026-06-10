import User from "../../../database/models/User.js";
import LearningProgress from "../../../database/models/LearningProgress.js";
import logger from "../../../utils/logger.js";

export const seedTutorRoadmap = async () => {
  try {
    const tutor = await User.findOne({ role: "tutor" });
    if (!tutor) return;

    let student = await User.findOne({ email: "alex.mock@example.com" });
    if (!student) {
      student = await User.create({
        name: "Alex Demo Student",
        email: "alex.mock@example.com",
        password: "password123",
        role: "student"
      });
    }

    let progress = await LearningProgress.findOne({ user: student._id });
    if (!progress) {
      await LearningProgress.create({
        user: student._id,
        targetRole: "Full Stack Developer",
        tutorsTracking: [tutor._id],
        overallProgress: 33,
        roadmap: [
          {
            topicName: "Advanced React Context & Hooks",
            type: "learning",
            status: "completed",
            isVerified: true,
            resources: [
              { title: "React Dev Docs", url: "https://react.dev", type: "documentation" }
            ]
          },
          {
            topicName: "System Architecture Design",
            type: "learning",
            status: "in_progress",
            resources: []
          },
          {
            topicName: "Open Source Backend Contribution",
            type: "contribution",
            status: "not_started",
            resources: []
          }
        ]
      });
      logger.info("Seeded Tutor Roadmap with dummy student.");
    }
  } catch (error) {
    logger.warn(`Failed to seed tutor roadmap: ${error.message}`);
  }
};
