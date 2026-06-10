import { z } from "zod";

const allowedRoles = ["student"];

const passwordSchema = z
  .string({ required_error: "Password is required" })
  .min(8, "Password must be at least 8 characters")
  .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
  .regex(/[a-z]/, "Password must contain at least one lowercase letter")
  .regex(/[0-9]/, "Password must contain at least one number")
  .regex(/[^A-Za-z0-9\s]/, "Password must contain at least one special character");

const otpSchema = z
  .string({ required_error: "OTP is required" })
  .regex(/^\d{6}$/, "OTP must be exactly 6 numeric digits");
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
  password: passwordSchema,
  role: z
    .string()
    .trim()
    .toLowerCase()
    .refine((value) => allowedRoles.includes(value), {
      message: "Role must be: student"
    })
    .optional()
    .default("student")
});

export const verifyEmailSchema = z.object({
  email: z.string().email(),
  otp: otpSchema
});

export const forgotPasswordSchema = z.object({
  email: z.string().email()
});

export const resetPasswordSchema = z.object({
  email: z.string().email(),
  otp: otpSchema,
  newPassword: passwordSchema
});

export const loginSchema = z.object({
  email: z
    .string({ required_error: "Email is required" })
    .trim()
    .email("Please provide a valid email address")
    .toLowerCase(),
  password: passwordSchema
});

export const validateRegisterInput = (payload) => validate(registerSchema, payload);
export const validateLoginInput = (payload) => validate(loginSchema, payload);
export const validateVerifyEmailInput = (payload) => validate(verifyEmailSchema, payload);
export const validateForgotPasswordInput = (payload) => validate(forgotPasswordSchema, payload);
export const validateResetPasswordInput = (payload) => validate(resetPasswordSchema, payload);
export const validateResendOTPInput = (payload) => validate(forgotPasswordSchema, payload);
