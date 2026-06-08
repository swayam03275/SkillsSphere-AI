const REQUIRED_ENV_VARS = [
  { name: "JWT_SECRET", description: "Secret key for signing JWT tokens" },
  { name: "OAUTH_STATE_SECRET", description: "Dedicated HMAC secret for signing Google OAuth state tokens" },
  { name: "GOOGLE_CLIENT_ID", description: "Google Client ID for OAuth authentication" },
  { name: "FILE_URL_SIGNING_SECRET", description: "Secret key for signing protected file URLs" },
  { name: "ENCRYPTION_KEY", description: "AES-256 key for encrypting user PII at rest" },
];

const WEAK_VALUES = new Set([
  "secret",
  "jwtsecret",
  "password",
  "changeme",
  "default",
  "your_jwt_secret",
  "test_secret",
]);

const PLACEHOLDER_PATTERNS = [
  /example/i,
  /changeme/i,
  /your[_-]/i,
  /replace[_-]?me/i,
  /placeholder/i,
  /test[_-]?secret/i,
];

const DATABASE_ENV_NAMES = ["MONGO_URI", "MONGODB_URI", "DATABASE_URL"];
const DATABASE_PROTOCOLS = [
  "mongodb://",
  "mongodb+srv://",
  "postgres://",
  "postgresql://",
  "mysql://",
];

const EXTERNAL_KEYS = [
  "GEMINI_API_KEY",
  "GOOGLE_CLIENT_ID",
  "GOOGLE_CLIENT_SECRET",
  "GOOGLE_CALLBACK_URL",
  "CLOUDINARY_CLOUD_NAME",
  "CLOUDINARY_API_KEY",
  "CLOUDINARY_API_SECRET",
  "SENTRY_DSN",
  "STRIPE_SECRET_KEY",
  "STRIPE_WEBHOOK_SECRET",
];

const EMAIL_ENV_NAMES = [
  "EMAIL_USER",
  "EMAIL_PASS",
  "EMAIL_HOST",
  "EMAIL_PORT",
  "SMTP_HOST",
  "SMTP_PORT",
  "SMTP_USER",
  "SMTP_PASS",
];

const isProduction = (env) => env.NODE_ENV === "production";

const isBlank = (value) => value === undefined || value === null || String(value).trim() === "";

const hasPlaceholderValue = (value) => {
  if (isBlank(value)) return false;
  const normalized = String(value).trim().toLowerCase();
  return WEAK_VALUES.has(normalized) || PLACEHOLDER_PATTERNS.some((pattern) => pattern.test(normalized));
};

const addIssue = (issues, name, message) => {
  issues.push(`${name}: ${message}`);
};

const getEnvValue = (env, names) => {
  for (const name of names) {
    if (!isBlank(env[name])) return { name, value: String(env[name]).trim() };
  }
  return { name: names[0], value: "" };
};

const getCharacterClassCount = (value) => {
  const classes = [
    /[a-z]/.test(value),
    /[A-Z]/.test(value),
    /\d/.test(value),
    /[^A-Za-z0-9]/.test(value),
  ];

  return classes.filter(Boolean).length;
};

const isValidEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

const isValidUrl = (value) => {
  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
};

const hasLocalHost = (value) => {
  try {
    const url = new URL(value);
    return ["localhost", "127.0.0.1", "::1"].includes(url.hostname);
  } catch {
    return /localhost|127\.0\.0\.1|\[::1\]/i.test(value);
  }
};

export const validateRequiredEnv = (env = process.env) => {
  const errors = [];

  for (const requiredVar of REQUIRED_ENV_VARS) {
    if (isBlank(env[requiredVar.name])) {
      addIssue(errors, requiredVar.name, `${requiredVar.description} is required.`);
    }
  }

  return { errors, warnings: [] };
};

export const validateJwtSecret = (env = process.env) => {
  const errors = [];
  const warnings = [];
  const value = env.JWT_SECRET;

  if (isBlank(value)) {
    addIssue(errors, "JWT_SECRET", "Secret key for signing JWT tokens is required.");
    return { errors, warnings };
  }

  const jwtSecret = String(value);
  const production = isProduction(env);
  const weak = hasPlaceholderValue(jwtSecret);
  const tooShortForProduction = jwtSecret.length < 32;
  const lowComplexity = getCharacterClassCount(jwtSecret) < 2 || new Set(jwtSecret).size < 4;

  if (weak) {
    addIssue(
      production ? errors : warnings,
      "JWT_SECRET",
      "must not use a weak, default, or placeholder value.",
    );
  }

  if (production && tooShortForProduction) {
    addIssue(errors, "JWT_SECRET", "must be at least 32 characters in production.");
  } else if (!production && jwtSecret.length < 16) {
    addIssue(warnings, "JWT_SECRET", "is short. Use a longer value before deploying.");
  }

  if (lowComplexity) {
    addIssue(
      production ? errors : warnings,
      "JWT_SECRET",
      "should include enough complexity and variety for production use.",
    );
  }

  return { errors, warnings };
};

