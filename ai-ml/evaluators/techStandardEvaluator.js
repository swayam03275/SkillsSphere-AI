import techKeywords from "../config/keywords.js";
import { normalizeSkillArray } from "../utils/skillNormalizer.js";

// --- Skill alias map for raw-text matching ---
const SKILL_ALIASES = {
  nodejs: ["node.js", "node js", "nodejs"],
  csharp: ["c#", "c sharp"],
  cpp: ["c++", "cplusplus"],
  dotnet: [".net", "dotnet"],
  postgresql: ["postgres", "postgresql", "pg"],
  mongodb: ["mongo", "mongodb"],
  kubernetes: ["k8s", "kubernetes"],
  googlecloud: ["gcp", "google cloud"],
};

function matchesAlias(skill, text) {
  const aliases = SKILL_ALIASES[skill] ?? [skill];
  return aliases.some((alias) => text.includes(alias));
}

// --- Compute domain coverage ratio ---
function domainCoverage(matches, total) {
  if (total === 0) return 0;
  return parseFloat((matches / total).toFixed(2));
}

// --- Classify domain proficiency ---
function classifyProficiency(coverage) {
  if (coverage >= 0.7) return "expert";
  if (coverage >= 0.4) return "proficient";
  if (coverage > 0) return "beginner";
  return "none";
}

export const techStandardEvaluator = ({ resumeText = "" }) => {
  const lowerText = resumeText.toLowerCase();
  const domainMatches = {};
  const domainMissing = {};
  const domainCoverageMap = {};
  const domainProficiency = {};

  Object.keys(techKeywords).forEach((domain) => {
    const normDomainKeywords = normalizeSkillArray(techKeywords[domain]);

    const matches = normDomainKeywords.filter(
      (skill) => lowerText.includes(skill) || matchesAlias(skill, lowerText)
    );

    const missing = normDomainKeywords.filter((skill) => !matches.includes(skill));
    const coverage = domainCoverage(matches.length, normDomainKeywords.length);
    const proficiency = classifyProficiency(coverage);

    domainMatches[domain] = matches;
    domainMissing[domain] = missing;
    domainCoverageMap[domain] = coverage;
    domainProficiency[domain] = proficiency;
  });

  const feedback = [];
  const suggestions = [];

  const domainsWithMatches = Object.keys(domainMatches).filter(
    (d) => domainMatches[d].length > 0
  );

  const expertDomains = Object.keys(domainProficiency).filter(
    (d) => domainProficiency[d] === "expert"
  );

  const proficientDomains = Object.keys(domainProficiency).filter(
    (d) => domainProficiency[d] === "proficient"
  );

  // --- Weighted score ---
  // Expert domain = 25pts, Proficient = 15pts, Beginner = 5pts, capped at 100
  let score = 0;
  Object.keys(domainProficiency).forEach((d) => {
    if (domainProficiency[d] === "expert") score += 25;
    else if (domainProficiency[d] === "proficient") score += 15;
    else if (domainProficiency[d] === "beginner") score += 5;
  });
  score = Math.min(100, score);

  // --- Feedback ---
  if (expertDomains.length >= 2) {
    feedback.push(`Expert-level proficiency detected in: ${expertDomains.join(", ")}.`);
  } else if (domainsWithMatches.length >= 3) {
    feedback.push("Strong multi-domain technical profile detected.");
  } else if (domainsWithMatches.length === 2) {
    feedback.push(
      "Solid technical profile — consider broader domain exposure (e.g., Cloud/DevOps)."
    );
  } else if (domainsWithMatches.length === 1) {
    feedback.push(
      `Specialized in ${domainsWithMatches[0]} — consider adding cross-functional skills.`
    );
  } else {
    feedback.push(
      "Limited technical keywords found. Ensure your core stack is explicitly mentioned."
    );
  }

  // --- Per-domain missing skill hints (top 3 per domain) ---
  Object.keys(domainMissing).forEach((domain) => {
    if (
      domainMatches[domain].length > 0 &&
      domainMissing[domain].length > 0 &&
      domainProficiency[domain] !== "expert"
    ) {
      const top3 = domainMissing[domain].slice(0, 3);
      suggestions.push(
        `To strengthen ${domain} proficiency, consider adding: ${top3.join(", ")}.`
      );
    }
  });

  // --- Cross-domain suggestions ---
  if (
    domainMatches.frontend?.length > 0 &&
    domainMatches.backend?.length === 0
  ) {
    suggestions.push(
      "As a Frontend dev, consider learning basic Backend (Node.js/SQL) to become Fullstack."
    );
  }

  if (
    (domainMatches.frontend?.length > 0 || domainMatches.backend?.length > 0) &&
    domainMatches.cloud?.length === 0 &&
    domainMatches.devops?.length === 0
  ) {
    suggestions.push(
      "Add Cloud/DevOps skills (Docker, AWS) to demonstrate modern deployment knowledge."
    );
  }

  if (
    domainsWithMatches.length >= 2 &&
    domainMatches.testing?.length === 0
  ) {
    suggestions.push(
      "No testing skills detected — add Jest, Cypress, or Pytest to strengthen code quality signal."
    );
  }

  const summary =
    score >= 80
      ? "Well-rounded technical profile with expert-level domain coverage."
      : score >= 50
      ? "Solid technical profile — a few domain gaps to address."
      : score >= 25
      ? "Narrow technical focus — consider broadening your stack."
      : "Limited technical keywords found — explicitly list your core stack.";

  return {
    key: "tech_standard",
    label: "Technical Breadth",
    score,
    summary,
    details: {
      domainMatches,
      domainMissing,
      domainCoverage: domainCoverageMap,
      domainProficiency,
      feedback,
      suggestions,
    },
    meta: {
      domainsDetected: domainsWithMatches.length,
      expertDomains,
      proficientDomains,
    },
  };
};