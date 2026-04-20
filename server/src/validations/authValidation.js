import { z } from "zod";

const allowedRoles = ["student", "tutor", "recruiter"];

// Helper for generic validation
const validate = (schema, payload) => {
  const parsed = schema.safeParse(payload);
  if (parsed.success) {
    return { isValid: true, data: parsed.data, errors: [] };
  }
  const errors = parsed.error.issues.map((issue) => ({
    field: issue.path.join("."),
    message: issue.message
  }));
  return { isValid: false, data: null, errors };
};

export const registerSchema = z.object({
  name: z
    .string({ required_error: "Name is required" })
    .trim()
    .min(2, "Name must be at least 2 characters"),
  email: z
    .string({ required_error: "Email is required" })
    .trim()
    .email("Please provide a valid email address")
    .toLowerCase(),
  password: z
    .string({ required_error: "Password is required" })
    .min(8, "Password must be at least 8 characters"),
  role: z
    .string({ required_error: "Role is required" })
    .trim()
    .toLowerCase()
    .refine((value) => allowedRoles.includes(value), {
      message: "Role must be one of: student, tutor, recruiter"
    })
});

export const verifyEmailSchema = z.object({
  email: z.string().email(),
  otp: z.string().min(6).max(6)
});

export const forgotPasswordSchema = z.object({
  email: z.string().email()
});

export const resetPasswordSchema = z.object({
  email: z.string().email(),
  otp: z.string().min(6).max(6),
  newPassword: z.string().min(8)
});

export const loginSchema = z.object({
  email: z
    .string({ required_error: "Email is required" })
    .trim()
    .email("Please provide a valid email address")
    .toLowerCase(),
  password: z
    .string({ required_error: "Password is required" })
    .min(1, "Password is required")
});

export const validateRegisterInput = (payload) => validate(registerSchema, payload);
export const validateVerifyEmailInput = (payload) => validate(verifyEmailSchema, payload);
export const validateForgotPasswordInput = (payload) => validate(forgotPasswordSchema, payload);
export const validateResetPasswordInput = (payload) => validate(resetPasswordSchema, payload);
export const validateResendOTPInput = (payload) => validate(forgotPasswordSchema, payload);
export const validateLoginInput = (payload) => validate(loginSchema, payload);
