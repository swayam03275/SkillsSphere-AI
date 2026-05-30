import path from "path";
import fs from "fs";
const fsPromises = fs.promises;
import crypto from "crypto";
import { parseResume } from "../../utils/parseResume.js";
import Resume from "../../database/models/Resume.js";
import asyncHandler from "../../utils/asyncHandler.js";
import AppError from "../../utils/AppError.js";
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
  findCachedAnalysis: (resumeHash, jdHash) => resumeService.findCachedAnalysis(resumeHash, jdHash),
  saveCachedAnalysis: (cacheData) => resumeService.saveCachedAnalysis(cacheData),
  validateExtractedText: (text) => resumeService.validateExtractedText(text),
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

const getHash = (text) => {
  return crypto.createHash("sha256").update(text || "").digest("hex");
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

const buildLegacyBreakdown = (safePipeline, jobSkills, parsedData, jobDescription) => {
  const evaluatorBreakdown = [];
  if (jobSkills && jobSkills.length > 0 && parsedData.skills && parsedData.skills.length > 0) {
    evaluatorBreakdown.push({
      key: "skillMatch",
      label: "Skill Match",
      score: safePipeline.skillMatch?.score || 0,
      weight: safePipeline.skillMatch?.weight || 0,
      weightedScore: safePipeline.skillMatch?.weightedScore || 0,
      summary: safePipeline.skillMatch?.summary || "",
      details: safePipeline.skillMatch?.details || {},
      meta: safePipeline.skillMatch?.meta || {},
    });
  }
  if (jobDescription && parsedData.resumeText) {
    evaluatorBreakdown.push({
      key: "keywordMatch",
      label: "Keyword Match",
      score: safePipeline.keywordMatch?.score || 0,
      weight: safePipeline.keywordMatch?.weight || 0,
      weightedScore: safePipeline.keywordMatch?.weightedScore || 0,
      summary: safePipeline.keywordMatch?.summary || "",
      details: safePipeline.keywordMatch?.details || {},
      meta: safePipeline.keywordMatch?.meta || {},
    });
  }
  evaluatorBreakdown.push({
    key: "experienceMatch",
    label: "Experience Match",
    score: safePipeline.experienceMatch?.score || 0,
    weight: safePipeline.experienceMatch?.weight || 0,
    weightedScore: safePipeline.experienceMatch?.weightedScore || 0,
    summary: safePipeline.experienceMatch?.summary || "",
    details: safePipeline.experienceMatch?.details || {},
    meta: safePipeline.experienceMatch?.meta || {},
  });
  return evaluatorBreakdown;
};

export const uploadResume = asyncHandler(async (req, res, next) => {
  if (!req.file) {
    return next(new AppError("No file uploaded", 400));
  }

  const count = await Resume.countDocuments({ user: req.user._id });
  if (count >= 3) {
    return next(new AppError("Maximum limit of 3 resumes reached. Please delete an existing version to upload a new one.", 400));
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

  if (req.file?.path) {
    await fsPromises.unlink(req.file.path).catch(() => {});
  }
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

  const count = await Resume.countDocuments({ user: req.user._id });
  if (count >= 3) {
    return next(new AppError("Maximum limit of 3 resumes reached. Please delete an existing version to upload a new one.", 400));
  }

  console.time("ResumeAnalysis");
  console.time("ResumeParsing");
  const parsedData = await controllerDependencies.parseResume(file.path);
  console.timeEnd("ResumeParsing");

  const isScannedPdf = controllerDependencies.validateExtractedText(parsedData.resumeText || "");

  const jobSkills = normalizeJobSkills(req.body.jobSkills);
  if (jobSkills === null) {
    return next(new AppError("jobSkills must be a valid JSON array", 400));
  }

  // --- SEMANTIC CACHE LOOKUP ---
  const resumeText = parsedData.resumeText || "";
  const jdText = req.body.jobDescription || "";
  const resumeHash = getHash(resumeText);
  const jdHash = getHash(jdText);

  const cachedAnalysis = await controllerDependencies.findCachedAnalysis(resumeHash, jdHash);
  if (cachedAnalysis) {
    const safePipeline = cachedAnalysis.details || {};
    const safeData = cachedAnalysis.meta?.safeData || {};
    const verifiedLinks = cachedAnalysis.meta?.verifiedLinks || [];

    const evaluatorBreakdown = buildLegacyBreakdown(safePipeline, jobSkills, parsedData, req.body.jobDescription);
    const overallScore = safePipeline.score || 0;

    // Save to DB
    const savedResume = await controllerDependencies.upsertResume(req.user._id, {
      ...safeData,
      ...safePipeline,
      jobSkills,
      jobDescription: req.body.jobDescription,
      mode: safePipeline.mode || "match",
      evaluatorBreakdown,
      aggregatedScore: overallScore,
      isScannedPdf,
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
      mode: safePipeline.mode || "match",
    });

    // Clean up: Limit history to last 10 versions to prevent bloat
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

    const { resumeText: _rt, ...dataWithoutText } = safeData;
    return res.status(200).json({
      success: true,
      message: "Resume analyzed successfully",
      resumeId: savedResume._id,
      data: dataWithoutText,
      ...safePipeline,
      verifiedLinks,
      file: savedResume.file,
      evaluatorBreakdown,
      overallScore,
      isScannedPdf,
    });
  }

  // --- CACHE MISS: RUN PIPELINE ---
  // 🧠 RUN PIPELINE (ONLY LOGIC ENTRY)
  console.time("PipelineExecution");
  const pipelineResult = await runPipeline({
    resumeData: parsedData,
    jobSkills,
    jobDescription: req.body.jobDescription,
  });
  console.timeEnd("PipelineExecution");
  
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

  const evaluatorBreakdown = buildLegacyBreakdown(safePipeline, jobSkills, parsedData, req.body.jobDescription);
  const overallScore = safePipeline.score || 0;

  // Save to DB (optional)
  const savedResume = await controllerDependencies.upsertResume(req.user._id, {
    ...safeData,
    ...safePipeline,
    jobSkills,
    jobDescription: req.body.jobDescription,
    mode: pipelineResult.mode || "match",
    evaluatorBreakdown,
    aggregatedScore: overallScore,
    isScannedPdf,
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

  // Save to semantic cache for future requests
  await controllerDependencies.saveCachedAnalysis({
    resumeHash,
    jdHash,
    score: safePipeline.score || 0,
    similarity: pipelineResult.breakdown?.semanticMatch?.score || safePipeline.score || 0,
    summary: pipelineResult.breakdown?.semanticMatch?.summary || "Analysis generated successfully",
    details: safePipeline,
    meta: {
      safeData,
      verifiedLinks
    }
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

  const { resumeText: _rt, ...dataWithoutText } = safeData;
  return res.status(200).json({
    success: true,
    message: "Resume analyzed successfully",
    resumeId: savedResume._id,
    data: dataWithoutText,
    ...safePipeline,
    verifiedLinks,
    file: savedResume.file,
    evaluatorBreakdown,
    overallScore,
    isScannedPdf,
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

/**
 * List all resumes for the current logged-in student.
 */
export const listResumes = asyncHandler(async (req, res, next) => {
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 10));
  const skip = (page - 1) * limit;

  const [resumes, totalCount] = await Promise.all([
    Resume.find({ user: req.user._id })
      .select("-resumeText")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Resume.countDocuments({ user: req.user._id })
  ]);

  res.status(200).json({
    success: true,
    message: "Resumes listed successfully",
    totalCount,
    totalPages: Math.ceil(totalCount / limit),
    currentPage: page,
    data: resumes,
  });
});

/**
 * Set a specific resume as active and deactivate all others.
 */
export const setActiveResume = asyncHandler(async (req, res, next) => {
  const { id } = req.params;

  const resume = await Resume.findOne({ _id: id, user: req.user._id });
  if (!resume) {
    return next(new AppError("Resume not found or unauthorized", 404));
  }

  // Deactivate all others
  await Resume.updateMany({ user: req.user._id }, { isActive: false });

  // Activate this one
  resume.isActive = true;
  await resume.save();

  res.status(200).json({
    success: true,
    message: "Active resume updated successfully",
    data: resume,
  });
});

/**
 * Rename a specific resume.
 */
export const renameResume = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const { title } = req.body;

  if (!title || !title.trim()) {
    return next(new AppError("Title is required", 400));
  }

  const resume = await Resume.findOneAndUpdate(
    { _id: id, user: req.user._id },
    { title: title.trim() },
    { new: true, runValidators: true }
  ).select("-resumeText");

  if (!resume) {
    return next(new AppError("Resume not found or unauthorized", 404));
  }

  res.status(200).json({
    success: true,
    message: "Resume renamed successfully",
    data: resume,
  });
});

/**
 * Delete a specific resume.
 */
export const deleteResume = asyncHandler(async (req, res, next) => {
  const { id } = req.params;

  const resume = await Resume.findOne({ _id: id, user: req.user._id });
  if (!resume) {
    return next(new AppError("Resume not found or unauthorized", 404));
  }

  const wasActive = resume.isActive;
  await Resume.deleteOne({ _id: id });

  // If we deleted the active resume, activate the most recent fallback if available
  if (wasActive) {
    const nextActive = await Resume.findOne({ user: req.user._id }).sort({ createdAt: -1 });
    if (nextActive) {
      nextActive.isActive = true;
      await nextActive.save();
    }
  }

  res.status(200).json({
    success: true,
    message: "Resume deleted successfully",
  });
});