export const validateDatabaseUrl = (env = process.env) => {
  const errors = [];
  const warnings = [];
  const production = isProduction(env);
  const { name, value } = getEnvValue(env, DATABASE_ENV_NAMES);

  if (!value) {
    addIssue(
      production ? errors : warnings,
      "MONGO_URI",
      production
        ? "a database connection URL is required in production."
        : "is not set. The server may run in degraded mode without database-backed features.",
    );
    return { errors, warnings };
  }

  if (value === "memory") {
    if (production) {
      addIssue(errors, name, "must not use an in-memory database in production.");
    }
    return { errors, warnings };
  }

  if (!DATABASE_PROTOCOLS.some((protocol) => value.startsWith(protocol))) {
    addIssue(errors, name, "must start with mongodb://, mongodb+srv://, postgres://, postgresql://, or mysql://.");
    return { errors, warnings };
  }

  if (!isValidUrl(value)) {
    addIssue(errors, name, "must be a valid database connection string.");
  }

  if (hasPlaceholderValue(value)) {
    addIssue(production ? errors : warnings, name, "must not contain placeholder values.");
  }

  if (production && hasLocalHost(value) && env.ALLOW_LOCAL_DATABASE_URL !== "true") {
    addIssue(errors, name, "must not point to localhost in production unless ALLOW_LOCAL_DATABASE_URL=true.");
  }

  return { errors, warnings };
};

export const validateEmailConfig = (env = process.env) => {
  const errors = [];
  const warnings = [];
  const production = isProduction(env);
  const emailMode = env.EMAIL_SERVICE_MODE || "console";
  const host = env.EMAIL_HOST || env.SMTP_HOST;
  const port = env.EMAIL_PORT || env.SMTP_PORT;
  const user = env.EMAIL_USER || env.SMTP_USER;
  const pass = env.EMAIL_PASS || env.SMTP_PASS;
  const configuredValues = EMAIL_ENV_NAMES.filter((name) => !isBlank(env[name]));
  const usingSmtp = emailMode === "smtp" || configuredValues.length > 0;
  const issueTarget = production || emailMode === "smtp" ? errors : warnings;

  if (!usingSmtp) return { errors, warnings };

  const missing = [];
  if (isBlank(host)) missing.push("EMAIL_HOST or SMTP_HOST");
  if (isBlank(port)) missing.push("EMAIL_PORT or SMTP_PORT");
  if (isBlank(user)) missing.push("EMAIL_USER or SMTP_USER");
  if (isBlank(pass)) missing.push("EMAIL_PASS or SMTP_PASS");

  if (missing.length > 0) {
    addIssue(issueTarget, "EMAIL_SERVICE_MODE", `SMTP configuration is incomplete. Missing: ${missing.join(", ")}.`);
  }

  if (!isBlank(env.EMAIL_USER) && !isValidEmail(String(env.EMAIL_USER).trim())) {
    addIssue(issueTarget, "EMAIL_USER", "must be a valid email address.");
  }

  if (!isBlank(port)) {
    const portNumber = Number(port);
    if (!Number.isInteger(portNumber) || portNumber < 1 || portNumber > 65535) {
      addIssue(issueTarget, port === env.SMTP_PORT ? "SMTP_PORT" : "EMAIL_PORT", "must be a valid TCP port number.");
    }
  }

  for (const name of EMAIL_ENV_NAMES) {
    if (!isBlank(env[name]) && hasPlaceholderValue(env[name])) {
      addIssue(issueTarget, name, "must not contain placeholder values.");
    }
  }

  return { errors, warnings };
};

export const validateFileSigningSecret = (env = process.env) => {
  const errors = [];
  const warnings = [];
  const production = isProduction(env);
  const value = env.FILE_URL_SIGNING_SECRET;

  if (isBlank(value)) {
    addIssue(
      production ? errors : warnings,
      "FILE_URL_SIGNING_SECRET",
      production
        ? "is required for signing protected file URLs in production."
        : "is not set. Signed file URLs will not work without it.",
    );
    return { errors, warnings };
  }

  const secret = String(value);

  if (hasPlaceholderValue(secret)) {
    addIssue(
      production ? errors : warnings,
      "FILE_URL_SIGNING_SECRET",
      "must not use a weak, default, or placeholder value.",
    );
  }

  if (production && secret.length < 32) {
    addIssue(errors, "FILE_URL_SIGNING_SECRET", "must be at least 32 characters in production.");
  } else if (!production && secret.length < 16) {
    addIssue(warnings, "FILE_URL_SIGNING_SECRET", "is short. Use a longer value before deploying.");
  }

  if (secret === env.JWT_SECRET) {
    addIssue(
      production ? errors : warnings,
      "FILE_URL_SIGNING_SECRET",
      "must not be the same as JWT_SECRET. Use a separate secret for file signing.",
    );
  }

  return { errors, warnings };
};

