/* eslint-disable no-console */
const PII_KEYS = [
  "email",
  "phone",
  "password",
  "address",
  "name",
  "resumeText",
  "secret",
  "token",
  "verificationToken",
  "resetPasswordToken",
  "verificationTokenExpires",
  "resetPasswordExpires"
];

const EMAIL_REGEX = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g;
const PHONE_REGEX = /(?:\+?\d{1,4}[-.\s]?)?(?:\(?\d{2,4}\)?[-.\s]?)?\d{3,4}[-.\s]?\d{3,4}[-.\s]?\d{3,4}\b|\b\d{6,12}\b/g;

/**
 * Sanitizes a string by replacing potential emails and phone numbers with masked values.
 * 
 * @param {string} str - The string to sanitize
 * @returns {string} Sanitized string
 */
export const sanitizeString = (str) => {
  if (typeof str !== "string") return str;
  let sanitized = str;
  // Strip log-injection characters before masking PII to prevent
  // crafted values (e.g., newlines in X-Forwarded-For) from injecting
  // extra entries into structured log files.
  sanitized = sanitized.replace(/[\n\r]+/g, "");
  sanitized = sanitized.replace(EMAIL_REGEX, "[MASKED_EMAIL]");
  sanitized = sanitized.replace(PHONE_REGEX, "[MASKED_PHONE]");
  return sanitized;
};

/**
 * Recursively sanitizes any value (object, array, string) to remove potential PII.
 * 
 * @param {any} val - Value to sanitize
 * @returns {any} Sanitized value
 */
export const sanitizeValue = (val) => {
  if (val === null || val === undefined) return val;

  if (typeof val === "string") {
    return sanitizeString(val);
  }

  if (Array.isArray(val)) {
    return val.map(sanitizeValue);
  }

  if (typeof val === "object") {
    // Return standard built-in objects as is
    if (val instanceof Date || Buffer.isBuffer(val) || val instanceof RegExp) {
      return val;
    }
    
    // Support Error objects specifically (sanitize message and stack trace if present)
    if (val instanceof Error) {
      const sanitizedErr = new Error(sanitizeString(val.message));
      if (val.stack) {
        sanitizedErr.stack = sanitizeString(val.stack);
      }
      return sanitizedErr;
    }

    const sanitizedObj = {};
    for (const key in val) {
      if (Object.prototype.hasOwnProperty.call(val, key)) {
        const lowerKey = key.toLowerCase();
        if (PII_KEYS.some(k => lowerKey.includes(k))) {
          sanitizedObj[key] = "[MASKED_PII]";
        } else {
          sanitizedObj[key] = sanitizeValue(val[key]);
        }
      }
    }
    return sanitizedObj;
  }

  return val;
};

/**
 * Overrides the global console log methods to automatically filter out potential PII keys
 * and mask sensitive values (emails, phone numbers) in development and production.
 */
export const setupGlobalLogSanitizer = () => {
  const originalLog = console.log;
  const originalInfo = console.info;
  const originalWarn = console.warn;
  const originalError = console.error;

  console.log = (...args) => originalLog(...args.map(sanitizeValue));
  console.info = (...args) => originalInfo(...args.map(sanitizeValue));
  console.warn = (...args) => originalWarn(...args.map(sanitizeValue));
  console.error = (...args) => originalError(...args.map(sanitizeValue));
};
