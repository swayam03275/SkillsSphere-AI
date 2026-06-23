export function classifyResume({ score, skillMatch, experienceMatch }) {
  const sScore = skillMatch?.score;
  const eScore = experienceMatch?.score;

  let level = "";
  let label = "";
  let color = "";

  // Base classification based on overall weighted score
  if (score < 40) {
    level = "Beginner";
    label = "Low Profile Strength";
    color = "red";
  } else if (score < 70) {
    level = "Intermediate";
    label = "Moderate Profile Strength";
    color = "yellow";
  } else if (score < 85) {
    level = "Advanced";
    label = "Strong Profile";
    color = "blue";
  } else {
    level = "Strong Match";
    label = "Highly Suitable Candidate";
    color = "green";
  }

  // Incorporate skillMatch and experienceMatch for contextual refinement
  const highlights = [];

  // Only add insights if they are available (numeric scores)
  if (typeof sScore === "number") {
    if (sScore >= 90) highlights.push("Exceptional Skills");
    else if (sScore >= 70) highlights.push("Solid Skill Match");
    else if (sScore < 30) highlights.push("Skill Gaps Noted");
  }

  if (typeof eScore === "number") {
    if (eScore >= 90) highlights.push("Deep Experience");
    else if (eScore >= 70) highlights.push("Relevant Background");
    else if (eScore < 30) highlights.push("Experience Mismatch");
  }

  // Update label with highlights if any exist to provide more context
  if (highlights.length > 0) {
    label = `${label} (${highlights.join(" • ")})`;
  }

  return {
    level,
    label,
    color,
    highlights,
  };
}

