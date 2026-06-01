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


export async function runPipeline({
  resumeData,
  jobSkills = [],
  jobDescription = "",
}) {
  const _safeEval = (name, fn, fallback) => safeEval(name, fn, validateEvaluatorResult, fallback);

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

  // 🔥 RUN EVALUATORS IN PARALLEL
  const [
    skillMatch,
    keywordMatch,
    experienceMatch,
    semanticMatchResult,
    consistencyMatch,
    readabilityMatch,
    impactMatch,
    atsOptimization,
    techStandard
  ] = await Promise.all([
    // 🟢 Skill Match
    _safeEval("skillMatch", () =>
      skillEvaluator({
        resumeSkills: resumeData.skills || [],
        jobSkills: finalJobSkills,
      }),
    ),

    // 🟡 Keyword Match
    _safeEval("keywordMatch", () =>
      keywordEvaluator({
        resumeText,
        jobDescription: finalJobDescription,
        resumeSkills: resumeData.skills || [],
        jobSkills: finalJobSkills,
      }),
    ),

    // 🔵 Experience Match
    _safeEval("experienceMatch", () =>
      experienceEvaluator({
        candidateExperienceText: parseExperience(resumeData.experience),
        jobDescription: finalJobDescription,
      }),
    ),

    // 🌀 Semantic Match
    (async () => {
      const hasHFKey = !!process.env.HF_API_TOKEN;
      if (!isJDProvided) {
        return {
          score: null,
          name: "semanticMatch",
          message: "No job description provided",
        };
      } else if (!hasHFKey) {
        return {
          score: null,
          name: "semanticMatch",
          key: "semanticMatch",
          label: "Semantic Match",
          weight: 0,
          weightedScore: 0,
          summary: "Semantic evaluation skipped — no API key",
          details: {},
          meta: {},
        };
      } else {
        return await _safeEval("semanticMatch", () =>
          semanticEvaluator({
            resumeText,
            jobDescription,
          }),
        );
      }
    })(),

    // 🟣 Consistency Match
    _safeEval("consistencyMatch", () =>
      consistencyEvaluator({
        resumeText,
      }),
    ),

    // 🟠 Readability Match
    _safeEval("readabilityMatch", () =>
      readabilityEvaluator({
        resumeText,
      }),
    ),

    // 💥 Impact Match
    _safeEval("impactMatch", () =>
      impactEvaluator({
        resumeText,
      }),
    ),

    // 🏗️ ATS Optimization
    _safeEval("atsOptimization", () =>
      atsOptimizationEvaluator({
        resumeData,
      }),
    ),

    // 🏛️ Tech Standard
    _safeEval("techStandard", () =>
      techStandardEvaluator({
        resumeText,
      }),
    ),
  ]);

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
    techStandard
  );

  // 🧠 Aggregate
  const result = aggregateResults(evaluations, isJDProvided);
  if (!result) throw new Error("[runPipeline] aggregateResults returned empty");
  const { score, breakdown } = result;

  const failedEvaluators = evaluations
    .filter((e) => e.error)
    .map((e) => e.name);

  // 🎯 Gap Analysis
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

  // 🔥 Classification
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
    semanticRateLimited: semanticMatch?.meta?.rateLimited ?? false,
    semanticRetryAfter:  semanticMatch?.meta?.retryAfter  ?? null,
  };
}
