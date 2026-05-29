import crypto from "crypto";
import { runPipeline } from "../../../../ai-ml/pipeline/runPipeline.js";
import {
  normalizeResumeData,
  normalizePipelineResult,
} from "../../utils/normalizeResumeResponse.js";
import * as resumeService from "./service.js";
import AnalysisHistory from "../../database/models/AnalysisHistory.js";
import { verifyLinks } from "../../utils/linkVerifier.js";
import { parseResume } from "../../utils/parseResume.js";

const getHash = (text) =>
  crypto.createHash("sha256").update(text || "").digest("hex");

const buildLegacyBreakdown = (safePipeline, jobSkills, parsedData, jobDescription) => {
  const evaluatorBreakdown = [];
  if (jobSkills?.length > 0 && parsedData.skills?.length > 0) {
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

const trimAnalysisHistory = async (userId) => {
  const historyCount = await AnalysisHistory.countDocuments({ user: userId });
  if (historyCount <= 10) return;

  const surplus = historyCount - 10;
  const oldestRecords = await AnalysisHistory.find({ user: userId })
    .sort({ createdAt: 1 })
    .limit(surplus)
    .select("_id");

  if (oldestRecords.length > 0) {
    await AnalysisHistory.deleteMany({
      _id: { $in: oldestRecords.map((r) => r._id) },
    });
  }
};

const buildResponsePayload = (
  savedResume,
  safeData,
  safePipeline,
  verifiedLinks,
  evaluatorBreakdown,
  overallScore
) => {
  const { resumeText: _rt, ...dataWithoutText } = safeData;
  return {
    success: true,
    message: "Resume analyzed successfully",
    resumeId: savedResume._id,
    data: dataWithoutText,
    ...safePipeline,
    verifiedLinks,
    file: savedResume.file,
    evaluatorBreakdown,
    overallScore,
  };
};

/**
 * Runs full resume analysis (used by sync controller and async worker).
 */
export const runResumeAnalysis = async ({
  userId,
  file,
  jobDescription = "",
  jobSkills = [],
  onProgress,
}) => {
  const report = (percent, stage) => {
    if (onProgress) onProgress({ percent, stage });
  };

  report(5, "parsing_resume");
  const parsedData = await parseResume(file.path);

  const resumeText = parsedData.resumeText || "";
  const jdText = jobDescription || "";
  const resumeHash = getHash(resumeText);
  const jdHash = getHash(jdText);

  report(15, "checking_cache");
  const cachedAnalysis = await resumeService.findCachedAnalysis(resumeHash, jdHash);

  const fileMeta = {
    originalName: file.originalname,
    storedName: file.filename,
    path: file.path,
    size: `${(file.size / 1024).toFixed(2)} KB`,
    mimeType: file.mimetype,
  };

  if (cachedAnalysis) {
    const safePipeline = cachedAnalysis.details || {};
    const safeData = cachedAnalysis.meta?.safeData || {};
    const verifiedLinks = cachedAnalysis.meta?.verifiedLinks || [];
    const evaluatorBreakdown = buildLegacyBreakdown(
      safePipeline,
      jobSkills,
      parsedData,
      jobDescription
    );
    const overallScore = safePipeline.score || 0;

    const savedResume = await resumeService.upsertResume(userId, {
      ...safeData,
      ...safePipeline,
      jobSkills,
      jobDescription,
      mode: safePipeline.mode || "match",
      evaluatorBreakdown,
      aggregatedScore: overallScore,
      file: fileMeta,
    });

    await AnalysisHistory.create({
      user: userId,
      score: safePipeline.score || 0,
      classification: safePipeline.classification?.level || "Beginner",
      skills: safeData.skills || [],
      missingSkills: safePipeline.skillMatch?.missingSkills || [],
      suggestions: safePipeline.gapAnalysis?.suggestions || [],
      breakdown: safePipeline.breakdown || {},
      mode: safePipeline.mode || "match",
    });

    await trimAnalysisHistory(userId);
    report(100, "completed");

    return buildResponsePayload(
      savedResume,
      safeData,
      safePipeline,
      verifiedLinks,
      evaluatorBreakdown,
      overallScore
    );
  }

  report(30, "running_pipeline");
  const pipelineResult = await runPipeline({
    resumeData: parsedData,
    jobSkills,
    jobDescription,
  });

  report(70, "verifying_links");
  const linksToVerify = [
    parsedData.linkedin,
    parsedData.github,
    parsedData.portfolio,
  ].filter(Boolean);
  const verifiedLinks = await verifyLinks(linksToVerify);

  const safeData = normalizeResumeData(parsedData);
  const safePipeline = normalizePipelineResult(pipelineResult);
  const evaluatorBreakdown = buildLegacyBreakdown(
    safePipeline,
    jobSkills,
    parsedData,
    jobDescription
  );
  const overallScore = safePipeline.score || 0;

  report(85, "saving_results");
  const savedResume = await resumeService.upsertResume(userId, {
    ...safeData,
    ...safePipeline,
    jobSkills,
    jobDescription,
    mode: pipelineResult.mode || "match",
    evaluatorBreakdown,
    aggregatedScore: overallScore,
    file: fileMeta,
  });

  await AnalysisHistory.create({
    user: userId,
    score: safePipeline.score || 0,
    classification: safePipeline.classification?.level || "Beginner",
    skills: safeData.skills || [],
    missingSkills: safePipeline.skillMatch?.missingSkills || [],
    suggestions: safePipeline.gapAnalysis?.suggestions || [],
    breakdown: safePipeline.breakdown || {},
    mode: pipelineResult.mode || "match",
  });

  await resumeService.saveCachedAnalysis({
    resumeHash,
    jdHash,
    score: safePipeline.score || 0,
    similarity:
      pipelineResult.breakdown?.semanticMatch?.score || safePipeline.score || 0,
    summary:
      pipelineResult.breakdown?.semanticMatch?.summary ||
      "Analysis generated successfully",
    details: safePipeline,
    meta: { safeData, verifiedLinks },
  });

  await trimAnalysisHistory(userId);
  report(100, "completed");

  return buildResponsePayload(
    savedResume,
    safeData,
    safePipeline,
    verifiedLinks,
    evaluatorBreakdown,
    overallScore
  );
};
