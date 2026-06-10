import { z } from 'zod';

export const jobPostingSchema = z.object({
  title: z.string().min(3, 'Job title must be at least 3 characters'),
  description: z.string().min(10, 'Description must be at least 10 characters'),
  company: z.string().min(2, 'Company name is required'),
  location: z.string().min(2, 'Location is required'),
  salary: z.string().optional(),
  type: z.enum(['full-time', 'part-time', 'contract', 'internship', 'freelance']).optional(),
  requirements: z.array(z.string()).optional(),
  responsibilities: z.array(z.string()).optional(),
  status: z.enum(['open', 'closed', 'draft']).optional(),
});

export const updateJobSchema = jobPostingSchema.partial();

export const applyToJobSchema = z.object({
  resumeId: z.string().optional(),
  resumeLink: z.string().url('Invalid URL').optional(),
  coverNote: z.string().optional(),
}).refine(data => data.resumeId || data.resumeLink, {
  message: "Either resumeId or resumeLink must be provided",
  path: ["resumeId"]
});

export const updateApplicationStatusSchema = z.object({
  status: z.enum(['pending', 'reviewed', 'shortlisted', 'rejected', 'hired', 'withdrawn']),
  comment: z.string().optional(),
});

export const updateStudentApplicationStatusSchema = z.object({
  studentStatus: z.enum(['active', 'withdrawn', 'accepted', 'declined']),
});
