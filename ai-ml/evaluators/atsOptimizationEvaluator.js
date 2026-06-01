import { normalizeSkillArray } from "../utils/skillNormalizer.js";

/**
 * Evaluates ATS compatibility by checking for required sections, 
 * contact information, and formatting hygiene based on parsed data.
 */
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
    resumeText = ""
  } = resumeData;

  const skills = normalizeSkillArray(rawSkills);

  const sectionResults = {
    experience: experience.length > 0,
    education: education.length > 0,
    skills: skills.length > 0,
    summary: /^[^a-z]*(summary|professional summary|profile|professional profile|objective|about\s+me)[^a-z]*$/im.test(resumeText),
  };

  // Fallback to regex detection from resumeText when structured fields are missing
  const emailFromText = /[\w.+-]+@[\w-]+\.[a-z]{2,}/i.test(resumeText); 
  const phoneFromText = /(\+\d{1,3}[\s-]?)?\d[\d\s-]{7,}/.test(resumeText); 
  const portfolioFromText = /(portfolio|https?:\/\/(www\.)?[\w-]+\.[a-z]{2,}[^\s]*)/i.test(resumeText);
  const linkedinUrlDetected = /linkedin\.com\/in\/[\w-]+|linkedin\.com\/company\/[\w-]+/i.test(resumeText);
  const githubUrlDetected = /github\.com\/[\w-]+/i.test(resumeText);
  const hasLinkedinPlaceholder = /\blinkedin\b/i.test(resumeText) && !linkedinUrlDetected;
  const hasGithubPlaceholder = /\bgithub\b/i.test(resumeText) && !githubUrlDetected;
  const linkedinFromText = linkedinUrlDetected || hasLinkedinPlaceholder;
  const githubFromText = githubUrlDetected || hasGithubPlaceholder;

  const contactResults = { 
    email: !!email || emailFromText,
    phone: !!phone || phoneFromText,
    linkedin: !!linkedin || linkedinFromText, 
    github: !!github || githubFromText,
    portfolio: !!portfolio || portfolioFromText,
  };

  // Scoring
  let score = 0;
  const feedback = [];
  const suggestions = [];

  const missingSections = Object.keys(sectionResults).filter(k => !sectionResults[k]);
  const missingContact = Object.keys(contactResults).filter(k => !contactResults[k]);

  // Section Score (60 points)
  const foundSections = Object.values(sectionResults).filter(Boolean).length;
  score += (foundSections / Object.keys(sectionResults).length) * 60;

  if (missingSections.length > 0) {
    feedback.push(`Missing key sections: ${missingSections.join(", ")}.`);
    suggestions.push(`Add clear headers for ${missingSections.join(" and ")}.`);
  }

  // Contact Score (40 points)
  const foundContact = Object.values(contactResults).filter(Boolean).length;
  score += (foundContact / Object.keys(contactResults).length) * 40;

  if (missingContact.length > 0) {
    feedback.push(`Missing contact info: ${missingContact.join(", ")}.`);
    suggestions.push(`Ensure your ${missingContact.join(" and ")} are visible at the top.`);
  }

  if (hasLinkedinPlaceholder || hasGithubPlaceholder) {
  feedback.push(
    "Embedded hyperlinks detected. Some ATS systems may not extract hidden profile URLs correctly."
  );

  suggestions.push(
    "Use visible LinkedIn/GitHub URLs instead of embedded hyperlinks for better ATS compatibility."
  );
}

  // Formatting Hygiene (Bonus/Penalty)
  const hasTables = /<table|\[table\]/gi.test(resumeText);
  if (hasTables) {
    score -= 10;
    feedback.push("Tables detected. Some ATS systems struggle with complex layouts.");
    suggestions.push("Use simple text blocks instead of nested tables for better parsing.");
  }

  const finalScore = Math.max(0, Math.min(100, Math.round(score)));

  return {
    key: "ats_optimization",
    label: "ATS Optimization",
    score: finalScore,
    summary: finalScore > 80 
      ? "Your resume format is highly ATS-friendly." 
      : `Missing ${missingSections.length + missingContact.length} optimization elements.`,
    details: {
      sectionResults,
      contactResults,
      feedback,
      suggestions
    },
    meta: {
      hasTables
    }
  };
};
