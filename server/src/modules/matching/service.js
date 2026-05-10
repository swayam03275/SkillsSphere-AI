import JobPosting from "../../database/models/JobPosting.js";
import MatchResult from "../../database/models/MatchResult.js";
import { runPipeline } from "../../../../ai-ml/pipeline/runPipeline.js";

/**
 * Evaluate a resume against all open jobs and return ranked recommendations.
 * 
 * @param {Object} user - The user object
 * @param {Object} resume - The parsed resume data (Mongoose document)
 * @returns {Promise<Object>} The saved MatchResult document
 */
export const evaluateMatches = async (user, resume) => {
  // 1. Fetch all open jobs
  const openJobs = await JobPosting.find({ status: "open" });

  const recommendations = [];

  // 2. Evaluate each job using the AI/ML pipeline (with controlled concurrency)
  const CONCURRENCY_LIMIT = 5;
  for (let i = 0; i < openJobs.length; i += CONCURRENCY_LIMIT) {
    const batch = openJobs.slice(i, i + CONCURRENCY_LIMIT);
    
    const batchResults = await Promise.all(
      batch.map(async (job) => {
        try {
          const pipelineResult = await runPipeline({
            resumeData: resume,
            jobSkills: job.skills,
            jobDescription: job.description,
          });

          return {
            job: job._id,
            score: pipelineResult.score,
            breakdown: pipelineResult.breakdown,
            skillMatch: pipelineResult.skillMatch,
            keywordMatch: pipelineResult.keywordMatch,
            experienceMatch: pipelineResult.experienceMatch,
          };
        } catch (err) {
          console.error(`Error evaluating job ${job._id}:`, err);
          return null;
        }
      })
    );

    for (const result of batchResults) {
      if (result) {
        recommendations.push(result);
      }
    }
  }

  // 3. Sort by score (highest first)
  recommendations.sort((a, b) => b.score - a.score);

  // 4. Persist MatchResult for analytics and retrieval
  const matchResult = await MatchResult.create({
    user: user._id,
    resume: resume._id,
    recommendations,
  });

  return matchResult;
};

/**
 * Fetch the latest ranked recommendations for a user.
 * 
 * @param {string} userId - The ID of the user
 * @returns {Promise<Object|null>} The latest MatchResult document with populated job details
 */
export const getLatestRecommendations = async (userId) => {
  return await MatchResult.findOne({ user: userId })
    .sort({ createdAt: -1 })
    .populate("recommendations.job")
    .lean();
};
