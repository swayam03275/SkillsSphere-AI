import assert from "node:assert/strict";
import test from "node:test";
import {
  collectEnvValidationIssues,
  validateDatabaseUrl,
  validateEmailConfig,
  validateEnv,
  validateExternalApiKeys,
  validateJwtSecret,
  validateRequiredEnv,
} from "../validateEnv.js";

const validBaseEnv = {
  NODE_ENV: "production",
  JWT_SECRET: "Str0ngProductionSecretValueForJwt!",
  GOOGLE_CLIENT_ID: "1234567890-test.apps.googleusercontent.com",
  GOOGLE_CLIENT_SECRET: "google-oauth-client-secret",
  GOOGLE_CALLBACK_URL: "https://api.skillssphere.ai/api/auth/google/callback",
  MONGO_URI: "mongodb+srv://user:pass@cluster0.mongodb.net/skillssphere",
  FILE_URL_SIGNING_SECRET: "Str0ngFileSigningSecretValue32Chars!",
};

test("validateRequiredEnv reports missing required environment variables", () => {
  const { errors } = validateRequiredEnv({});

  assert.ok(errors.some((error) => error.includes("JWT_SECRET")));
  assert.ok(errors.some((error) => error.includes("GOOGLE_CLIENT_ID")));
});

test("validateJwtSecret rejects weak default values", () => {
  const { errors } = validateJwtSecret({
    NODE_ENV: "production",
    JWT_SECRET: "secret",
  });

  assert.ok(errors.some((error) => error.includes("weak")));
  assert.ok(errors.every((error) => !error.includes("secret")));
});

test("validateJwtSecret rejects short production secrets", () => {
  const { errors } = validateJwtSecret({
    NODE_ENV: "production",
    JWT_SECRET: "BetterButShort123!",
  });

  assert.ok(errors.some((error) => error.includes("at least 32 characters")));
});

test("validateJwtSecret accepts valid production secrets", () => {
  const { errors, warnings } = validateJwtSecret(validBaseEnv);

  assert.deepEqual(errors, []);
  assert.deepEqual(warnings, []);
});

test("validateDatabaseUrl rejects invalid database URLs", () => {
  const { errors } = validateDatabaseUrl({
    NODE_ENV: "production",
    MONGO_URI: "ftp://database.internal/app",
  });

  assert.ok(errors.some((error) => error.includes("must start with")));
});

test("validateDatabaseUrl blocks localhost in production", () => {
  const { errors } = validateDatabaseUrl({
    NODE_ENV: "production",
    MONGO_URI: "mongodb://localhost:27017/skillssphere",
  });

  assert.ok(errors.some((error) => error.includes("localhost")));
});

test("validateEmailConfig warns for partial development SMTP config", () => {
  const { errors, warnings } = validateEmailConfig({
    NODE_ENV: "development",
    EMAIL_USER: "admin@example.com",
  });

  assert.deepEqual(errors, []);
  assert.ok(warnings.some((warning) => warning.includes("SMTP configuration is incomplete")));
});

test("validateEmailConfig rejects invalid production SMTP config", () => {
  const { errors } = validateEmailConfig({
    NODE_ENV: "production",
    EMAIL_SERVICE_MODE: "smtp",
    EMAIL_HOST: "smtp.example.com",
    EMAIL_PORT: "not-a-port",
    EMAIL_USER: "not-an-email",
    EMAIL_PASS: "mail-password",
  });

  assert.ok(errors.some((error) => error.includes("EMAIL_PORT")));
  assert.ok(errors.some((error) => error.includes("EMAIL_USER")));
});

test("validateExternalApiKeys rejects placeholder production keys", () => {
  const { errors } = validateExternalApiKeys({
    NODE_ENV: "production",
    GOOGLE_CLIENT_ID: "your_google_client_id",
    GOOGLE_CLIENT_SECRET: "changeme",
    GOOGLE_CALLBACK_URL: "https://api.skillssphere.ai/api/auth/google/callback",
    GEMINI_API_KEY: "example-api-key",
  });

  assert.ok(errors.some((error) => error.includes("GOOGLE_CLIENT_ID")));
  assert.ok(errors.some((error) => error.includes("GOOGLE_CLIENT_SECRET")));
  assert.ok(errors.some((error) => error.includes("GEMINI_API_KEY")));
});

test("collectEnvValidationIssues accepts a valid production configuration", () => {
  const { errors, warnings } = collectEnvValidationIssues({
    ...validBaseEnv,
    EMAIL_SERVICE_MODE: "smtp",
    EMAIL_HOST: "smtp.mailprovider.com",
    EMAIL_PORT: "587",
    EMAIL_USER: "no-reply@skillssphere.ai",
    EMAIL_PASS: "smtp-password-value",
  });

  assert.deepEqual(errors, []);
  assert.deepEqual(warnings, []);
});

test("validateEnv throws instead of exiting when exitOnError is false", () => {
  const logger = {
    warn: () => {},
    error: () => {},
  };

  assert.throws(
    () => validateEnv({}, { exitOnError: false, logger }),
    /JWT_SECRET/,
  );
});
