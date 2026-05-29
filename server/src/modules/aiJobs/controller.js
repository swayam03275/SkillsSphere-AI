import asyncHandler from "../../utils/asyncHandler.js";
import AppError from "../../utils/AppError.js";
import { parseResume } from "../../utils/parseResume.js";
import * as resumeService from "../resumes/service.js";
import {
  enqueueAiJob,
  getAiJobForUser,
  formatJobResponse,
  AI_JOB_TYPES,
} from "./service.js";
import { isAsyncJobsEnabled } from "./constants.js";

const normalizeJobSkills = (rawSkills) => {
  if (rawSkills === undefined || rawSkills === null || rawSkills === "") {
    return [];
  }
  if (Array.isArray(rawSkills)) return rawSkills;
  if (typeof rawSkills !== "string") return null;
  try {
    const parsed = JSON.parse(rawSkills);
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
};

export const enqueueResumeAnalyze = asyncHandler(async (req, res, next) => {
  if (!isAsyncJobsEnabled()) {
    return next(
      new AppError("Async AI jobs are disabled. Use POST /api/resume/analyze.", 503)
    );
  }

  const file = req.file;
  if (!file) {
    return next(new AppError("Resume file is required", 400));
  }

  const jobSkills = normalizeJobSkills(req.body.jobSkills);
  if (jobSkills === null) {
    return next(new AppError("jobSkills must be a valid JSON array", 400));
  }

  const { job, reused } = await enqueueAiJob({
    userId: req.user._id,
    type: AI_JOB_TYPES.RESUME_ANALYZE,
    payload: {
      userId: req.user._id,
      file: {
        originalname: file.originalname,
        filename: file.filename,
        path: file.path,
        size: file.size,
        mimetype: file.mimetype,
      },
      jobDescription: req.body.jobDescription || "",
      jobSkills,
    },
    idempotencyKey: req.idempotencyKey,
  });

  res.status(reused ? 200 : 202).json({
    success: true,
    message: reused
      ? "Existing analysis job returned (idempotent)"
      : "Resume analysis queued",
    ...formatJobResponse(job),
  });
});

export const enqueueMatchingEvaluate = asyncHandler(async (req, res, next) => {
  if (!isAsyncJobsEnabled()) {
    return next(
      new AppError(
        "Async AI jobs are disabled. Use POST /api/matching/evaluate.",
        503
      )
    );
  }

  let resume;

  if (req.file) {
    const parsedData = await parseResume(req.file.path);
    resume = await resumeService.upsertResume(
      req.user._id,
      {
        ...parsedData,
        file: {
          originalName: req.file.originalname,
          storedName: req.file.filename,
          path: req.file.path,
          size: `${(req.file.size / 1024).toFixed(2)} KB`,
          mimeType: req.file.mimetype,
        },
      },
      true
    );
  } else {
    resume = await resumeService.getLatestResume(req.user._id, true);
    if (!resume) {
      return next(
        new AppError(
          "No resume found in your library. Please upload one to begin matching.",
          404
        )
      );
    }
  }

  const { job, reused } = await enqueueAiJob({
    userId: req.user._id,
    type: AI_JOB_TYPES.MATCHING_EVALUATE,
    payload: {
      userId: req.user._id,
      resumeId: resume._id.toString(),
    },
    idempotencyKey: req.idempotencyKey,
  });

  res.status(reused ? 200 : 202).json({
    success: true,
    message: reused
      ? "Existing matching job returned (idempotent)"
      : "Job matching evaluation queued",
    ...formatJobResponse(job),
  });
});

export const getJobStatus = asyncHandler(async (req, res) => {
  const job = await getAiJobForUser(req.params.jobId, req.user._id);

  res.status(200).json({
    success: true,
    ...formatJobResponse(job),
  });
});
