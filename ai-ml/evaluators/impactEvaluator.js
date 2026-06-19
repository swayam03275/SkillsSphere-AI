// --- Impact metric patterns ---
const METRIC_PATTERNS = {
  percentage: /(?:\d+(?:\.\d+)?%|percent(?:age)?)/gi,
  currency: /(?:\$|usd|inr|€|£|eur|gbp)\s?\d+(?:[kKmMbB]|\s?(?:million|billion|thousand))?/gi,
  multiplier: /\d+(?:\.\d+)?x\s*(?:faster|improvement|growth|increase|reduction)?/gi,
  timeReduction: /(?:reduced|cut|decreased|saved)\s+(?:by\s+)?\d+\s*(?:hours?|days?|weeks?|months?)/gi,
  teamSize: /(?:team\s+of|managed|led|mentored)\s+\d+\s*(?:engineers?|developers?|people|members?|reports?)?/gi,
  numbers: /(?:\bmanaged\b|\bscaled\b|\bled\b|\bsaved\b|\breduced\b|\bincreased\b|\bdelivered\b|\bserved\b)\s+\d+/gi,
};

// --- Tiered action verbs by impact level ---
const POWER_VERBS = {
  high: [
    "pioneered", "orchestrated", "transformed", "architected",
    "spearheaded", "revitalized", "overhauled", "surpassed",
    "disrupted", "revolutionized",
  ],
  medium: [
    "optimized", "streamlined", "accelerated", "automated",
    "redesigned", "consolidated", "launched", "scaled",
    "delivered", "drove",
  ],
  low: [
    "improved", "increased", "reduced", "built",
    "developed", "created", "implemented", "managed",
  ],
};

// --- Context validator: checks metric appears in an achievement sentence ---
function isInAchievementContext(match, text) {
  const lower = text.toLowerCase();
  const idx = lower.indexOf(match.toLowerCase());
  if (idx === -1) return false;
  const surrounding = lower.slice(Math.max(0, idx - 60), idx + match.length + 60);
  return /(?:result|achiev|improv|reduc|increas|deliver|sav|generat|grew|surpass)/.test(surrounding);
}

// --- Deduplicate matches ---
function deduplicateMatches(matches) {
  return [...new Set(matches.map(m => m.trim().toLowerCase()))];
}

export const impactEvaluator = ({ resumeText = "" }) => {
  const lowerText = resumeText.toLowerCase();

  // --- Find all metric matches ---
  const rawFindings = {};
  let totalFindings = 0;
  let contextualFindings = 0;

  Object.entries(METRIC_PATTERNS).forEach(([key, pattern]) => {
    const matches = resumeText.match(pattern) || [];
    const deduped = deduplicateMatches(matches);
    const contextual = deduped.filter(m => isInAchievementContext(m, resumeText));

    rawFindings[key] = deduped;
    totalFindings += deduped.length;
    contextualFindings += contextual.length;
  });

  // --- Power verb detection by tier ---
  const verbsByTier = {
    high: POWER_VERBS.high.filter(v => lowerText.includes(v)),
    medium: POWER_VERBS.medium.filter(v => lowerText.includes(v)),
    low: POWER_VERBS.low.filter(v => lowerText.includes(v)),
  };

  const powerVerbCount =
    verbsByTier.high.length +
    verbsByTier.medium.length +
    verbsByTier.low.length;

  // --- Weighted scoring ---
  let score = 0;

  // Verb score (up to 30pts): high=5, medium=3, low=1
  const verbScore =
    Math.min(15, verbsByTier.high.length * 5) +
    Math.min(10, verbsByTier.medium.length * 3) +
    Math.min(5, verbsByTier.low.length * 1);
  score += Math.min(30, verbScore);

  // Metric score (up to 50pts): raw count
  if (totalFindings >= 8) score += 50;
  else if (totalFindings >= 5) score += 40;
  else if (totalFindings >= 3) score += 25;
  else if (totalFindings >= 1) score += 10;

  // Contextual bonus (up to 20pts): metrics appearing in achievement sentences
  if (contextualFindings >= 5) score += 20;
  else if (contextualFindings >= 3) score += 12;
  else if (contextualFindings >= 1) score += 5;

  score = Math.min(100, Math.round(score));

  // --- Feedback ---
  const feedback = [];

  if (score >= 80) {
    feedback.push("Excellent impact — strong action verbs and quantifiable metrics throughout.");
  } else if (score >= 55) {
    feedback.push("Good professional tone, but more data-driven results would strengthen impact.");
  } else if (score >= 30) {
    feedback.push("Some metrics present but impact language is weak overall.");
  } else {
    feedback.push("Resume is descriptive but lacks measurable impact — recruiters look for numbers and results.");
  }

  if (verbsByTier.high.length === 0) {
    feedback.push("No high-impact verbs detected. Add words like 'Spearheaded', 'Architected', or 'Orchestrated'.");
  }

  if (rawFindings.currency.length === 0 && rawFindings.percentage.length === 0) {
    feedback.push("No financial or percentage metrics found — these are the strongest impact signals.");
  }

  // --- Suggestions ---
  const suggestions = [];

  if (totalFindings < 3) {
    suggestions.push("Identify 3 key projects and add specific numbers (users reached, money saved, time reduced).");
  }

  if (contextualFindings < totalFindings) {
    suggestions.push("Ensure metrics appear alongside achievement context — e.g., 'Reduced load time by 40% resulting in improved retention'.");
  }

  if (rawFindings.timeReduction.length === 0) {
    suggestions.push("Add time-based metrics (e.g., 'Reduced deployment time by 2 hours/week') to show efficiency gains.");
  }

  if (rawFindings.teamSize.length === 0 && lowerText.includes("team")) {
    suggestions.push("You mention a team — add the size (e.g., 'Led a team of 6 engineers') to show leadership scope.");
  }

  if (score < 100) {
    suggestions.push("Use phrases like 'resulting in', 'achieving', or 'leading to' followed by a metric.");
  }

  const summary =
    score >= 80
      ? "Strong evidence of quantifiable impact across multiple metric types."
      : score >= 55
      ? "Moderate impact signals — adding more metrics would significantly strengthen this resume."
      : score >= 30
      ? "Some impact language present but insufficient metrics for competitive roles."
      : "Resume describes duties but lacks measurable results — add numbers, percentages, and outcomes.";

  return {
    key: "impact_match",
    label: "Measurable Impact",
    score,
    summary,
    details: {
      totalFindings,
      contextualFindings,
      findings: rawFindings,
      verbsByTier,
      feedback,
      suggestions,
    },
    meta: {
      powerVerbCount,
      hasFinancialMetrics: rawFindings.currency.length > 0,
      hasPercentageMetrics: rawFindings.percentage.length > 0,
      hasTeamSizeMetrics: rawFindings.teamSize.length > 0,
    },
  };
};