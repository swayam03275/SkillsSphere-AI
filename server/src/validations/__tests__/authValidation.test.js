import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  validateForgotPasswordInput,
  validateLoginInput,
  validateRegisterInput,
  validateResetPasswordInput,
  validateVerifyEmailInput,
} from "../authValidation.js";

const validRegisterPayload = (overrides = {}) => ({
  name: "Test User",
  email: "user@example.com",
  password: "Password1!",
  role: "student",
  ...overrides,
});

const validVerifyEmailPayload = (overrides = {}) => ({
  email: "user@example.com",
  otp: "123456",
  ...overrides,
});

const validResetPasswordPayload = (overrides = {}) => ({
  email: "user@example.com",
  otp: "123456",
  newPassword: "Password1!",
  ...overrides,
});

const fieldMessages = (result, field) =>
  result.errors
    .filter((error) => error.field === field)
    .map((error) => error.message);

describe("auth validation", () => {
  describe("Email validation", () => {
    const validEmails = [
      ["standard valid email", "user@example.com", "user@example.com"],
      ["email with subdomain", "user@mail.example.co.in", "user@mail.example.co.in"],
      ["email with plus alias", "first.last+jobs@example.com", "first.last+jobs@example.com"],
      ["uppercase email is normalized", "USER@EXAMPLE.COM", "user@example.com"],
      ["trimmed email is accepted", "  user@example.com  ", "user@example.com"],
    ];

    for (const [name, email, normalizedEmail] of validEmails) {
      it(`accepts ${name}`, () => {
        const result = validateRegisterInput(validRegisterPayload({ email }));

        assert.equal(result.isValid, true);
        assert.equal(result.data.email, normalizedEmail);
      });
    }

    const invalidEmails = [
      ["missing @", "user.example.com"],
      ["missing domain", "user@"],
      ["missing local part", "@example.com"],
      ["spaces inside address", "user name@example.com"],
      ["invalid special characters", "user<>name@example.com"],
      [
        "unicode/localized local and domain",
        "\u0909\u092a\u092f\u094b\u0917\u0915\u0930\u094d\u0924\u093e@\u0909\u0926\u093e\u0939\u0930\u0923.\u092d\u093e\u0930\u0924",
      ],
      ["unicode/localized local part", "\u7528\u6237@example.com"],
      ["SQL-like payload", "' OR '1'='1"],
      ["XSS-like payload", "<script>alert(1)</script>"],
      ["javascript URL payload", "javascript:alert(1)"],
    ];

    for (const [name, email] of invalidEmails) {
      it(`rejects email with ${name}`, () => {
        const result = validateRegisterInput(validRegisterPayload({ email }));

        assert.equal(result.isValid, false);
        assert.ok(fieldMessages(result, "email").length > 0);
      });
    }

    it("documents that extremely long syntactically valid emails are accepted by the current schema", () => {
      const email = `${"a".repeat(250)}@example.com`;
      const result = validateForgotPasswordInput({ email });

      assert.equal(result.isValid, true);
      assert.equal(result.data.email, email);
    });
  });

  describe("Password validation", () => {
    it("accepts a valid strong password", () => {
      const result = validateRegisterInput(
        validRegisterPayload({ password: "StrongPass1!" }),
      );

      assert.equal(result.isValid, true);
    });

    it("rejects a password that is too short", () => {
      const result = validateRegisterInput(validRegisterPayload({ password: "Ab1!xyz" }));

      assert.equal(result.isValid, false);
      assert.ok(fieldMessages(result, "password").includes("Password must be at least 8 characters"));
    });

    const weakPasswords = [
      [
        "missing uppercase letter",
        "password1!",
        "Password must contain at least one uppercase letter",
      ],
      [
        "missing lowercase letter",
        "PASSWORD1!",
        "Password must contain at least one lowercase letter",
      ],
      ["missing number", "Password!", "Password must contain at least one number"],
      [
        "missing special character",
        "Password1",
        "Password must contain at least one special character",
      ],
      [
        "common weak password",
        "password",
        "Password must contain at least one uppercase letter",
      ],
    ];

    for (const [name, password, message] of weakPasswords) {
      it(`rejects a password with ${name}`, () => {
        const result = validateRegisterInput(validRegisterPayload({ password }));

        assert.equal(result.isValid, false);
        assert.ok(fieldMessages(result, "password").includes(message));
      });
    }

    it("applies the same strong password rule to reset passwords", () => {
      const result = validateResetPasswordInput(
        validResetPasswordPayload({ newPassword: "Password1" }),
      );

      assert.equal(result.isValid, false);
      assert.ok(
        fieldMessages(result, "newPassword").includes(
          "Password must contain at least one special character",
        ),
      );
    });
  });

  describe("OTP validation", () => {
    it("accepts a valid six-character OTP format", () => {
      const result = validateVerifyEmailInput(validVerifyEmailPayload({ otp: "123456" }));

      assert.equal(result.isValid, true);
      assert.equal(result.data.otp, "123456");
    });

    const invalidOtps = [
      ["empty OTP", ""],
      ["non-numeric OTP", "abcdef"],
      ["alphanumeric OTP", "abc123"],
      ["malformed OTP with special characters", "!@#$%^"],
      ["malformed OTP with internal space", "12 456"],
      ["too short OTP", "12345"],
      ["too long OTP", "1234567"],
    ];

    for (const [name, otp] of invalidOtps) {
      it(`rejects ${name}`, () => {
        const result = validateVerifyEmailInput(validVerifyEmailPayload({ otp }));

        assert.equal(result.isValid, false);
        assert.ok(fieldMessages(result, "otp").includes("OTP must be exactly 6 numeric digits"));
      });
    }

    it("applies the same fixed-length numeric OTP rule during password reset", () => {
      const result = validateResetPasswordInput(validResetPasswordPayload({ otp: "1234567" }));

      assert.equal(result.isValid, false);
      assert.ok(fieldMessages(result, "otp").includes("OTP must be exactly 6 numeric digits"));
    });
  });

  describe("Security payloads", () => {
    const suspiciousPayloads = [
      "' OR '1'='1",
      "admin'--",
      "1; DROP TABLE users;",
      "<script>alert(1)</script>",
      "<img src=x onerror=alert(1)>",
      "javascript:alert(1)",
      "__proto__",
      "constructor",
      "prototype",
    ];

    for (const payload of suspiciousPayloads) {
      it(`rejects suspicious payload as an email: ${payload}`, () => {
        const result = validateLoginInput({
          email: payload,
          password: "Password1!",
        });

        assert.equal(result.isValid, false);
        assert.ok(fieldMessages(result, "email").length > 0);
      });
    }

    const weakSuspiciousPasswordPayloads = suspiciousPayloads.filter(
      (payload) => payload !== "1; DROP TABLE users;",
    );

    for (const payload of weakSuspiciousPasswordPayloads) {
      it(`rejects suspicious password payloads that do not satisfy strong password rules: ${payload}`, () => {
        const result = validateLoginInput({
          email: "user@example.com",
          password: payload,
        });

        assert.equal(result.isValid, false);
        assert.ok(fieldMessages(result, "password").length > 0);
      });
    }

    it("does not let prototype pollution-looking role values pass enum validation", () => {
      for (const role of ["__proto__", "constructor", "prototype"]) {
        const result = validateRegisterInput(validRegisterPayload({ role }));

        assert.equal(result.isValid, false);
        assert.ok(fieldMessages(result, "role").length > 0);
      }
    });
  });

  describe("Locale and Unicode inputs", () => {
    const acceptedNames = [
      ["accented Latin characters", "Jos\u00e9 \u00c1lvarez"],
      ["Hindi text", "\u0906\u0930\u0935 \u0936\u0930\u094d\u092e\u093e"],
      ["right-to-left characters", "\u0639\u0644\u064a \u062d\u0633\u0646"],
      ["mixed-language input", "Aarav \u0936\u0930\u094d\u092e\u093e"],
      ["emoji-containing name", "Sam \ud83d\ude0a"],
    ];

    for (const [name, value] of acceptedNames) {
      it(`accepts name with ${name}`, () => {
        const result = validateRegisterInput(validRegisterPayload({ name: value }));

        assert.equal(result.isValid, true);
        assert.equal(result.data.name, value);
      });
    }

    it("rejects names that are shorter than two trimmed characters", () => {
      const result = validateRegisterInput(validRegisterPayload({ name: "  A  " }));

      assert.equal(result.isValid, false);
      assert.ok(fieldMessages(result, "name").includes("Name must be at least 2 characters"));
    });

    it("rejects privileged role values (recruiter, tutor) during self-registration", () => {
      for (const role of ["recruiter", "tutor", "RECRUITER", "TUTOR", "  RECRUITER  "]) {
        const result = validateRegisterInput(validRegisterPayload({ role }));

        assert.equal(result.isValid, false);
        assert.ok(fieldMessages(result, "role").length > 0);
      }
    });
  });
});
