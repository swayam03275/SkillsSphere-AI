import { normalizeSkillArray } from "../utils/skillNormalizer.js";

// --- Skill category weights ---
const SKILL_WEIGHTS = {
  core: 1.0,
  framework: 0.85,
  tool: 0.7,
  soft: 0.5,
  default: 0.75,
};

// --- Assign weight based on skill category hint ---
function getSkillWeight(skill) {
  const frameworks = ["react", "angular", "vue", "next", "express", "django", "spring", "laravel"];
  const tools = ["git", "docker", "kubernetes", "jenkins", "webpack", "vite", "figma", "jira"];
  const soft = ["communication", "leadership", "teamwork", "problem solving", "time management"];

  if (soft.some((s) => skill.includes(s))) return SKILL_WEIGHTS.soft;
  if (frameworks.some((f) => skill.includes(f))) return SKILL_WEIGHTS.framework;
  if (tools.some((t) => skill.includes(t))) return SKILL_WEIGHTS.tool;
  return SKILL_WEIGHTS.default;
}

// --- Fuzzy match: checks partial overlap for compound skills ---
function fuzzyMatch(resumeSkill, jobSkill) {
  if (resumeSkill === jobSkill) return true;

  // "node" matches "node.js", "reactjs" matches "react"
  const clean = (s) => s.replace(/\.js$|js$/i, "").trim();
  if (clean(resumeSkill) === clean(jobSkill)) return true;

  // Partial containment for compound skills ("aws lambda" vs "aws")
  if (resumeSkill.includes(jobSkill) || jobSkill.includes(resumeSkill)) return true;

  return false;
}

// --- Weighted score computation ---
function computeWeightedScore(matchedSkills, normJob) {
  const totalWeight = normJob.reduce((sum, s) => sum + getSkillWeight(s), 0);
  const matchedWeight = matchedSkills.reduce((sum, s) => sum + getSkillWeight(s), 0);
  return totalWeight === 0 ? 0 : Math.round((matchedWeight / totalWeight) * 100);
}

export const skillEvaluator = ({ resumeSkills = [], jobSkills = [] }) => {
  const normResume = normalizeSkillArray(resumeSkills);
  const normJob = normalizeSkillArray(jobSkills);

  if (jobSkills.length === 0 || normJob.length === 0) {
    return {
      key: "skill_match",
      label: "Skill Match",
      score: 0,
      summary: "No job skills provided for comparison",
      details: {
        feedback: ["No job skills provided for comparison"],
        matchedSkills: [],
        missingSkills: [],
        extraSkills: normResume,
      },
      meta: {
        jobSkillCount: 0,
        resumeSkillCount: normResume.length,
        isWeighted: false,
      },
    };
  }

  // --- Fuzzy matched skills ---
  const matched = normJob.filter((jobSkill) =>
    normResume.some((resumeSkill) => fuzzyMatch(resumeSkill, jobSkill))
  );

  const missing = normJob.filter(
    (jobSkill) => !normResume.some((resumeSkill) => fuzzyMatch(resumeSkill, jobSkill))
  );

  const extra = normResume.filter(
    (resumeSkill) => !normJob.some((jobSkill) => fuzzyMatch(resumeSkill, jobSkill))
  );

  // --- Weighted score ---
  const score = computeWeightedScore(matched, normJob);

  // --- Coverage tiers for feedback ---
  const coverageRatio = matched.length / normJob.length;

  const feedback = [];
  if (matched.length > 0)
    feedback.push(`Matched ${matched.length}/${normJob.length} required skills.`);
  if (coverageRatio >= 0.8)
    feedback.push("Strong skill alignment with the job requirements.");
  else if (coverageRatio >= 0.5)
    feedback.push("Moderate skill overlap — consider upskilling in missing areas.");
  else
    feedback.push("Low skill overlap — significant gaps compared to job requirements.");
  if (missing.length > 0)
    feedback.push(
      `Key missing skills: ${missing.slice(0, 3).join(", ")}${missing.length > 3 ? ` and ${missing.length - 3} more` : ""}`
    );
  if (extra.length > 0)
    feedback.push("Resume has additional skills not listed in job requirements — consider tailoring.");

  return {
    key: "skill_match",
    label: "Skill Match",
    score,
    summary:
      matched.length > 0
        ? `Matched ${matched.length} of ${normJob.length} required skills (weighted score: ${score}%).`
        : "No matching skills found for this position.",
    details: {
      matchedSkills: matched,
      missingSkills: missing,
      extraSkills: extra,
      feedback,
    },
    meta: {
      jobSkillCount: normJob.length,
      resumeSkillCount: normResume.length,
      matchedCount: matched.length,
      coverageRatio: parseFloat(coverageRatio.toFixed(2)),
      isWeighted: true,
    },
  };
};