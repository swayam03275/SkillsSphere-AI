import path from "path";
import fs from "fs";
import { parseResume } from "../../utils/parseResume.js";
import Resume from "../../database/models/Resume.js";
import asyncHandler from "../../utils/asyncHandler.js";
import AppError from "../../utils/AppError.js";
import {
  experienceMatchEvaluator,
  keywordMatchEvaluator,
  skillMatchEvaluator,
  semanticMatchEvaluator,
} from "./evaluatorAdapters.js";
import { runPipeline } from "../../../../ai-ml/pipeline/runPipeline.js";
import {
  normalizeResumeData,
  normalizePipelineResult,
} from "../../utils/normalizeResumeResponse.js";
import * as resumeService from "./service.js";
import AnalysisHistory from "../../database/models/AnalysisHistory.js";
import { verifyLinks } from "../../utils/linkVerifier.js";
import { generateComparisonInsights } from "../../utils/aiComparison.js";
import { buildSignedFileUrl } from "../../utils/signedFileUrl.js";

const defaultDependencies = {
  parseResume,
  upsertResume: (userId, payload) => resumeService.upsertResume(userId, payload),
  AnalysisHistory,
};


let controllerDependencies = { ...defaultDependencies };

export const setResumeControllerDependencies = (overrides = {}) => {
  controllerDependencies = {
    ...defaultDependencies,
    ...overrides,
  };
};

export const resetResumeControllerDependencies = () => {
  controllerDependencies = { ...defaultDependencies };
};



const toLegacySemanticMatch = (pipelineResult) => {
  const result = pipelineResult.breakdown.semanticMatch;
  if (!result) return {};

  return {
    score: result.score,
    weight: result.weight,
    feedback: result.summary ? [result.summary] : [],
  };
};

export const uploadResume = asyncHandler(async (req, res, next) => {
  if (!req.file) {
    return next(new AppError("No file uploaded", 400));
  }

  // Build signed file URL for the uploaded resume
  const resumePath = `/api/files/resumes/${req.file.filename}`;
  const expiresAt = Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60); // 7 days from now
  const signedUrl = buildSignedFileUrl({ path: resumePath, expiresAt });
  
  res.status(200).json({
    success: true,
    message: "Resume uploaded successfully",
    file: {
      originalName: req.file.originalname,
      storedName: req.file.filename,
      path: signedUrl,
      size: `${(req.file.size / 1024).toFixed(2)} KB`,
      mimeType: req.file.mimetype,
    },
  });
});

