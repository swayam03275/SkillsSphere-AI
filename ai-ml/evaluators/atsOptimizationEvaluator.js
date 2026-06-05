import { normalizeSkillArray } from "../utils/skillNormalizer.js";

// --- Formatting penalty helpers ---

const hasColumns = (text) =>
  /(\|\s*\w+.*\|.*\|)/.test(text) || /(col\s*\d|column\s*\d)/i.test(text);

const hasTextBoxIndicators = (text) =>
  /\[text\s*box\]|\[callout\]|\[sidebar\]/gi.test(text);

const hasHeaderFooterIndicators = (text) =>
  /\[header\]|\[footer\]|\[page\s*\d\]/gi.test(text);

const hasGraphicsIndicators = (text) =>
  /\[image\]|\[chart\]|\[graph\]|\[logo\]|\[icon\]/gi.test(text);

const hasSpecialBullets = (text) =>
  /[✓✔►▶❖◆●▪▸]/u.test(text);

const hasNonStandardFonts = (text) =>
  /font-family\s*:\s*(?!arial|calibri|times|helvetica|georgia|garamond)/i.test(text);

const hasPDFArtifacts = (text) =>
  /\x00|\ufffd|[\x01-\x08\x0b\x0c\x0e-\x1f]/.test(text);

const hasExcessiveWhitespace = (text) => {
  const lines = text.split("\n");
  const blankCount = lines.filter((l) => l.trim() === "").length;
  return blankCount / lines.length > 0.4;
};

const hasKeywordStuffing = (text) => {
  const words = text.toLowerCase().match(/\b\w+\b/g) || [];
  const freq = {};
  for (const w of words) freq[w] = (freq[w] || 0) + 1;
  const maxFreq = Math.max(...Object.values(freq));
  return maxFreq > 15 && words.length > 0;
};

const hasSectionKeywords = (text) => {
  const keywords = [
    "experience", "education", "skills", "summary",
    "projects", "certifications", "achievements", "awards",
    "publications", "languages", "interests", "references",
  ];
  const found = keywords.filter((k) =>
    new RegExp(`\\b${k}\\b`, "i").test(text)
  );
  return { found, missing: keywords.filter((k) => !found.includes(k)) };
};

const detectDateFormats = (text) => {
  const standard = /\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s*\d{4}\b/gi;
  const numeric = /\b\d{1,2}[\/.-]\d{1,2}[\/.-]\d{2,4}\b/g;
  const yearOnly = /\b(19|20)\d{2}\s*[-–]\s*((19|20)\d{2}|present|current)\b/gi;

  return {
    hasStandardDates: standard.test(text),
    hasNumericDates: numeric.test(text),
    hasYearRanges: yearOnly.test(text),
  };
};

const detectActionVerbs = (text) => {
  const verbs = [
    "led", "managed", "developed", "designed", "implemented",
    "built", "created", "improved", "increased", "reduced",
    "delivered", "launched", "optimized", "architected", "mentored",
    "collaborated", "drove", "established", "spearheaded", "scaled",
  ];
  const found = verbs.filter((v) =>
    new RegExp(`\\b${v}\\b`, "i").test(text)
  );
  return { count: found.length, found };
};

const detectQuantifiedAchievements = (text) => {
  const patterns = [
    /\d+\s*%/g,
    /\$\s*\d+/g,
    /\d+x\s*(faster|improvement|growth)/gi,
    /reduced\s+by\s+\d+/gi,
    /increased\s+by\s+\d+/gi,
    /saved\s+\$?\d+/gi,
    /\d+\s*(users|customers|clients|engineers|team members)/gi,
  ];
  const matches = patterns.flatMap((p) => text.match(p) || []);
  return { count: matches.length, examples: matches.slice(0, 3) };
};

const estimateReadabilityScore = (text) => {
  const sentences = text.split(/[.!?]+/).filter((s) => s.trim().length > 0);
  const words = text.match(/\b\w+\b/g) || [];
  const avgWordsPerSentence =
    sentences.length > 0 ? words.length / sentences.length : 0;

  // Penalize very long sentences (hard to parse for ATS)
  if (avgWordsPerSentence > 30) return "poor";
  if (avgWordsPerSentence > 20) return "moderate";
  return "good";
};

const detectFileFormatHints = (text) => {
  return {
    likelyDocx: /normal\.dotm|word\/document/i.test(text),
    likelyPdf: /%pdf-|endobj|xref/i.test(text),
    hasHtmlTags: /<\/?(div|span|p|br|b|i|ul|li|table)\b/i.test(text),
  };
};

// =============================================
// SCORING WEIGHTS
// =============================================
const WEIGHTS = {
  sections: 35,
  contact: 25,
  formatting: 20,
  content: 20,
};

