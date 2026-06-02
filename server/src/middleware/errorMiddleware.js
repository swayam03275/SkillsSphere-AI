import AppError from "../utils/AppError.js";

import logger from "../utils/logger.js";

const handleCastErrorDB = (err) => {
  const message = `Invalid ${err.path}: ${err.value}.`;
  return new AppError(message, 400);
};

const handleDuplicateFieldsDB = (err) => {
  const raw = err.errmsg || err.message || "";
  const match = raw.match(/(["'])(\\?.)*?\1/);
  const value = match ? match[0] : "unknown";
  const message = `Duplicate field value: ${value}. Please use another value!`;
  return new AppError(message, 400);
};

const handleValidationErrorDB = (err) => {
  // Build field-level errors object for frontend consumption
  const errors = {};
  Object.keys(err.errors).forEach((key) => {
    errors[key] = err.errors[key].message;
  });
  
  const messages = Object.values(err.errors).map((el) => el.message);
  const message = `Invalid input data. ${messages.join(". ")}`;
  
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
  
  // Handle AI errors (Axios/OpenAI-like + Gemini/Google Generative AI)
  if (
    error.isAxiosError ||
    error.type === "invalid_request_error" ||
    error?.name === "GoogleGenerativeAI" ||
    error?.provider === "google" ||
    error?.status != null ||
    /gemini|generative ai|google/i.test(String(error?.message || ""))
  ) {
    error = handleAIError(error);
  }

  
  // Preserve field-level errors from Mongoose if present
  if (err.errors && !error.errors) {
    error.errors = {};
    Object.keys(err.errors).forEach((key) => {
      error.errors[key] = err.errors[key].message;
    });
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
        message: error.message,
        errors: error.errors || {}, // Include field-level errors if available
      });
    } else {
      logger.error("ERROR 💥", error);
      res.status(500).json({
        success: false,
        status: "error",
        message: "Something went very wrong!",
      });
    }
  }
};

export default globalErrorHandler;
