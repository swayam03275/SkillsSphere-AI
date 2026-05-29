import AppError from "../utils/AppError.js";

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

  if (err.status === 401) {
    message = "AI Authentication failed. Please check system configuration.";
    statusCode = 500;
  } else if (err.status === 429) {
    message = "AI Rate limit exceeded. Please wait a moment.";
    statusCode = 429;
  } else if (err.code === 'ETIMEDOUT' || err.status === 408) {
    message = "AI Analysis timed out. Please try a shorter resume or retry.";
    statusCode = 408;
  }

  return new AppError(message, statusCode);
};

const globalErrorHandler = (err, req, res, next) => {
  let error = Object.assign(err);
  error.message = err.message;

  if (error.name === "CastError") error = handleCastErrorDB(error);
  if (error.code === 11000) error = handleDuplicateFieldsDB(error);
  if (error.name === "ValidationError") error = handleValidationErrorDB(error);
  
  // Handle AI/OpenAI Errors
  if (error.isAxiosError || error.name === 'GoogleGenerativeAIError' || error.type === 'invalid_request_error') {
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
      console.error("ERROR 💥", error);
      res.status(500).json({
        success: false,
        status: "error",
        message: "Something went very wrong!",
      });
    }
  }
};

export default globalErrorHandler;
