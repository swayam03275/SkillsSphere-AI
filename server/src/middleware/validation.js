import AppError from "../utils/AppError.js";

/**
 * Reusable Zod validation middleware for incoming request body payloads.
 * Strips out any unvalidated/extraneous fields to prevent NoSQL injection.
 * 
 * @param {z.ZodSchema} schema - Zod validation schema
 */
export const validateBody = (schema) => {
  return (req, res, next) => {
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      const errors = {};
      parsed.error.issues.forEach((issue) => {
        const path = issue.path.join(".");
        errors[path] = issue.message;
      });
      const messages = parsed.error.issues.map((issue) => issue.message);
      const err = new AppError(`Validation failed: ${messages.join(", ")}`, 400);
      err.errors = errors;
      return next(err);
    }
    // Replace req.body with validated data to prevent extraneous property/NoSQL injection
    req.body = parsed.data;
    next();
  };
};
