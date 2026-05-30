/**
 * Evaluates ATS compatibility by checking for required sections, 
 * contact information, and formatting hygiene based on parsed data.
 */
export const atsOptimizationEvaluator = ({ resumeData, weight = 0.15 }) => {
  const {
    experience = [],
    education = [],
    skills = [],
    email,
    phone,
    linkedin,
    resumeText = ""
  } = resumeData;

  const sectionResults = {
    experience: experience.length > 0,
    education: education.length > 0,
    skills: skills.length > 0,
    summary: /^[^a-z]*(summary|profile|objective|about\s+me)[^a-z]*$/gim.test(resumeText),
  };

  const contactResults = {
    email: !!email,
    phone: !!phone,
    linkedin: !!linkedin,
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

  // Formatting Hygiene (Bonus/Penalty)
  const hasTables = /<table|\[table\]/gi.test(resumeText);
  if (hasTables) {
    score -= 10;
    feedback.push("Tables detected. Some ATS systems struggle with complex layouts.");
    suggestions.push("Use simple text blocks instead of nested tables for better parsing.");
  }

  return {
    score: Math.max(0, Math.min(100, Math.round(score))),
    weight,
    sectionResults,
    contactResults,
    feedback,
    suggestions,
    name: "atsOptimization"
  };
};