const normalizeJobSkills = (rawSkills) => {
  if (rawSkills === undefined || rawSkills === null || rawSkills === "") {
    return [];
  }

  if (Array.isArray(rawSkills)) {
    return rawSkills;
  }

  if (typeof rawSkills !== "string") {
    return null;
  }

  try {
    const parsed = JSON.parse(rawSkills);
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
};

export const analyzeResume = asyncHandler(async (req, res, next) => {
  const file = req.file;

  if (!file) {
    return next(new AppError("Resume file is required", 400));
  }

  console.time("ResumeAnalysis");
  console.time("ResumeParsing");
  const parsedData = await controllerDependencies.parseResume(file.path);
  console.timeEnd("ResumeParsing");

  const jobSkills = normalizeJobSkills(req.body.jobSkills);
  if (jobSkills === null) {
    return next(new AppError("jobSkills must be a valid JSON array", 400));
  }
    // 🧠 RUN PIPELINE (ONLY LOGIC ENTRY)
  console.time("PipelineExecution");
  const pipelineResult = await runPipeline({
    resumeData: parsedData,
    jobSkills,
    jobDescription: req.body.jobDescription,
  });
  console.timeEnd("PipelineExecution");

  const evaluators = [];
  if (parsedData.skills?.length && jobSkills.length) {
    evaluators.push(skillMatchEvaluator);
  }
  if (req.body.jobDescription && parsedData.resumeText) {
    evaluators.push(keywordMatchEvaluator);
    evaluators.push(semanticMatchEvaluator);
  }
  evaluators.push(experienceMatchEvaluator);

  // 🔗 LINK VERIFICATION: Check if extracted links are alive
  console.time("LinkVerification");
  const linksToVerify = [
    parsedData.linkedin,
    parsedData.github,
    parsedData.portfolio
  ].filter(Boolean);
  const verifiedLinks = await verifyLinks(linksToVerify);
  console.timeEnd("LinkVerification");

  // 🔥 Normalize everything
  const safeData = normalizeResumeData(parsedData);
  const safePipeline = normalizePipelineResult(pipelineResult);

  // Save to DB (optional)
  const savedResume = await controllerDependencies.upsertResume(req.user._id, {
    ...safeData,
    ...safePipeline,
    jobSkills,
    jobDescription: req.body.jobDescription,
    mode: pipelineResult.mode || "match",
    file: {
      originalName: file.originalname,
      storedName: file.filename,
      path: file.path,
      size: `${(file.size / 1024).toFixed(2)} KB`,
      mimeType: file.mimetype,
    },
  });

  // Save Analysis History
  await AnalysisHistory.create({
    user: req.user._id,
    score: safePipeline.score || 0,
    classification: safePipeline.classification?.level || "Beginner",
    skills: safeData.skills || [],
    missingSkills: safePipeline.skillMatch?.missingSkills || [],
    suggestions: safePipeline.gapAnalysis?.suggestions || [],
    breakdown: safePipeline.breakdown || {},
    mode: pipelineResult.mode || "match",
  });

  // Clean up: Limit history to last 10 versions to prevent bloat (Optimized with direct deletion)
  const historyCount = await AnalysisHistory.countDocuments({ user: req.user._id });
  if (historyCount > 10) {
    const surplus = historyCount - 10;
    const oldestRecords = await AnalysisHistory.find({ user: req.user._id })
      .sort({ createdAt: 1 })
      .limit(surplus)
      .select("_id");

    if (oldestRecords.length > 0) {
      await AnalysisHistory.deleteMany({
        _id: { $in: oldestRecords.map(r => r._id) }
      });
    }
  }

  console.timeEnd("ResumeAnalysis");

  return res.status(200).json({
    success: true,
    message: "Resume analyzed successfully",
    resumeId: savedResume._id,
    data: safeData,
    ...safePipeline,
    verifiedLinks,
    file: savedResume.file,
  });
});

export const getResumeResult = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const resume = await Resume.findById(id).select("-resumeText").lean();

  if (!resume) {
    return next(new AppError("Resume not found", 404));
  }

  // Ensure the user owns this resume
  if (resume.user.toString() !== req.user._id.toString()) {
    return next(new AppError("You do not have permission to view this resume", 403));
  }

  res.status(200).json({
    success: true,
    message: "Resume details fetched successfully",
    data: resume,
  });
});

export const getLatestResume = asyncHandler(async (req, res, next) => {
  const resume = await resumeService.getLatestResume(req.user._id);

  if (!resume) {
    return next(new AppError("No resume found for this user", 404));
  }

  res.status(200).json({
    success: true,
    message: "Latest resume fetched successfully",
    data: resume,
  });
});

/**
 * Compare two analysis versions using AI
 */
export const compareVersions = asyncHandler(async (req, res, next) => {
  const { versionAId, versionBId } = req.body;

  if (!versionAId || !versionBId) {
    return next(new AppError("Two version IDs are required for comparison", 400));
  }

  const v1 = await AnalysisHistory.findById(versionAId).lean();
  const v2 = await AnalysisHistory.findById(versionBId).lean();

  if (!v1 || !v2) {
    return next(new AppError("One or both analysis versions not found", 404));
  }

  // Ensure both belong to the user
  if (v1.user.toString() !== req.user._id.toString() || v2.user.toString() !== req.user._id.toString()) {
    return next(new AppError("Unauthorized access to these records", 403));
  }

  const insights = await generateComparisonInsights(v1, v2);

  res.status(200).json({
    success: true,
    data: {
      v1,
      v2,
      insights
    }
  });
});

