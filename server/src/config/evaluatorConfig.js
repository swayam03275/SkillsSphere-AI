import logger from "../utils/logger.js";
const DEFAULTS = {
  toggles: {
    skillMatch: true,
    keywordMatch: true,
    experienceMatch: true,
  },
  weights: {
    skillMatch: 1.0,
    keywordMatch: 0.2,
    experienceMatch: 0.2,
  },
};

const toBoolean = (value, fallback) => {
  if (typeof value !== "string") return fallback;

  const normalized = value.trim().toLowerCase();
  if (["true", "1", "yes", "y", "on"].includes(normalized)) return true;
  if (["false", "0", "no", "n", "off"].includes(normalized)) return false;

  return fallback;
};

const toWeight = (value, fallback) => {
  if (typeof value !== "string") return fallback;

  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;

  const clamped = Math.min(Math.max(parsed, 0), 1);
  return Number.isFinite(clamped) ? clamped : fallback;
};

const buildConfig = () => {
  const toggles = {
    skillMatch: toBoolean(process.env.EVALUATOR_SKILL_MATCH_ENABLED, DEFAULTS.toggles.skillMatch),
    keywordMatch: toBoolean(process.env.EVALUATOR_KEYWORD_MATCH_ENABLED, DEFAULTS.toggles.keywordMatch),
    experienceMatch: toBoolean(
      process.env.EVALUATOR_EXPERIENCE_MATCH_ENABLED,
      DEFAULTS.toggles.experienceMatch,
    ),
  };

  const weights = {
    skillMatch: toWeight(process.env.EVALUATOR_SKILL_MATCH_WEIGHT, DEFAULTS.weights.skillMatch),
    keywordMatch: toWeight(process.env.EVALUATOR_KEYWORD_MATCH_WEIGHT, DEFAULTS.weights.keywordMatch),
    experienceMatch: toWeight(
      process.env.EVALUATOR_EXPERIENCE_MATCH_WEIGHT,
      DEFAULTS.weights.experienceMatch,
    ),
  };

  const allDisabled = !toggles.skillMatch && !toggles.keywordMatch && !toggles.experienceMatch;
  if (allDisabled) {
    toggles.skillMatch = DEFAULTS.toggles.skillMatch;
  }

  return {
    toggles,
    weights,
    defaults: DEFAULTS,
    fallbackApplied: allDisabled,
  };
};

let cachedConfig;

export const getEvaluatorConfig = () => {
  if (!cachedConfig) {
    cachedConfig = buildConfig();
  }

  return cachedConfig;
};

export const resetEvaluatorConfig = () => {
  cachedConfig = null;
};

export const logEvaluatorConfig = () => {
  const config = getEvaluatorConfig();
  if (process.env.NODE_ENV === "production") return;

  const fallbackNote = config.fallbackApplied
    ? " (fallback applied: at least one evaluator must remain enabled)"
    : "";

  logger.log("Evaluator config:");
  logger.log(`- toggles: ${JSON.stringify(config.toggles)}${fallbackNote}`);
  logger.log(`- weights: ${JSON.stringify(config.weights)}`);
};
