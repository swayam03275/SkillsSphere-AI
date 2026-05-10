import { runPipeline } from "./runPipeline.js";

/**
 * AI-driven recommendation engine that matches a resume against a collection of jobs.
 * 
 * @param {Object} resumeData - The parsed resume data
 * @param {Array} jobs - List of job posting objects
 * @returns {Promise<Array>} Ranked job matches with scores and insights
 */
export async function generateRecommendations(resumeData, jobs = []) {
  if (!resumeData || jobs.length === 0) {
    return [];
  }

  // Process matches in parallel batches to optimize performance without exhausting resources
  const recommendations = [];
  const CONCURRENCY_LIMIT = 5;

  for (let i = 0; i < jobs.length; i += CONCURRENCY_LIMIT) {
    const batch = jobs.slice(i, i + CONCURRENCY_LIMIT);

    const batchResults = await Promise.all(
      batch.map(async (job) => {
        try {
          const result = await runPipeline({
            resumeData,
            jobSkills: job.skills || [],
            jobDescription: job.description || "",
          });

          return {
            jobId: job._id,
            score: result.score,
            breakdown: result.breakdown,
            skillMatch: result.skillMatch.score,
            experienceMatch: result.experienceMatch.score,
            relevanceInsights: result.gapAnalysis?.summary || "Good match based on your background.",
            matchLevel: result.classification?.label || "Potential Match"
          };
        } catch (err) {
          console.error(`[recommendationEngine] Error matching job ${job._id}:`, err);
          return { jobId: job._id, score: 0, error: true };
        }
      })
    );
    recommendations.push(...batchResults);
  }

  // Filter out errors and sort by score descending
  return recommendations
    .filter(rec => !rec.error)
    .sort((a, b) => b.score - a.score);
}
