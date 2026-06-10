import { z } from 'zod';

export const updateProfileSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').optional(),
  role: z.string().optional(),
  company: z.string().optional(),
  companyWebsite: z.string().url('Invalid URL').optional(),
  bio: z.string().optional(),
  skills: z.array(z.string()).optional(),
  experience: z.array(z.any()).optional(),
  education: z.array(z.any()).optional(),
});

export const updatePreferencesSchema = z.object({
  notifications: z.object({
    emailNotifications: z.boolean().optional(),
    interviewReminders: z.boolean().optional(),
    jobAlerts: z.boolean().optional(),
    applicationStatusUpdates: z.boolean().optional(),
    platformUpdates: z.boolean().optional(),
  }).optional(),
  emailFrequency: z.enum(['daily', 'weekly', 'monthly', 'never']).optional(),
  privacy: z.record(z.any()).optional(),
});