// =============================================
// REVISED EVALUATOR
// =============================================
export const atsOptimizationEvaluator = ({ resumeData }) => {
  const {
    experience = [],
    education = [],
    skills: rawSkills = [],
    email,
    phone,
    linkedin,
    github,
    portfolio,
    resumeText = "",
  } = resumeData;

  const skills = normalizeSkillArray(rawSkills);

  // --- Section detection ---
  const sectionResults = {
    experience: experience.length > 0,
    education: education.length > 0,
    skills: skills.length > 0,
    summary:
      /^[^a-z]*(summary|professional summary|profile|professional profile|objective|about\s+me)[^a-z]*$/im.test(
        resumeText
      ),
  };

  const { found: detectedSectionKeywords } = hasSectionKeywords(resumeText);

  // --- Contact detection ---
  const emailFromText = /[\w.+-]+@[\w-]+\.[a-z]{2,}/i.test(resumeText);
  const phoneFromText = /(\+\d{1,3}[\s-]?)?\d[\d\s-]{7,}/.test(resumeText);
  const portfolioFromText =
    /(portfolio|https?:\/\/(www\.)?[\w-]+\.[a-z]{2,}[^\s]*)/i.test(resumeText);
  const linkedinUrlDetected =
    /linkedin\.com\/in\/[\w-]+|linkedin\.com\/company\/[\w-]+/i.test(resumeText);
  const githubUrlDetected = /github\.com\/[\w-]+/i.test(resumeText);
  const hasLinkedinPlaceholder =
    /\blinkedin\b/i.test(resumeText) && !linkedinUrlDetected;
  const hasGithubPlaceholder =
    /\bgithub\b/i.test(resumeText) && !githubUrlDetected;

  const contactResults = {
    email: !!email || emailFromText,
    phone: !!phone || phoneFromText,
    linkedin: !!linkedin || linkedinUrlDetected || hasLinkedinPlaceholder,
    github: !!github || githubUrlDetected || hasGithubPlaceholder,
    portfolio: !!portfolio || portfolioFromText,
  };

  // --- Formatting hygiene ---
  const formattingIssues = {
    hasTables: /<table|\[table\]/gi.test(resumeText),
    hasColumns: hasColumns(resumeText),
    hasTextBoxes: hasTextBoxIndicators(resumeText),
    hasHeaderFooter: hasHeaderFooterIndicators(resumeText),
    hasGraphics: hasGraphicsIndicators(resumeText),
    hasSpecialBullets: hasSpecialBullets(resumeText),
    hasNonStandardFonts: hasNonStandardFonts(resumeText),
    hasPDFArtifacts: hasPDFArtifacts(resumeText),
    hasExcessiveWhitespace: hasExcessiveWhitespace(resumeText),
    hasKeywordStuffing: hasKeywordStuffing(resumeText),
  };

  const fileFormatHints = detectFileFormatHints(resumeText);
  const dateFormats = detectDateFormats(resumeText);
  const actionVerbs = detectActionVerbs(resumeText);
  const quantified = detectQuantifiedAchievements(resumeText);
  const readability = estimateReadabilityScore(resumeText);

  // --- Scoring ---
  const feedback = [];
  const suggestions = [];
  let score = 0;

  // Sections (35pts)
  const foundSections = Object.values(sectionResults).filter(Boolean).length;
  const missingSections = Object.keys(sectionResults).filter(
    (k) => !sectionResults[k]
  );
  score += (foundSections / Object.keys(sectionResults).length) * WEIGHTS.sections;

  if (missingSections.length > 0) {
    feedback.push(`Missing key sections: ${missingSections.join(", ")}.`);
    suggestions.push(
      `Add clear headers for: ${missingSections.join(", ")}.`
    );
  }

  // Contact (25pts)
  const foundContact = Object.values(contactResults).filter(Boolean).length;
  const missingContact = Object.keys(contactResults).filter(
    (k) => !contactResults[k]
  );
  score += (foundContact / Object.keys(contactResults).length) * WEIGHTS.contact;

  if (missingContact.length > 0) {
    feedback.push(`Missing contact info: ${missingContact.join(", ")}.`);
    suggestions.push(
      `Ensure your ${missingContact.join(" and ")} are visible at the top.`
    );
  }

  if (hasLinkedinPlaceholder || hasGithubPlaceholder) {
    feedback.push(
      "Embedded hyperlinks detected — some ATS systems may not extract hidden URLs."
    );
    suggestions.push(
      "Use visible LinkedIn/GitHub URLs instead of embedded hyperlinks."
    );
  }

  // Formatting (20pts — penalty based)
  let formattingScore = WEIGHTS.formatting;
  const penalties = {
    hasTables: 5,
    hasColumns: 4,
    hasTextBoxes: 4,
    hasHeaderFooter: 3,
    hasGraphics: 3,
    hasSpecialBullets: 2,
    hasNonStandardFonts: 2,
    hasPDFArtifacts: 5,
    hasExcessiveWhitespace: 2,
    hasKeywordStuffing: 3,
  };

  const formattingMessages = {
    hasTables: ["Tables detected — ATS parsers may misread tabular layouts.", "Replace tables with plain text sections."],
    hasColumns: ["Multi-column layout detected — ATS reads left-to-right, may skip columns.", "Use single-column layout for ATS compatibility."],
    hasTextBoxes: ["Text boxes detected — content inside may be invisible to ATS.", "Move text box content into the main body."],
    hasHeaderFooter: ["Header/footer content may be skipped by ATS parsers.", "Place critical info (name, contact) in the main body."],
    hasGraphics: ["Graphics or images detected — ATS cannot read visual content.", "Remove images and replace with text equivalents."],
    hasSpecialBullets: ["Special bullet characters detected — may appear as garbled text in ATS.", "Use standard hyphens or asterisks as bullets."],
    hasNonStandardFonts: ["Non-standard fonts detected — may not render correctly in all ATS.", "Stick to Arial, Calibri, Times New Roman, or Helvetica."],
    hasPDFArtifacts: ["Binary/PDF artifacts detected — resume text may not parse cleanly.", "Export as a clean .docx or ATS-optimized PDF."],
    hasExcessiveWhitespace: ["Excessive blank lines detected — may confuse section parsing.", "Reduce unnecessary whitespace between sections."],
    hasKeywordStuffing: ["Possible keyword stuffing detected — may trigger ATS spam filters.", "Use keywords naturally within context."],
  };

  for (const [issue, penalty] of Object.entries(penalties)) {
    if (formattingIssues[issue]) {
      formattingScore -= penalty;
      const [fb, sug] = formattingMessages[issue];
      feedback.push(fb);
      suggestions.push(sug);
    }
  }

  score += Math.max(0, formattingScore);

  // Content quality (20pts)
  let contentScore = 0;

  // Action verbs (up to 8pts)
  const verbRatio = Math.min(actionVerbs.count / 8, 1);
  contentScore += verbRatio * 8;
  if (actionVerbs.count < 4) {
    feedback.push(`Only ${actionVerbs.count} action verbs detected — weak impact language.`);
    suggestions.push("Start bullet points with strong action verbs like 'Led', 'Built', 'Reduced'.");
  }

  // Quantified achievements (up to 8pts)
  const quantRatio = Math.min(quantified.count / 4, 1);
  contentScore += quantRatio * 8;
  if (quantified.count === 0) {
    feedback.push("No quantified achievements detected.");
    suggestions.push("Add metrics like '40% faster', '$2M revenue', or '10-person team'.");
  }

  // Date format consistency (4pts)
  if (dateFormats.hasStandardDates || dateFormats.hasYearRanges) {
    contentScore += 4;
  } else if (dateFormats.hasNumericDates) {
    contentScore += 2;
    feedback.push("Numeric date formats (MM/DD/YYYY) detected — some ATS prefer month-name formats.");
    suggestions.push("Use formats like 'Jan 2022 – Mar 2024' for better ATS parsing.");
  } else {
    feedback.push("No recognizable date formats detected in experience section.");
    suggestions.push("Add start/end dates to all experience entries.");
  }

  // Readability penalty
  if (readability === "poor") {
    contentScore -= 4;
    feedback.push("Sentences are very long — may reduce ATS parse accuracy.");
    suggestions.push("Keep bullet points concise, ideally under 20 words.");
  } else if (readability === "moderate") {
    contentScore -= 2;
  }

  score += Math.max(0, contentScore);

  const finalScore = Math.max(0, Math.min(100, Math.round(score)));

  // Summary tier
  const summary =
    finalScore >= 85
      ? "Your resume is highly ATS-optimized."
      : finalScore >= 65
      ? "Your resume is moderately ATS-friendly — a few improvements recommended."
      : finalScore >= 40
      ? "Your resume has notable ATS compatibility issues that may reduce visibility."
      : "Your resume has significant ATS issues — substantial improvements needed.";

  return {
    key: "ats_optimization",
    label: "ATS Optimization",
    score: finalScore,
    summary,
    details: {
      sectionResults,
      contactResults,
      formattingIssues,
      feedback,
      suggestions,
      actionVerbs: {
        count: actionVerbs.count,
        found: actionVerbs.found,
      },
      quantifiedAchievements: {
        count: quantified.count,
        examples: quantified.examples,
      },
      dateFormats,
      readability,
      detectedSectionKeywords,
    },
    meta: {
      hasTables: formattingIssues.hasTables,
      fileFormatHints,
      scoringWeights: WEIGHTS,
    },
  };
};