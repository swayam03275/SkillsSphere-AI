import AiJob from "../../database/models/AiJob.js";
import User from "../../database/models/User.js";
import Resume from "../../database/models/Resume.js";
import { runResumeAnalysis } from "../resumes/analyzeRunner.js";
import * as matchingService from "../matching/service.js";
import { AI_JOB_TYPES } from "./constants.js";

export const updateJobProgress = async (aiJobId, percent, stage) => {
  await AiJob.findByIdAndUpdate(aiJobId, {
    progress: { percent, stage },
    ...(percent > 0 && percent < 100 ? { status: "active" } : {}),
  });
};

export const processResumeAnalyzeJob = async (aiJobRecord, bullJob) => {
  const { userId, file } = aiJobRecord.payload;

  await AiJob.findByIdAndUpdate(aiJobRecord._id, { status: "active" });

  const result = await runResumeAnalysis({
    userId,
    file,
    jobDescription: aiJobRecord.payload.jobDescription || "",
    jobSkills: aiJobRecord.payload.jobSkills || [],
    onProgress: async ({ percent, stage }) => {
      await bullJob.updateProgress({ percent, stage });
      await updateJobProgress(aiJobRecord._id, percent, stage);
    },
  });

  await AiJob.findByIdAndUpdate(aiJobRecord._id, {
    status: "completed",
    progress: { percent: 100, stage: "completed" },
    result,
  });

  return result;
};

export const processMatchingEvaluateJob = async (aiJobRecord, bullJob) => {
  const { userId, resumeId } = aiJobRecord.payload;

  await AiJob.findByIdAndUpdate(aiJobRecord._id, { status: "active" });

  const user = await User.findById(userId);
  if (!user) {
    throw new Error("User not found for matching job");
  }

  const resume = await Resume.findOne({ _id: resumeId, user: userId }).select(
    "+resumeText"
  );
  if (!resume) {
    throw new Error("Resume not found for matching job");
  }

  await bullJob.updateProgress({ percent: 10, stage: "loading_resume" });
  await updateJobProgress(aiJobRecord._id, 10, "loading_resume");

  const resumeWithText = resume.toObject();

  await bullJob.updateProgress({ percent: 20, stage: "evaluating_matches" });
  await updateJobProgress(aiJobRecord._id, 20, "evaluating_matches");

  const matchResult = await matchingService.evaluateMatches(user, resumeWithText);

  const response = {
    success: true,
    message: "Job matching evaluation completed successfully",
    data: matchResult,
  };

  await AiJob.findByIdAndUpdate(aiJobRecord._id, {
    status: "completed",
    progress: { percent: 100, stage: "completed" },
    result: response,
  });

  return response;
};

export const dispatchAiJob = async (aiJobRecord, bullJob) => {
  switch (aiJobRecord.type) {
    case AI_JOB_TYPES.RESUME_ANALYZE:
      return processResumeAnalyzeJob(aiJobRecord, bullJob);
    case AI_JOB_TYPES.MATCHING_EVALUATE:
      return processMatchingEvaluateJob(aiJobRecord, bullJob);
    default:
      throw new Error(`Unknown AI job type: ${aiJobRecord.type}`);
  }
};
