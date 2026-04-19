import { z } from "zod";

const allowedRoles = ["student", "tutor", "recruiter"];

export const registerSchema = z.object({
  name: z
    .string({ required_error: "Name is required" })
    .trim()
    .min(2, "Name must be at least 2 characters")
    .max(100, "Name must be at most 100 characters"),
  email: z
    .string({ required_error: "Email is required" })
    .trim()
    .email("Please provide a valid email address")
    .toLowerCase(),
  password: z
    .string({ required_error: "Password is required" })
    .min(8, "Password must be at least 8 characters")
    .max(128, "Password must be at most 128 characters"),
  role: z
    .string({ required_error: "Role is required" })
    .trim()
    .toLowerCase()
    .refine((value) => allowedRoles.includes(value), {
      message: "Role must be one of: student, tutor, recruiter"
    })
});

export const validateRegisterInput = (payload) => {
  const parsed = registerSchema.safeParse(payload);

  if (parsed.success) {
    return { isValid: true, data: parsed.data, errors: [] };
  }

  const errors = parsed.error.issues.map((issue) => ({
    field: issue.path.join("."),
    message: issue.message
  }));

  return { isValid: false, data: null, errors };
};
