import { z } from "zod";

const objectIdRegex = /^[0-9a-fA-F]{24}$/;

export const generateCoverLetterSchema = z.object({
  resumeId: z
    .string({ required_error: "Resume ID is required" })
    .regex(objectIdRegex, "Invalid Resume ID format"),
  jobDescription: z
    .string({ required_error: "Job Description is required" })
    .trim()
    .min(1, "Job Description cannot be empty")
    .max(5000, "Job Description must not exceed 5000 characters"),
});
