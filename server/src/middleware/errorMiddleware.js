import AppError from "../utils/AppError.js";

import logger from "../utils/logger.js";

const handleCastErrorDB = (err) => {
  const message = `Invalid ${err.path}: ${err.value}.`;
  return new AppError(message, 400);
};

const handleDuplicateFieldsDB = (err) => {
  // MongoDB duplicate key errors usually look like:
  // - err.code === 11000
  // - message includes: "dup key: { <field>: \"<value>\" }"
  // - and may also include: err.keyValue === { <field>: <value> }

  // Preferred: keyValue (works regardless of MongoDB version / message format)
  if (err?.keyValue && typeof err.keyValue === "object") {
    const keys = Object.keys(err.keyValue);
    if (keys.length > 0) {
      const firstKey = keys[0];
      const rawValue = err.keyValue[firstKey];
      const value =
        rawValue === null || rawValue === undefined
          ? "unknown"
          : String(rawValue).replace(/^['"]|['"]$/g, "");

      const message = `Duplicate field value: ${value}. Please use another value!`;
      return new AppError(message, 400);
    }
  }

  // Fallback: parse message "dup key: { ...: \"VALUE\" }"
  const raw = err?.errmsg || err?.message || "";

  // Capture either a quoted string or a number-like value inside the dup key object.
  // Example: dup key: { email: "a@b.com" }
  const match = raw.match(/dup key:\s*\{[^}]*:\s*(?:"([^"]*)"|'([^']*)'|([^\s}]+))\s*\}/i);

  const value = match
    ? String(match[1] || match[2] || match[3] || "unknown").trim()
    : "unknown";

  const message = `Duplicate field value: ${value}. Please use another value!`;
  return new AppError(message, 400);
};

const handleValidationErrorDB = (err) => {
  // Build field-level errors object for frontend consumption.
  // Hardened: Mongoose ValidationError should have `err.errors`,
  // but some callers/mocked errors may pass it as undefined or non-object.
  const rawErrors = err?.errors;

  if (!rawErrors || typeof rawErrors !== "object") {
    const message = "Invalid input data.";
    const error = new AppError(message, 400);
    error.errors = {};
    return error;
  }

  const errors = {};
  Object.keys(rawErrors).forEach((key) => {
    const fieldErr = rawErrors[key];
    errors[key] = fieldErr?.message || "Invalid value";
  });

  const messages = Object.values(rawErrors)
    .map((el) => el?.message)
    .filter((m) => typeof m === "string" && m.trim().length > 0)
    // Keep original field message text intact for clarity.
    .map((m) => m.trim());

  const message = messages.length
    ? `Invalid input data: ${messages.join("; ")}`
    : "Invalid input data.";


  const error = new AppError(message, 400);
  error.errors = errors; // Attach field-level errors
  return error;
};

const handleAIError = (err) => {
  let message = "AI service is currently unavailable. Please try again later.";
  let statusCode = 503;

  const status = typeof err?.status === "number" ? err.status : undefined;
  const code = typeof err?.code === "string" ? err.code : undefined;
  const rawMessage = typeof err?.message === "string" ? err.message : "";
  const text = rawMessage.toLowerCase();

  // Common HTTP status equivalents (work for Axios/OpenAI-like errors,
  // and also for Gemini errors that include status).
  if (status === 401) {
    message = "AI Authentication failed. Please check system configuration.";
    statusCode = 401;
  } else if (status === 403) {
    message = "AI access forbidden. Please check permissions/configuration.";
    statusCode = 403;
  } else if (status === 429) {
    message = "AI Rate limit exceeded. Please wait a moment.";
    statusCode = 429;
  } else if (status === 408) {
    message = "AI request timed out. Please retry.";
    statusCode = 408;
  }

  // Network/transport timeouts
  if (code === "ETIMEDOUT") {
    message = "AI request timed out. Please retry.";
    statusCode = 408;
  }

  // Gemini / Google Generative AI heuristics (error shapes vary by failure mode)
  // Try best-effort mapping based on message content.
  if (text) {
    if (
      text.includes("quota") ||
      text.includes("rate limit") ||
      text.includes("too many requests") ||
      text.includes("resource exhausted")
    ) {
      message = "AI quota/rate limit exceeded. Please wait a moment and retry.";
      statusCode = 429;
    } else if (
      text.includes("invalid argument") ||
      text.includes("invalid request") ||
      text.includes("bad request")
    ) {
      message = "AI request was invalid. Please adjust the input and retry.";
      statusCode = 400;
    } else if (
      text.includes("unauthorized") ||
      text.includes("authentication") ||
      text.includes("invalid api key")
    ) {
      message = "AI Authentication failed. Please check system configuration.";
      statusCode = 401;
    } else if (
      text.includes("permission") ||
      text.includes("forbidden") ||
      text.includes("access denied")
    ) {
      message = "AI access forbidden. Please check permissions/configuration.";
      statusCode = 403;
    } else if (
      text.includes("deadline") ||
      text.includes("timeout") ||
      text.includes("timed out") ||
      text.includes("temporarily unavailable")
    ) {
      message = "AI request timed out. Please retry.";
      statusCode = 408;
    } else if (text.includes("not configured") || text.includes("unconfigured")) {
      message = "AI service is currently unconfigured. Please set GEMINI_API_KEY in .env.";
      statusCode = 503;
    }
  }

  // Fallbacks by error code if present
  if (!text) {
    if (code === "400" || code === "INVALID_ARGUMENT") {
      message = "AI request was invalid. Please adjust the input and retry.";
      statusCode = 400;
    } else if (code === "401" || code === "UNAUTHENTICATED") {
      message = "AI Authentication failed. Please check system configuration.";
      statusCode = 401;
    } else if (code === "403" || code === "PERMISSION_DENIED") {
      message = "AI access forbidden. Please check permissions/configuration.";
      statusCode = 403;
    }
  }

  return new AppError(message, statusCode);
};


const globalErrorHandler = (err, req, res, next) => {
  let error = Object.assign(err);
  error.message = err.message;

  if (error.name === "CastError") error = handleCastErrorDB(error);
  if (error.code === 11000) error = handleDuplicateFieldsDB(error);
  if (error.name === "ValidationError") error = handleValidationErrorDB(error);
  
  // Handle AI errors (Gemini/Google Generative AI + AI-specific Axios errors)
  // IMPORTANT: Avoid misclassification of non-AI Axios errors.
  //
  // This handler classifies AI failures ONLY when:
  //  1) The failing request is explicitly tagged with header `x-ai-provider`, or
  //  2) The error is a strongly-typed AI SDK error (e.g. GoogleGenerativeAI).
  //
  // It intentionally does NOT use URL substring heuristics (e.g. googleapis.com / gemini).

  const headers = error?.config?.headers;
  const headerObj = headers && typeof headers === "object" ? headers : {};
  const headerKeysLower = Object.keys(headerObj).reduce((acc, k) => {
    acc[k.toLowerCase()] = headerObj[k];
    return acc;
  }, {});

  const aiProvider =
    headerKeysLower["x-ai-provider"] ??
    headerKeysLower["x-ai_provider"] ??
    headerKeysLower["x-ai-client"] ??
    headerKeysLower["x-ai_client"];

  const normalizedProvider =
    typeof aiProvider === "string" ? aiProvider.trim().toLowerCase() : "";

  const allowedProviders = new Set([
    // Current module uses Gemini
    "gemini",
    // Reserve common providers for future integrations
    "openai",
    "anthropic",
    "google",
    "google-generative-ai",
  ]);

  const isTaggedAiAxiosError =
    error.isAxiosError && normalizedProvider && allowedProviders.has(normalizedProvider);

  // Also allow strongly-typed AI SDK errors (no URL/message heuristics)
  const isTypedGeminiSdkError = error?.name === "GoogleGenerativeAI";

  if (isTaggedAiAxiosError || isTypedGeminiSdkError) {
    error = handleAIError(error);
  }


  
  // Preserve field-level errors from Mongoose if present (deterministic)
  // Prefer any field-level errors already attached to `error`, but fall back
  // to the original mongoose `err.errors` when missing or empty.
  if (err?.errors) {
    const hasExistingErrors =
      error?.errors &&
      typeof error.errors === "object" &&
      Object.keys(error.errors).length > 0;

    if (!hasExistingErrors) {
      error.errors = {};
      Object.keys(err.errors).forEach((key) => {
        error.errors[key] = err.errors[key].message;
      });
    }
  }

  error.statusCode = error.statusCode || 500;
  error.status = error.status || "error";

  if (process.env.NODE_ENV === "development") {
    res.status(error.statusCode).json({
      success: false,
      status: error.status,
      error: error,
      message: error.message,
      stack: error.stack,
    });
  } else {
    // Production
    if (error.isOperational) {
      res.status(error.statusCode).json({
        success: false,
        status: error.status,
        statusCode: error.statusCode,
        message: error.message,
        errors: error.errors || {}, // Include field-level errors if available
      });
    } else {
      logger.error("ERROR 💥", error);

      // Standardize non-operational error payload shape for frontend reliability.
      // Frontend may expect `errors` and `statusCode` consistently.
      const statusCode = 500;

      res.status(statusCode).json({
        success: false,
        status: "error",
        statusCode,
        message: "Something went very wrong!",
        errors: {},
      });
    }

  }
};

export default globalErrorHandler;
