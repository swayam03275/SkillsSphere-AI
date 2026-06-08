import { z } from "zod";

// --- Reusable sub-schemas ---
const flexibleRecordSchema = z.record(z.string(), z.unknown()).default({});

const scoreSchema = z.number().min(0).max(100);

const weightSchema = z.number().min(0).max(1);

// --- Feedback/suggestions array schema ---
const stringArraySchema = z.array(z.string()).default([]);

// --- Details schema with known common fields + passthrough for extras ---
const detailsSchema = z
  .object({
    feedback: stringArraySchema,
    suggestions: stringArraySchema,
  })
  .catchall(z.unknown())
  .default({});

// --- Meta schema with known common fields + passthrough for extras ---
const metaSchema = z
  .object({
    isSeniorRole: z.boolean().optional(),
    isOverqualified: z.boolean().optional(),
    domain: z.string().optional(),
    domainsDetected: z.number().int().min(0).optional(),
  })
  .catchall(z.unknown())
  .default({});

// --- Core evaluator result schema ---
const evaluatorResultSchema = z
  .object({
    key: z.string().trim().min(1, "key must not be empty"),
    label: z.string().trim().min(1, "label must not be empty"),
    score: scoreSchema,
    weight: weightSchema.optional(),
    weightedScore: scoreSchema.optional(),
    summary: z.string().default(""),
    details: detailsSchema,
    meta: metaSchema,
  })
  .strict();

// --- Batch schema for validating multiple evaluator results at once ---
const evaluatorResultArraySchema = z
  .array(evaluatorResultSchema)
  .min(1, "At least one evaluator result required");

// --- Partial schema for validating incomplete/draft results ---
const partialEvaluatorResultSchema = evaluatorResultSchema.partial().required({
  key: true,
  score: true,
});

// --- Safe parse wrapper — returns { success, data, error } instead of throwing ---
const safeValidateEvaluatorResult = (result) => {
  const parsed = evaluatorResultSchema.safeParse(result);
  if (!parsed.success) {
    return {
      success: false,
      data: null,
      error: parsed.error.errors.map((e) => ({
        field: e.path.join("."),
        message: e.message,
      })),
    };
  }
  return { success: true, data: parsed.data, error: null };
};

// --- Validate and strip unknown keys (coerce mode) ---
const coerceEvaluatorResult = (result) => {
  return evaluatorResultSchema.strip().parse(result);
};

// --- Validate array of results ---
const validateEvaluatorResults = (results) => {
  return evaluatorResultArraySchema.parse(results);
};

// --- Validate partial/draft result ---
const validatePartialEvaluatorResult = (result) => {
  return partialEvaluatorResultSchema.parse(result);
};

// --- Primary validator (throws on invalid) ---
const validateEvaluatorResult = (result) => evaluatorResultSchema.parse(result);

export {
  validateEvaluatorResult,
  safeValidateEvaluatorResult,
  validateEvaluatorResults,
  validatePartialEvaluatorResult,
  coerceEvaluatorResult,
  evaluatorResultSchema,
  partialEvaluatorResultSchema,
};