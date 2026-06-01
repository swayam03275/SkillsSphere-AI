const roundToTwo = (value) => Number(value.toFixed(2));

// --- Normalize text ---
function normalize(text = "") {
  return text.toLowerCase().replace(/\s+/g, " ").trim();
}

// --- Month mapping ---
const MONTH_MAP = {
  jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
  jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11
};

// --- Convert (month, year) to absolute month index ---
function toAbsolute(month, year) {
  return year * 12 + month;
}

// --- Calculate months difference ---
function calculateMonths(startMonth, startYear, endMonth, endYear) {
  return (endYear - startYear) * 12 + (endMonth - startMonth);
}

// --- Merge overlapping intervals and sum total months ---
function mergeAndSumIntervals(intervals) {
  if (!intervals.length) return 0;

  intervals.sort((a, b) => a.start - b.start);

  const merged = [intervals[0]];

  for (let i = 1; i < intervals.length; i++) {
    const last = merged[merged.length - 1];
    const curr = intervals[i];

    if (curr.start <= last.end) {
      last.end = Math.max(last.end, curr.end);
    } else {
      merged.push(curr);
    }
  }

  return merged.reduce((sum, iv) => sum + (iv.end - iv.start), 0);
}

// --- Tiered scoring curve (concave) ---
function computeScore(candidateYears, requiredYears) {
  if (requiredYears === 0) return 100;
  if (candidateYears >= requiredYears) return 100;

  const ratio = candidateYears / requiredYears;
  return roundToTwo(100 * Math.pow(ratio, 0.75));
}

// --- Extract experience in YEARS ---
export function extractExperienceInYears(text = "") {
  if (!text) return 0;

  const clean = normalize(text);
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  const intervals = [];
  let match;

  // ================================
  // 1. DATE RANGE HANDLING
  // ================================
  const dateRangeRegex =
    /(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s*'?(\d{2}|\d{4})\s*[-–to]+\s*(present|current|(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s*'?(\d{2}|\d{4}))/gi;

  while ((match = dateRangeRegex.exec(clean))) {
    const startMonth = MONTH_MAP[match[1].slice(0, 3).toLowerCase()];

    const rawStartYear = match[2];
    const startYear =
      rawStartYear.length === 2
        ? 2000 + parseInt(rawStartYear)
        : parseInt(rawStartYear);

    let endMonth, endYear;

    const endToken = match[3].toLowerCase();
    if (endToken.includes("present") || endToken.includes("current")) {
      endMonth = currentMonth;
      endYear = currentYear;
    } else {
      endMonth = MONTH_MAP[match[4].slice(0, 3).toLowerCase()];
      const rawEndYear = match[5];
      endYear =
        rawEndYear.length === 2
          ? 2000 + parseInt(rawEndYear)
          : parseInt(rawEndYear);
    }

    const absStart = toAbsolute(startMonth, startYear);
    const absEnd = toAbsolute(endMonth, endYear);

    if (absEnd > absStart) {
      intervals.push({ start: absStart, end: absEnd });
    }
  }

  // If date ranges found, merge and return total
  if (intervals.length > 0) {
    const totalMonths = mergeAndSumIntervals(intervals);
    return roundToTwo(totalMonths / 12);
  }

  // ================================
  // 2. FALLBACK: TEXT-BASED PATTERNS
  // ================================
  let maxYears = 0;
  const rangeIndices = [];

  // Combined (1 year 6 months)
  const combinedRegex =
    /(\d+)\s*(year|years|yr|yrs)\s*(\d+)\s*(month|months|mo|mos)/g;
  while ((match = combinedRegex.exec(clean))) {
    maxYears = Math.max(maxYears, parseInt(match[1]) + parseInt(match[3]) / 12);
  }

  // Range (3-5 years)
  const rangePattern =
    /(\d+(?:\.\d+)?)\s*(?:-|–|to)\s*(\d+(?:\.\d+)?)\s*\+?\s*(?:year|years|yr|yrs)/gi;
  for (const m of clean.matchAll(rangePattern)) {
    const lower = parseFloat(m[1]);
    const upper = parseFloat(m[2]);
    maxYears = Math.max(maxYears, (lower + upper) / 2);
    rangeIndices.push({ start: m.index, end: m.index + m[0].length });
  }

  const isOverlapping = (idx) =>
    rangeIndices.some((r) => idx >= r.start && idx <= r.end);

  // Plus (2+ years)
  const plusRegex = /(\d+)\+?\s*(year|years|yr|yrs)/g;
  while ((match = plusRegex.exec(clean))) {
    if (!isOverlapping(match.index))
      maxYears = Math.max(maxYears, parseInt(match[1]));
  }

  // Months only (18 months)
  const monthRegex = /(\d+)\s*(month|months|mo|mos)/g;
  while ((match = monthRegex.exec(clean))) {
    if (!isOverlapping(match.index))
      maxYears = Math.max(maxYears, parseInt(match[1]) / 12);
  }

  return roundToTwo(maxYears);
}

// --- MAIN EVALUATOR ---
export function experienceEvaluator({
  candidateExperienceText = "",
  jobDescription = "",
  overqualificationThreshold = 2.5,
} = {}) {
  const candidateYears = extractExperienceInYears(candidateExperienceText);
  const requiredYears = extractExperienceInYears(jobDescription);

  if (requiredYears === 0) {
    return {
      key: "experience_match",
      label: "Experience Match",
      score: 100,
      summary: "No specific years of experience required for this role.",
      details: {
        feedback: ["Could not detect required experience from the job description"],
        candidateExperience: candidateYears,
        requiredExperience: 0,
        experienceGap: 0,
        experienceSurplus: 0,
      },
      meta: {
        isSeniorRole: false,
        isOverqualified: false,
        overqualificationThreshold,
      },
    };
  }

  const score = computeScore(candidateYears, requiredYears);
  const gap = roundToTwo(Math.max(0, requiredYears - candidateYears));
  const surplus = roundToTwo(Math.max(0, candidateYears - requiredYears));
  const isOverqualified =
    candidateYears >= requiredYears * overqualificationThreshold;

  const feedback = [];

  if (isOverqualified) {
    feedback.push(
      `Candidate may be overqualified — has ${surplus} years more than required`
    );
  } else if (score === 100) {
    feedback.push("Candidate meets or exceeds the required experience");
  } else if (score >= 75) {
    feedback.push("Candidate is slightly below the required experience level");
  } else if (score >= 50) {
    feedback.push("Candidate partially meets experience requirements");
  } else {
    feedback.push("Candidate has significantly less experience than required");
  }

  feedback.push(`Required: ${requiredYears} yrs | Candidate: ${candidateYears} yrs`);
  if (gap > 0) feedback.push(`Gap: ${gap} years`);
  if (surplus > 0 && !isOverqualified) feedback.push(`Surplus: ${surplus} years`);

  const summary = isOverqualified
    ? `Candidate may be overqualified by ~${surplus} years.`
    : score === 100
    ? "Candidate meets the required experience level."
    : `Candidate is short by approximately ${gap} years.`;

  return {
    key: "experience_match",
    label: "Experience Match",
    score,
    summary,
    details: {
      candidateExperience: candidateYears,
      requiredExperience: requiredYears,
      experienceGap: gap,
      experienceSurplus: surplus,
      feedback,
    },
    meta: {
      isSeniorRole: requiredYears >= 5,
      isOverqualified,
      overqualificationThreshold,
    },
  };
}