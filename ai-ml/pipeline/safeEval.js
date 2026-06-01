import logger from "../utils/logger.js";

export async function safeEval(name, fn, validateFn, fallback = { score: 0, error: true, details: {}, meta: {} }) {
  try {
    const result = await fn();
    const { name: _name, ...dataToValidate } = { ...result };
    const validated = validateFn({
      key: dataToValidate.key || name,
      label: dataToValidate.label || name,
      ...dataToValidate,
    });
    return { ...validated, name };
  } catch (err) {
    logger.error(`[safeEval] Evaluator "${name}" contract violation or failure:`, err?.message || err);
    return {
      ...fallback,
      key: name,
      label: name,
      name,
      weight: 0,
      weightedScore: 0,
      summary: "Evaluator failed to run.",
    };
  }
}

export default safeEval;
