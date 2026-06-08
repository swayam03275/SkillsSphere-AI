import { atsOptimizationEvaluator } from "../evaluators/atsOptimizationEvaluator.js";
import consistencyEvaluator from "../evaluators/consistencyEvaluator.js";
import { experienceEvaluator } from "../evaluators/experienceEvaluator.js";
import { impactEvaluator } from "../evaluators/impactEvaluator.js";
import { keywordEvaluator } from "../evaluators/keywordEvaluator.js";
import readabilityEvaluator from "../evaluators/readabilityEvaluator.js";
import { skillEvaluator } from "../evaluators/skillEvaluator.js";
import { techStandardEvaluator } from "../evaluators/techStandardEvaluator.js";
import { semanticEvaluator } from "../evaluators/semanticEvaluator.js";
import gapAnalyzer from "../utils/gapAnalyzer.js";
import { classifyResume } from "../utils/resumeClassifier.js";
import { aggregateResults } from "./aggregator.js";
import { validateEvaluatorResult } from "./evaluatorContract.js";
import safeEval from "./safeEval.js";
import logger from "../utils/logger.js";
import { extractSkillsFromText } from "../utils/skillNormalizer.js";
import techKeywords from "../config/keywords.js";
import { getBenchmarkForRole } from "../config/benchmarks.js";
import {
  withTimeout,
  TimeoutError,
  getEvaluatorTimeoutMs,
  getPipelineTimeoutMs,
} from "./withTimeout.js";

/**
 * @file runPipeline.js
 * @description Core resume evaluation pipeline.
 *
 * Runs all evaluators in parallel with individual per-evaluator deadlines
 * and a global pipeline deadline. Any evaluator that exceeds its deadline
 * is replaced with a safe fallback result — the pipeline continues in
 * degraded mode rather than hanging indefinitely.
 *
 * Timeout configuration (via environment variables):
 *   EVALUATOR_TIMEOUT_MS  — per-evaluator deadline (default: 10 000 ms)
 *   PIPELINE_TIMEOUT_MS   — global pipeline deadline (default: 30 000 ms)
 *
 * The semantic evaluator (HuggingFace HTTP call) is the most likely to be
 * slow and gets the same deadline as all other evaluators. If it times out,
 * the pipeline continues without semantic scoring.
 */

