import { jdWeights, noJdWeights } from "../config/weights.config.js";

export function aggregateResults(evaluations, isJDProvided = true) {
  let totalWeight = 0;
  let weightedScoreSum = 0;
  const breakdown = {};

  const weights = isJDProvided ? jdWeights : noJdWeights;

  const toCamel = (s) => {
    if (!s || typeof s !== "string") return s;
    const cleaned = s.replace(/([a-z0-9])([A-Z])/g, "$1 $2").replace(/[_\-\s]+/g, " ").trim().toLowerCase();
    return cleaned.replace(/ (.)/g, (m, p1) => p1.toUpperCase());
  };

  evaluations.forEach((evalResult) => {
    if (!evalResult || (evalResult.score === null && isJDProvided)) return;

    const raw = evalResult.name ?? evalResult.key ?? evalResult.label;
    const name = toCamel(raw);
    const weight = weights[name] || 0;

    evalResult.name = name;
    evalResult.weight = weight;
    evalResult.weightedScore = evalResult.score !== null ? Math.round(evalResult.score * weight) : 0;

    if (weight > 0 && evalResult.score !== null) {
      totalWeight += weight;
      weightedScoreSum += evalResult.score * weight;
    }

    breakdown[name] = evalResult.score;
  });

  const finalScore = totalWeight > 0 ? Math.round(weightedScoreSum / totalWeight) : 0;

  return { score: finalScore, breakdown };
}

