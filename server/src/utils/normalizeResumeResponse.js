export function normalizeResumeData(data) {
  data = data || {};
  return {
    name: data.name || "",
    email: data.email || null,
    phone: data.phone || null,

    skills: Array.isArray(data.skills) ? data.skills : [],
    education: Array.isArray(data.education) ? data.education : [],
    experience: Array.isArray(data.experience) ? data.experience : [],
    projects: Array.isArray(data.projects) ? data.projects : [],
    certifications: Array.isArray(data.certifications)
      ? data.certifications
      : [],

    linkedin: data.linkedin || null,
    github: data.github || null,
    portfolio: data.portfolio || null,

    keywords: Array.isArray(data.keywords) ? data.keywords : [],
    extractedTextLength: data.extractedTextLength || 0,
    resumeText: data.resumeText || "",
  };
}

export function normalizePipelineResult(result) {
  result = result || {};
  return {
    score: typeof result.score === "number" ? result.score : 0,
    breakdown:
      result.breakdown && typeof result.breakdown === "object"
        ? result.breakdown
        : {},

    skillMatch:
      result.skillMatch && typeof result.skillMatch === "object"
        ? { ...result.skillMatch, ...(result.skillMatch.details || {}) }
        : {},
    keywordMatch:
      result.keywordMatch && typeof result.keywordMatch === "object"
        ? { ...result.keywordMatch, ...(result.keywordMatch.details || {}) }
        : {},
    experienceMatch:
      result.experienceMatch && typeof result.experienceMatch === "object"
        ? { ...result.experienceMatch, ...(result.experienceMatch.details || {}) }
        : {},
    consistencyMatch:
      result.consistencyMatch && typeof result.consistencyMatch === "object"
        ? result.consistencyMatch
        : {},
    readabilityMatch:
      result.readabilityMatch && typeof result.readabilityMatch === "object"
        ? result.readabilityMatch
        : {},
    impactMatch:
      result.impactMatch && typeof result.impactMatch === "object"
        ? result.impactMatch
        : {},
    atsOptimization:
      result.atsOptimization && typeof result.atsOptimization === "object"
        ? result.atsOptimization
        : {},
    techStandard:
      result.techStandard && typeof result.techStandard === "object"
        ? result.techStandard
        : {},
    gapAnalysis:
      result.gapAnalysis && typeof result.gapAnalysis === "object"
        ? result.gapAnalysis
        : {},
    classification:
      result.classification && typeof result.classification === "object"
        ? result.classification
        : result.classification || null,
    isJDProvided: !!result.isJDProvided,
    mode: result.mode || "match",
  };
}

