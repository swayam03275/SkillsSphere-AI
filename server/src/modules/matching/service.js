import JobPosting from "../../database/models/JobPosting.js";
import MatchResult from "../../database/models/MatchResult.js";
import Notification from "../../database/models/Notification.js";
import User from "../../database/models/User.js";
import { runPipeline } from "../../../../ai-ml/pipeline/runPipeline.js";
import { getIO } from "../../utils/socketIO.js";
import mongoose from "mongoose";

import logger from "../../utils/logger.js";

/**
 * Evaluate a resume against all open jobs and return ranked recommendations.
 * 
 * @param {Object} user - The user object
 * @param {Object} resume - The parsed resume data (Mongoose document)
 * @returns {Promise<Object>} The saved MatchResult document
 */
export const evaluateMatches = async (user, resume, preFilteredJobs = null) => {
  // 1. Normalize candidate skills from resume
  const candidateSkills = (resume.skills || []).map(s => s.toLowerCase().trim());

  let openJobs;

  if (preFilteredJobs && Array.isArray(preFilteredJobs)) {
    openJobs = preFilteredJobs;
  } else {
    // 2. Query open jobs that share at least one skill with the candidate (limit to 100 at DB level)
    openJobs = await JobPosting.find({
      status: "open",
      skills: { $in: candidateSkills }
    }).limit(100);

    // Fallback: If no jobs match by skill, fetch the 10 most recent open jobs
    if (openJobs.length === 0) {
      openJobs = await JobPosting.find({ status: "open" })
        .sort({ createdAt: -1 })
        .limit(10);
    }
  }

  // Rank and limit open jobs to top 20 based on skill overlap count to prevent resource starvation
  const rankedJobs = openJobs.map(job => {
    const jobSkillsNormalized = (job.skills || []).map(s => s.toLowerCase().trim());
    const overlapCount = jobSkillsNormalized.filter(s => candidateSkills.includes(s)).length;
    return { job, overlapCount };
  });

  rankedJobs.sort((a, b) => b.overlapCount - a.overlapCount);
  openJobs = rankedJobs.slice(0, 10).map(item => item.job);

  // 3. Evaluate each pre-filtered job using the AI/ML pipeline in batches
  console.time(`Matching evaluation for ${openJobs.length} jobs`);
  const recommendations = [];
  const BATCH_SIZE = 5;

  for (let i = 0; i < openJobs.length; i += BATCH_SIZE) {
    const batch = openJobs.slice(i, i + BATCH_SIZE);
    const batchResults = await Promise.all(
      batch.map(async (job) => {
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
      })
    );
    recommendations.push(...batchResults);
  }
  console.timeEnd(`Matching evaluation for ${openJobs.length} jobs`);

  // 3. Sort by score (highest first)
  recommendations.sort((a, b) => b.score - a.score);

  // Cross-Role Notification System for Job Matching Skill Gaps
  // If a candidate matches poorly (< 60%), generate alerts for Tutors and Recruiters
  const io = getIO();
  
  try {
    const tutor = await User.findOne({ role: "tutor" }).sort({ createdAt: 1 });

    const notificationsToEmit = [];
    const notificationDocs = [];

    for (const rec of recommendations) {
      if (rec.score > 0 && rec.score < 60) {
        const jobFull = openJobs.find(j => j._id.toString() === rec.job.toString());
        
        if (jobFull) {
          if (jobFull.recruiter) {
            notificationDocs.push({
              userId: jobFull.recruiter,
              type: "skill_gap_alert",
              title: "Candidate Skill Gap Alert",
              message: `${user.name || "A candidate"} showed interest but has a skill gap for ${jobFull.title} (Score: ${rec.score}%).`,
              relatedData: { jobId: jobFull._id, studentId: user._id, score: rec.score }
            });
          }

          if (tutor) {
            notificationDocs.push({
              userId: tutor._id,
              type: "skill_gap_alert",
              title: "Student Needs Mentoring Intervention",
              message: `${user.name || "A student"} scored ${rec.score}% for ${jobFull.title}. They need guidance to bridge this gap.`,
              relatedData: { jobId: jobFull._id, studentId: user._id, score: rec.score }
            });
          }
        }
      }
    }

    if (notificationDocs.length > 0) {
      const createdNotifs = await Notification.insertMany(notificationDocs);
      createdNotifs.forEach(notif => {
        notificationsToEmit.push({ room: `user_${notif.userId}`, notif });
      });
    }

    // 4. Persist MatchResult for analytics and retrieval
    const matchResultDocs = await MatchResult.create([{
      user: user._id,
      resume: resume._id,
      recommendations,
    }]);
    const matchResult = matchResultDocs[0];

    // Now safe to emit socket events
    if (io) {
      for (const { room, notif } of notificationsToEmit) {
        io.to(room).emit("new-notification", notif);
      }
    }

    return matchResult;
  } catch (error) {
    logger.error("Error in evaluateMatches:", error);
    throw error;
  }
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

export const getDetailedMatchScore = async (jobId, resumeData) => {
  const job = await JobPosting.findById(jobId).lean();
  if (!job) {
    throw new AppError("Job not found", 404);
  }

  const resumeSkills = (resumeData.skills || []).map(s => s.toLowerCase().trim());
  const jobSkills = (job.skills || []).map(s => s.toLowerCase().trim());

  const matchingSkills = jobSkills.filter(s => resumeSkills.includes(s));
  const missingSkills = jobSkills.filter(s => !resumeSkills.includes(s));
  const matchScore = jobSkills.length > 0
    ? Math.round((matchingSkills.length / jobSkills.length) * 100)
    : 0;

  return { matchScore, matchingSkills, missingSkills };
};

const matchingService = {
  evaluateMatches,
  getLatestRecommendations,
  getDetailedMatchScore
};

export default matchingService;
