export const AI_JOB_TYPES = {
  RESUME_ANALYZE: "RESUME_ANALYZE",
  MATCHING_EVALUATE: "MATCHING_EVALUATE",
};

export const AI_QUEUE_NAME = "skillsphere-ai-jobs";

export const isAsyncJobsEnabled = () =>
  String(process.env.AI_JOBS_ASYNC || "true").toLowerCase() === "true";
