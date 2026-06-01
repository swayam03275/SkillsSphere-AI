import { z } from 'zod';

let validateEvaluatorResult;

const flexibleRecordSchema = z.record(z.string(), z.unknown()).default({});
const evaluatorResultSchema = z
  .object({
    key: z.string().trim().min(1),
    label: z.string().trim().min(1),
    score: z.number().min(0).max(100),
    weight: z.number().min(0).max(1).optional(),
    weightedScore: z.number().min(0).max(100).optional(),
    summary: z.string().default(""),
    details: flexibleRecordSchema,
    meta: flexibleRecordSchema,
  })
  .strict();

validateEvaluatorResult = (result) => evaluatorResultSchema.parse(result);

export { validateEvaluatorResult };

