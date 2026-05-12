import { createRequire } from "module";
const require = createRequire(import.meta.url);
const techKeywords = require("../../../ai-ml/data/techKeywords.json");

const skillKeywords = Object.values(techKeywords).flat();

/**
 * Extracts skills and years of experience from raw job description text.
 * @param {string} jdText - The raw job description text.
 * @returns {object} - { skills: string[], yearsOfExperience: number }
 */
export const extractDataFromJD = (jdText) => {
  if (!jdText) return { skills: [], yearsOfExperience: 0 };

  const normalizedJD = jdText.toLowerCase();
  
  // 1. Extract Skills
  const extractedSkills = [];
  skillKeywords.forEach(skill => {
    // Escape special characters in skill (like . in node.js)
    const escapedSkill = skill.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`\\b${escapedSkill}\\b`, "gi");
    if (regex.test(normalizedJD)) {
      extractedSkills.push(skill);
    }
  });

  // 2. Extract Years of Experience
  let maxYears = 0;
  
  // Match patterns like "5+ years", "3-5 years", "min 2 years"
  const experiencePatterns = [
    /(\d+)\s*\+\s*years?/gi,           // 5+ years
    /(\d+)\s*(?:to|-)\s*(\d+)\s*years?/gi, // 3-5 years
    /(?:minimum|at least|min)\s*(\d+)\s*years?/gi, // min 2 years
    /(\d+)\s*years?\s*(?:of)?\s*experience/gi      // 3 years of experience
  ];

  experiencePatterns.forEach(pattern => {
    let match;
    while ((match = pattern.exec(normalizedJD)) !== null) {
      if (match[2]) {
        // Range case: take the lower bound as required experience
        maxYears = Math.max(maxYears, parseInt(match[1]));
      } else {
        maxYears = Math.max(maxYears, parseInt(match[1]));
      }
    }
  });

  return {
    skills: [...new Set(extractedSkills)],
    yearsOfExperience: maxYears
  };
};
