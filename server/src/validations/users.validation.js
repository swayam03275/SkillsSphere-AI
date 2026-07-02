import { z } from 'zod';

const hasValidDomainHostname = (hostname) => {
  const normalizedHostname = hostname.toLowerCase();

  if (
    normalizedHostname === "localhost" ||
    normalizedHostname.includes("..") ||
    !normalizedHostname.includes(".")
  ) {
    return false;
  }

  return /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+$/.test(
    normalizedHostname,
  );
};

const isValidCompanyWebsite = (value) => {
  const trimmedValue = value.trim();
  if (!trimmedValue) return true;

  try {
    const parsedUrl = new URL(
      /^https?:\/\//i.test(trimmedValue) ? trimmedValue : `https://${trimmedValue}`,
    );

    return (
      ["http:", "https:"].includes(parsedUrl.protocol) &&
      hasValidDomainHostname(parsedUrl.hostname)
    );
  } catch {
    return false;
  }
};

const companyWebsiteSchema = z
  .string()
  .trim()
  .refine(isValidCompanyWebsite, "Invalid URL")
  .optional();

export const onboardUserSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  role: z.enum(['student', 'tutor', 'recruiter']),
});

export const updateProfileSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').optional(),
  role: z.string().optional(),
  company: z.string().optional(),
  companyWebsite: companyWebsiteSchema,
  linkedinUrl: z.string().optional(),
  credentialUrl: z.string().optional(),
  bio: z.string().optional(),
  skills: z.array(z.string()).optional(),
  experience: z.array(z.any()).optional(),
  education: z.array(z.any()).optional(),
});

const notificationPreferencesSchema = z.object({
  emailNotifications: z.boolean().optional(),
  inAppNotifications: z.boolean().optional(),
  interviewReminders: z.boolean().optional(),
  jobUpdates: z.boolean().optional(),
  resumeAnalysis: z.boolean().optional(),
  systemAlerts: z.boolean().optional(),
}).strict();

const privacyPreferencesSchema = z.object({
  profileVisibility: z.enum(['public', 'recruiters', 'private']).optional(),
  showResumeToRecruiters: z.boolean().optional(),
  showInterviewHistory: z.boolean().optional(),
  allowPersonalizedRecommendations: z.boolean().optional(),
}).strict();

export const updatePreferencesSchema = z.object({
  notifications: notificationPreferencesSchema.optional(),
  emailFrequency: z.enum(['instant', 'daily', 'weekly', 'never']).optional(),
  privacy: privacyPreferencesSchema.optional(),
}).strict();

const passwordSchema = z
  .string({ required_error: "Password is required" })
  .min(8, "Password must be at least 8 characters")
  .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
  .regex(/[a-z]/, "Password must contain at least one lowercase letter")
  .regex(/[0-9]/, "Password must contain at least one number")
  .regex(/[^A-Za-z0-9\s]/, "Password must contain at least one special character");

export const updatePasswordSchema = z.object({
  currentPassword: z.string({ required_error: "Current password is required" }).min(1, "Current password is required"),
  newPassword: passwordSchema,
});