export async function runPipeline({
  resumeData,
  jobSkills = [],
  jobDescription = "",
}) {
  const pipelineStart = Date.now();
  const evaluatorTimeoutMs = getEvaluatorTimeoutMs();
  const pipelineTimeoutMs = getPipelineTimeoutMs();

  // Wrap safeEval + withTimeout so every evaluator has both:
  //   1. A contract validator (safeEval catches runtime errors & shape violations)
  //   2. A hard per-evaluator deadline (withTimeout rejects if it takes too long)
  //
  // The order matters: withTimeout wraps the safeEval promise so that even if
  // safeEval itself hangs (e.g., awaiting a never-resolving promise), the outer
  // timeout still fires and the pipeline can continue.
  const _safeEval = (name, fn) =>
    withTimeout(
      safeEval(name, fn, validateEvaluatorResult),
      evaluatorTimeoutMs,
      name,
    ).catch((err) => {
      // withTimeout rejects with TimeoutError if the entire safeEval hangs.
      // safeEval itself already handles internal errors — this catch is only
      // reached if withTimeout fires before safeEval even returns a fallback.
      if (err instanceof TimeoutError) {
        logger.warn(
          `[runPipeline] Evaluator "${name}" timed out at pipeline level ` +
          `after ${evaluatorTimeoutMs}ms — substituting degraded fallback.`
        );
      } else {
        logger.error(`[runPipeline] Unexpected error from evaluator "${name}":`, err?.message);
      }
      return {
        score: 0,
        key: name,
        label: name,
        name,
        weight: 0,
        weightedScore: 0,
        error: true,
        timedOut: err instanceof TimeoutError,
        summary: err instanceof TimeoutError
          ? `Evaluator timed out after ${evaluatorTimeoutMs}ms.`
          : "Evaluator failed to run.",
        details: {},
        meta: {},
      };
    });

  function parseExperience(experience = []) {
    return experience
      .map((entry) => {
        if (typeof entry === "string") return entry;
        if (typeof entry === "object" && entry !== null) {
          return [entry.title, entry.company, entry.duration, entry.description]
            .filter(Boolean)
            .join(" ");
        }
        return "";
      })
      .join("\n");
  }

  const isJDProvided = !!(jobDescription && jobDescription.trim().length > 0);

  let finalJobSkills = jobSkills;
  let finalJobDescription = jobDescription;
  let mode = isJDProvided ? "match" : "benchmark";

  if (isJDProvided && (!jobSkills || jobSkills.length === 0)) {
    const allKeywords = Object.values(techKeywords).flat();
    finalJobSkills = extractSkillsFromText(jobDescription, allKeywords);
  } else if (!isJDProvided) {
    const detectedField = resumeData.classification?.field || "full stack developer";
    finalJobSkills = getBenchmarkForRole(detectedField);
    finalJobDescription = `A standard role for ${detectedField} requiring skills like ${finalJobSkills.join(", ")}.`;
  }

  const evaluations = [];
  const resumeText = resumeData.resumeText || "";

  logger.debug(
    `[runPipeline] Starting pipeline — mode=${mode}, ` +
    `evaluatorTimeout=${evaluatorTimeoutMs}ms, pipelineTimeout=${pipelineTimeoutMs}ms`
  );

  // ─── Build the parallel evaluator work ────────────────────────────────────
  // All 9 evaluators run concurrently. Each is individually guarded by
  // withTimeout so a single slow evaluator cannot block the others.
  const evaluatorWork = Promise.all([
    // ── Skill Match ─────────────────────────────────────────────────────────
    _safeEval("skillMatch", () =>
      skillEvaluator({
        resumeSkills: resumeData.skills || [],
        jobSkills: finalJobSkills,
      }),
    ),

    // ── Keyword Match ────────────────────────────────────────────────────────
    _safeEval("keywordMatch", () =>
      keywordEvaluator({
        resumeText,
        jobDescription: finalJobDescription,
        resumeSkills: resumeData.skills || [],
        jobSkills: finalJobSkills,
      }),
    ),

    // ── Experience Match ─────────────────────────────────────────────────────
    _safeEval("experienceMatch", () =>
      experienceEvaluator({
        candidateExperienceText: parseExperience(resumeData.experience),
        jobDescription: finalJobDescription,
      }),
    ),

    // ── Semantic Match ───────────────────────────────────────────────────────
    // This evaluator makes an external HTTP call to HuggingFace and is the
    // most likely to be slow or rate-limited. It is skipped entirely when
    // no job description is provided or no API key is configured —
    // withTimeout still applies when it does run.
    (async () => {
      const hasHFKey = !!process.env.HF_API_TOKEN;

      if (!isJDProvided) {
        return {
          score: null,
          name: "semanticMatch",
          message: "No job description provided — semantic match skipped",
        };
      }

      if (!hasHFKey) {
        return {
          score: null,
          name: "semanticMatch",
          key: "semanticMatch",
          label: "Semantic Match",
          weight: 0,
          weightedScore: 0,
          summary: "Semantic evaluation skipped — HF_API_TOKEN not configured",
          details: {},
          meta: {},
        };
      }

      // HuggingFace call — most likely to be slow. withTimeout is applied
      // inside _safeEval so it gets the same deadline as every other evaluator.
      return _safeEval("semanticMatch", () =>
        semanticEvaluator({
          resumeText,
          jobDescription,
        }),
      );
    })(),

    // ── Consistency Match ────────────────────────────────────────────────────
    _safeEval("consistencyMatch", () =>
      consistencyEvaluator({ resumeText }),
    ),

    // ── Readability Match ────────────────────────────────────────────────────
    _safeEval("readabilityMatch", () =>
      readabilityEvaluator({ resumeText }),
    ),

    // ── Impact Match ─────────────────────────────────────────────────────────
    _safeEval("impactMatch", () =>
      impactEvaluator({ resumeText }),
    ),

    // ── ATS Optimization ─────────────────────────────────────────────────────
    _safeEval("atsOptimization", () =>
      atsOptimizationEvaluator({ resumeData }),
    ),

    // ── Tech Standard ────────────────────────────────────────────────────────
    _safeEval("techStandard", () =>
      techStandardEvaluator({ resumeText }),
    ),
  ]);

  // ─── Global pipeline deadline ─────────────────────────────────────────────
  // Even if individual evaluators have their own timeouts, a global deadline
  // guards against edge cases (e.g., withTimeout itself hanging, or a
  // combination of slow evaluators chaining together).
  let globalTimeoutId;
  const globalTimeout = new Promise((_resolve, reject) => {
    globalTimeoutId = setTimeout(() => {
      reject(
        new TimeoutError("global_pipeline", pipelineTimeoutMs)
      );
    }, pipelineTimeoutMs);
  });

  let results;
  try {
    results = await Promise.race([evaluatorWork, globalTimeout]);
  } catch (err) {
    const elapsed = Date.now() - pipelineStart;
    if (err instanceof TimeoutError && err.evaluatorName === "global_pipeline") {
      logger.error(
        `[runPipeline] GLOBAL TIMEOUT: Pipeline did not complete within ` +
        `${pipelineTimeoutMs}ms (elapsed: ${elapsed}ms). ` +
        `Increase PIPELINE_TIMEOUT_MS or investigate slow evaluators.`
      );
      // Re-throw so the calling controller can return a 503 / degraded response
      // rather than silently returning an empty/zero score to the user.
      throw new Error(
        `Resume analysis timed out. The evaluation service is currently slow. ` +
        `Please try again in a few moments.`
      );
    }
    throw err;
  } finally {
    clearTimeout(globalTimeoutId);
  }

  const [
    skillMatch,
    keywordMatch,
    experienceMatch,
    semanticMatchResult,
    consistencyMatch,
    readabilityMatch,
    impactMatch,
    atsOptimization,
    techStandard,
  ] = results;

  const semanticMatch = semanticMatchResult;

  evaluations.push(
    skillMatch,
    keywordMatch,
    experienceMatch,
    semanticMatch,
    { ...consistencyMatch, name: "consistencyMatch" },
    { ...readabilityMatch, name: "readabilityMatch" },
    impactMatch,
    atsOptimization,
    techStandard,
  );

  // ── Aggregate ──────────────────────────────────────────────────────────────
  const result = aggregateResults(evaluations, isJDProvided);
  if (!result) throw new Error("[runPipeline] aggregateResults returned empty");
  const { score, breakdown } = result;

  const failedEvaluators = evaluations
    .filter((e) => e?.error)
    .map((e) => e.name);

  const timedOutEvaluators = evaluations
    .filter((e) => e?.timedOut)
    .map((e) => e.name);

  const elapsed = Date.now() - pipelineStart;

  // Log a summary so operators can track pipeline performance over time.
  if (timedOutEvaluators.length > 0) {
    logger.warn(
      `[runPipeline] Completed in ${elapsed}ms with ${timedOutEvaluators.length} timed-out ` +
      `evaluator(s): [${timedOutEvaluators.join(", ")}]`
    );
  } else if (failedEvaluators.length > 0) {
    logger.warn(
      `[runPipeline] Completed in ${elapsed}ms with ${failedEvaluators.length} failed ` +
      `evaluator(s): [${failedEvaluators.join(", ")}]`
    );
  } else {
    logger.debug(`[runPipeline] Completed successfully in ${elapsed}ms`);
  }

  // ── Gap Analysis ───────────────────────────────────────────────────────────
  const gapAnalysis = gapAnalyzer({
    skillMatch,
    keywordMatch,
    experienceMatch,
    consistencyMatch,
    readabilityMatch,
    impactMatch,
    atsOptimization,
    techStandard,
    resumeText,
    isJDProvided,
  });

  // ── Classification ─────────────────────────────────────────────────────────
  const classification = classifyResume({
    score,
    skillMatch,
    experienceMatch,
  });

  return {
    score,
    breakdown,
    degraded: failedEvaluators.length > 0,
    failedEvaluators,
    timedOutEvaluators,
    skillMatch,
    keywordMatch,
    experienceMatch,
    semanticMatch,
    consistencyMatch,
    readabilityMatch,
    impactMatch,
    atsOptimization,
    techStandard,
    gapAnalysis,
    classification,
    isJDProvided,
    mode,
    pipelineDurationMs: elapsed,
    semanticRateLimited: semanticMatch?.meta?.rateLimited ?? false,
    semanticRetryAfter:  semanticMatch?.meta?.retryAfter  ?? null,
  };
}