export const validateEncryptionKey = (env = process.env) => {
  const errors = [];
  const warnings = [];
  const production = isProduction(env);
  const value = env.ENCRYPTION_KEY;

  if (isBlank(value)) {
    // Already caught by REQUIRED_ENV_VARS; skip duplicate messaging.
    return { errors, warnings };
  }

  const key = String(value);

  if (hasPlaceholderValue(key)) {
    addIssue(
      production ? errors : warnings,
      "ENCRYPTION_KEY",
      "must not use a weak, default, or placeholder value.",
    );
  }

  if (production && key.length < 32) {
    addIssue(errors, "ENCRYPTION_KEY", "must be at least 32 characters in production for AES-256 security.");
  } else if (!production && key.length < 16) {
    addIssue(warnings, "ENCRYPTION_KEY", "is short. Use a value of at least 32 characters before deploying.");
  }

  if (key === env.JWT_SECRET) {
    addIssue(
      production ? errors : warnings,
      "ENCRYPTION_KEY",
      "must not be the same as JWT_SECRET. Use a separate dedicated key for field-level encryption.",
    );
  }

  if (key === env.FILE_URL_SIGNING_SECRET) {
    addIssue(
      production ? errors : warnings,
      "ENCRYPTION_KEY",
      "must not be the same as FILE_URL_SIGNING_SECRET. Each secret must be unique.",
    );
  }

  return { errors, warnings };
};

/**
 * Validates OAUTH_STATE_SECRET — the dedicated HMAC key used exclusively
 * for signing and verifying the Google OAuth state parameter.
 *
 * This must be a separate secret from JWT_SECRET to limit the blast radius
 * if any single secret is compromised. Using JWT_SECRET for OAuth state
 * signing means a stolen session key also allows forging OAuth redirects.
 */
export const validateOAuthStateSecret = (env = process.env) => {
  const errors = [];
  const warnings = [];
  const production = isProduction(env);
  const value = env.OAUTH_STATE_SECRET;

  // Presence check — already enforced by REQUIRED_ENV_VARS, but we add
  // context-aware messaging here for a better developer experience.
  if (isBlank(value)) {
    addIssue(
      production ? errors : warnings,
      "OAUTH_STATE_SECRET",
      production
        ? "is required in production for signing Google OAuth state tokens."
        : "is not set. OAuth state tokens will not be signed — open-redirect CSRF is possible.",
    );
    return { errors, warnings };
  }

  const secret = String(value);

  // Must not be a known weak/placeholder value.
  if (hasPlaceholderValue(secret)) {
    addIssue(
      production ? errors : warnings,
      "OAUTH_STATE_SECRET",
      "must not use a weak, default, or placeholder value.",
    );
  }

  // Enforce minimum length — at least 32 chars in production for SHA-256 HMAC.
  if (production && secret.length < 32) {
    addIssue(
      errors,
      "OAUTH_STATE_SECRET",
      "must be at least 32 characters in production for secure HMAC-SHA256 signing.",
    );
  } else if (!production && secret.length < 16) {
    addIssue(
      warnings,
      "OAUTH_STATE_SECRET",
      "is short. Use at least 32 random characters before deploying to production.",
    );
  }

  // Key isolation — OAUTH_STATE_SECRET must be unique from all other secrets.
  // Reusing JWT_SECRET means compromising one key breaks both JWT auth AND OAuth flows.
  if (secret === env.JWT_SECRET) {
    addIssue(
      production ? errors : warnings,
      "OAUTH_STATE_SECRET",
      "must not be the same as JWT_SECRET. Use a separate dedicated secret for OAuth state signing.",
    );
  }

  if (secret === env.FILE_URL_SIGNING_SECRET) {
    addIssue(
      production ? errors : warnings,
      "OAUTH_STATE_SECRET",
      "must not be the same as FILE_URL_SIGNING_SECRET. Each secret must be cryptographically unique.",
    );
  }

  if (secret === env.ENCRYPTION_KEY) {
    addIssue(
      production ? errors : warnings,
      "OAUTH_STATE_SECRET",
      "must not be the same as ENCRYPTION_KEY. Each secret must be cryptographically unique.",
    );
  }

  return { errors, warnings };
};

