export default function gapAnalyzer({ 
  skillMatch = {}, 
  keywordMatch = {}, 
  experienceMatch = {},
  consistencyMatch = {},
  readabilityMatch = {},
  impactMatch = {},
  atsOptimization = {},
  techStandard = {},
  resumeText = "",
  isJDProvided = false
}) {
  const categorizedSuggestions = {
    critical: [],
    strategic: [],
    optimization: []
  };

  // 1. Critical: Structural & ATS Gaps
  if (!atsOptimization || atsOptimization.score < 80) {
    const details = atsOptimization.details || {};
    const sectionResults = details.sectionResults || {};
    const contactResults = details.contactResults || {};

    const missing = Object.keys(sectionResults)
      .filter(k => !sectionResults[k]);
    if (missing.length > 0) {
      categorizedSuggestions.critical.push(`Add clear headers for ${missing.join(" and ")} to ensure ATS readability.`);
    }
    
    const missingContact = Object.keys(contactResults)
      .filter(k => !contactResults[k]);
    if (missingContact.length > 0) {
      const verb = missingContact.length === 1 ? "is" : "are";
      const items = missingContact.length > 2 
        ? missingContact.slice(0, -1).join(", ") + ", and " + missingContact[missingContact.length - 1]
        : missingContact.join(" and ");
      categorizedSuggestions.critical.push(`Ensure your ${items} ${verb} visible at the top of the document.`);
    }
  } else if (!atsOptimization || atsOptimization.score < 100) {
    categorizedSuggestions.optimization.push("Your ATS structure is excellent. Ensure you use standard, non-serif fonts to guarantee 100% parseability by legacy ATS systems.");
  }

  // 2. Strategic: Skills & Keywords (Only if JD provided)
  if (isJDProvided && skillMatch?.score !== null && skillMatch?.score < 100) {
    const missingSkills = skillMatch.details?.missingSkills || skillMatch.missingSkills || [];
    const prioritySkills = missingSkills.slice(0, 3);
    if (prioritySkills.length > 0) {
      if (skillMatch.score >= 85) {
        categorizedSuggestions.strategic.push(`Great skill match! You can push your ATS score closer to 100% by including: ${prioritySkills.join(", ")}.`);
      } else {
        categorizedSuggestions.strategic.push(`Bridge the technical gap by highlighting experience with: ${prioritySkills.join(", ")}.`);
      }
    }
  }

  if (isJDProvided && keywordMatch?.score !== null && keywordMatch?.score < 100) {
    const missingKeywords = keywordMatch.details?.missingKeywords || keywordMatch.missingKeywords || [];
    const topKeywords = missingKeywords.slice(0, 3);
    if (topKeywords.length > 0) {
      if (keywordMatch.score >= 90) {
        categorizedSuggestions.strategic.push(`Great keyword match! You can push your ATS score closer to 100% by including: ${topKeywords.join(", ")}.`);
      } else {
        categorizedSuggestions.strategic.push(`Increase your visibility for this role by integrating industry terms: ${topKeywords.join(", ")}.`);
      }
    }
  }

  // 3. Optimization: Impact & Readability
  if (impactMatch?.score < 50) {
    categorizedSuggestions.optimization.push("Transform task-based descriptions into result-oriented bullet points using the XYZ formula (Accomplished [X] as measured by [Y], by doing [Z]).");
  } else {
    categorizedSuggestions.optimization.push("Your impact metrics are strong. Consider adding specific financial figures or time-saved percentages to make your top achievements stand out even more.");
  }

  const readabilityDetails = readabilityMatch?.details || {};
  if ((readabilityDetails.passiveVoiceCount || 0) > 2) {
    const verbs = readabilityDetails.relevantVerbs || [];
    categorizedSuggestions.optimization.push(`Convert passive phrases into active ones using power verbs like ${verbs.slice(0, 2).join(" or ")}.`);
  } else {
    categorizedSuggestions.optimization.push("Readability is highly active. Maintain this by keeping bullet points strictly under two lines each for maximum scannability.");
  }

  // 4. Domain Specialization
  if ((techStandard?.score ?? Infinity) < 60) {
    const domainMissing = techStandard?.details?.domainMissing || {};
    const topMissingKeywords = Object.values(domainMissing)
      .flat()
      .slice(0, 5);
    if (topMissingKeywords.length > 0) {
      categorizedSuggestions.strategic.push(
        `Strengthen your technical breadth by adding keywords like: ${topMissingKeywords.join(", ")} to your resume.`
      );
    }
    const techSuggestions = techStandard.details?.suggestions || techStandard.suggestions || [];
    techSuggestions.forEach(s => categorizedSuggestions.strategic.push(s));
  } else {
    categorizedSuggestions.strategic.push("You have a solid technical foundation. Consider linking open-source contributions or live deployments to provide proof-of-work for your top skills.");
  }

  // 5. Contribution Milestones
  const contributionSuggestions = [];
  const field = (resumeText || "").toLowerCase();
  
  if (field.includes("react") || field.includes("frontend") || field.includes("html") || field.includes("css")) {
    contributionSuggestions.push("Make 1 open-source contribution using React or your primary frontend framework");
  } else if (field.includes("node") || field.includes("backend") || field.includes("python") || field.includes("java")) {
    contributionSuggestions.push("Fix a beginner-friendly issue in a public backend repository");
  } else if (field.includes("devops") || field.includes("docker") || field.includes("aws")) {
    contributionSuggestions.push("Contribute infrastructure or CI/CD improvements to an open-source project");
  } else {
    contributionSuggestions.push("Publish a GitHub project demonstrating your core skills and best practices");

  }

  // Flatten and prioritize
  const allSuggestions = [
    ...categorizedSuggestions.critical.map(s => ({ priority: "Critical", text: s, icon: "AlertCircle", type: "learning" })),
    ...categorizedSuggestions.strategic.map(s => ({ priority: "Strategic", text: s, icon: "Zap", type: "learning" })),
    ...categorizedSuggestions.optimization.map(s => ({ priority: "Optimization", text: s, icon: "Layout", type: "learning" })),
    ...contributionSuggestions.map(s => ({ priority: "Contribution", text: s, icon: "Star", type: "contribution" }))
  ];

  // If still too few, add highly contextual polish tips
  if (allSuggestions.length < 4) {
    const wordCount = resumeText.split(/\s+/).filter(Boolean).length;
    if (wordCount > 1000) {
      allSuggestions.push({ priority: "Polish", text: "Your resume is quite long (~3+ pages). Aim for a concise 1-2 page format for maximum engagement.", icon: "CheckCircle2", type: "learning" });
    } else if (wordCount > 0 && wordCount < 200) {
      allSuggestions.push({ priority: "Polish", text: "Your resume is very brief. Consider detailing your projects or certifications to show more depth.", icon: "CheckCircle2", type: "learning" });
    } else {
      allSuggestions.push({ priority: "Polish", text: "Your resume is in the top percentile! To maintain this competitive edge, ensure you update your metrics every 3-6 months.", icon: "CheckCircle2", type: "learning" });
    }
  }

  return {
    suggestions: allSuggestions.slice(0, 6)
  };
}
