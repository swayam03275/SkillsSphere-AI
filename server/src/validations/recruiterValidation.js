import { z } from "zod";

const objectIdRegex = /^[0-9a-fA-F]{24}$/;
export const objectIdSchema = z
  .string({ required_error: "ID is required" })
  .regex(objectIdRegex, "Invalid ID format");

export const matchCandidateSchema = z.object({
  candidateId: objectIdSchema,
  jobId: objectIdSchema,
});

export const inviteCandidateSchema = z.object({
  candidateId: objectIdSchema,
  jobId: objectIdSchema,
});