export const validateExternalApiKeys = (env = process.env) => {
  const errors = [];
  const warnings = [];
  const production = isProduction(env);

  if (production && isBlank(env.GOOGLE_CLIENT_SECRET)) {
    addIssue(errors, "GOOGLE_CLIENT_SECRET", "is required for Google OAuth in production.");
  }

  if (production && isBlank(env.GOOGLE_CALLBACK_URL)) {
    addIssue(errors, "GOOGLE_CALLBACK_URL", "is required for Google OAuth in production.");
  }

  for (const name of EXTERNAL_KEYS) {
    const value = env[name];
    if (isBlank(value)) continue;

    if (hasPlaceholderValue(value)) {
      addIssue(production ? errors : warnings, name, "must not use a placeholder or default value.");
    }
  }

  if (!isBlank(env.GOOGLE_CLIENT_ID) && !String(env.GOOGLE_CLIENT_ID).includes(".apps.googleusercontent.com")) {
    addIssue(
      production ? errors : warnings,
      "GOOGLE_CLIENT_ID",
      "does not look like a Google OAuth client ID.",
    );
  }

  if (!isBlank(env.GOOGLE_CALLBACK_URL) && !isValidUrl(String(env.GOOGLE_CALLBACK_URL).trim())) {
    addIssue(production ? errors : warnings, "GOOGLE_CALLBACK_URL", "must be a valid URL.");
  }

  if (!isBlank(env.SENTRY_DSN) && !/^https:\/\/.+@.+\/\d+$/i.test(String(env.SENTRY_DSN).trim())) {
    addIssue(production ? errors : warnings, "SENTRY_DSN", "does not look like a valid Sentry DSN.");
  }

  return { errors, warnings };
};

export const validateSocketRateLimiterConfig = (env = process.env) => {
  const errors = [];
  const warnings = [];
  const production = isProduction(env);

  const maybeInt = (name) => {
    const v = env[name];
    if (isBlank(v)) return null;
    const n = Number(v);
    if (!Number.isFinite(n) || n < 0) {
      addIssue(production ? errors : warnings, name, `must be a non-negative integer.`);
      return null;
    }
    return Math.floor(n);
  };

  const windowMs = maybeInt("SOCKET_RATE_WINDOW_MS");
  const maxEvents = maybeInt("SOCKET_RATE_MAX_EVENTS");
  const warningPercent = maybeInt("SOCKET_RATE_WARNING_PERCENT");
  const warningCooldown = maybeInt("SOCKET_RATE_WARNING_COOLDOWN_MS");

  if (windowMs !== null && windowMs <= 0) addIssue(production ? errors : warnings, "SOCKET_RATE_WINDOW_MS", "must be greater than 0");
  if (maxEvents !== null && maxEvents <= 0) addIssue(production ? errors : warnings, "SOCKET_RATE_MAX_EVENTS", "must be greater than 0");
  if (warningPercent !== null && (warningPercent < 0 || warningPercent > 100)) addIssue(production ? errors : warnings, "SOCKET_RATE_WARNING_PERCENT", "must be between 0 and 100");
  if (warningCooldown !== null && warningCooldown < 0) addIssue(production ? errors : warnings, "SOCKET_RATE_WARNING_COOLDOWN_MS", "must be non-negative");

  const enabled = env.SOCKET_RATE_ENABLED;
  if (!isBlank(enabled) && !["true", "false"].includes(String(enabled).toLowerCase())) {
    addIssue(production ? errors : warnings, "SOCKET_RATE_ENABLED", "must be 'true' or 'false'");
  }

  return { errors, warnings };
};

export const collectEnvValidationIssues = (env = process.env) => {
  const checks = [
    validateRequiredEnv,
    validateJwtSecret,
    validateOAuthStateSecret,
    validateEncryptionKey,
    validateDatabaseUrl,
    validateEmailConfig,
    validateExternalApiKeys,
    validateFileSigningSecret,
    validateSocketRateLimiterConfig,
  ];

  return checks.reduce(
    (result, check) => {
      const { errors, warnings } = check(env);
      result.errors.push(...errors);
      result.warnings.push(...warnings);
      return result;
    },
    { errors: [], warnings: [] },
  );
};

const logIssues = (messages, label, logFn) => {
  if (messages.length === 0) return;
  logFn(`${label}:`);
  for (const message of messages) {
    logFn(`  - ${message}`);
  }
};

export const validateEnv = (env = process.env, options = {}) => {
  const {
    exitOnError = true,
    logger = console,
  } = options;
  const { errors, warnings } = collectEnvValidationIssues(env);

  logIssues(warnings, "Environment configuration warnings", logger.warn.bind(logger));

  if (errors.length > 0) {
    logIssues(errors, "FATAL: Invalid environment configuration", logger.error.bind(logger));
    logger.error("\nPlease fix the environment variables in your server/.env file.");

    if (exitOnError) {
      process.exit(1);
    }

    throw new Error(errors.join("\n"));
  }

  return { errors, warnings };
};

export default validateEnv;
