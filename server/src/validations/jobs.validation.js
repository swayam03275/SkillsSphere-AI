import { z } from 'zod';

export const jobPostingSchema = z.object({
  title: z.string()
    .trim()
    .min(5, 'Job title must be at least 5 characters')
    .max(100, 'Job title cannot exceed 100 characters'),
  description: z.string()
    .trim()
    .transform(val => val.replace(/\0/g, "").replace(/<[^>]*>/g, ""))
    .refine(val => val.length >= 20, { message: 'Description must be at least 20 characters' })
    .refine(val => val.length <= 5000, { message: 'Description cannot exceed 5000 characters' }),
  location: z.object({
    city: z.string().trim().min(1, 'City is required'),
    state: z.string().trim().min(1, 'State is required'),
    country: z.string().trim().optional(),
    remote: z.boolean().optional(),
  }),
  salary: z.object({
    min: z.number().min(0, 'Minimum salary cannot be negative'),
    max: z.number().min(0, 'Maximum salary cannot be negative'),
    currency: z.string().optional(),
    isNegotiable: z.boolean().optional(),
  }).refine(data => data.max >= data.min, {
    message: "Maximum salary must be greater than or equal to minimum salary",
    path: ["max"]
  }),
  skills: z.array(z.string().trim())
    .min(1, 'At least one skill is required')
    .transform(arr => arr.map(s => s.toLowerCase()).filter(Boolean)),
  experienceRequired: z.number().optional(),
  jobLevel: z.string().optional(),
  requirements: z.array(z.string()).optional(),
  responsibilities: z.array(z.string()).optional(),
  keywords: z.array(z.string()).optional(),
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
