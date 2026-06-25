/**
 * Generates deterministic strategic insights by comparing two resume versions.
 * No LLM/AI required - follows rule-based logic.
 */
export const generateComparisonInsights = (v1, v2) => {
  const scoreDiff = v2.score - v1.score;
  const oldSkills = new Set(v1.skills || []);
  const newSkills = new Set(v2.skills || []);
  const addedSkills = [...newSkills].filter(s => !oldSkills.has(s));
  
  const oldGaps = new Set(v1.missingSkills || []);
  const newGaps = new Set(v2.missingSkills || []);
  const resolvedGaps = [...oldGaps].filter(s => !newGaps.has(s));

  let insights = [];

  // 1. Score-based insights
  if (scoreDiff > 10) {
    insights.push(`Your score improved significantly by ${scoreDiff}%, showing a strong leap in professional alignment.`);
  } else if (scoreDiff > 0) {
    insights.push(`Your score increased by ${scoreDiff}%, indicating steady progress in your profile quality.`);
  } else if (scoreDiff < 0) {
    insights.push(`Your latest score is slightly lower (${scoreDiff}%). This often happens when broad skills are added before they are specialized.`);
  }

  // 2. Skill-based insights
  if (addedSkills.length >= 3) {
    insights.push(`You've successfully integrated ${addedSkills.length} new technical competencies including ${addedSkills.slice(0, 2).join(' and ')}.`);
  } else if (addedSkills.length > 0) {
    insights.push(`The addition of ${addedSkills[0]} strengthens your technical foundation.`);
  }

  // 3. Gap-based insights
  if (resolvedGaps.length > 0) {
    insights.push(`Great job resolving ${resolvedGaps.length} critical skill gaps since the last version.`);
  }

  // 4. Recommendation
  if (newGaps.size > 0) {
    insights.push(`To reach the next level, focus on mastering ${[...newGaps].slice(0, 1)}.`);
  }

  return insights.join(' ') || "Your resume remains stable. Focus on adding new projects to boost your score.";
};
