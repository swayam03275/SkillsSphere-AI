import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import express from "express";
import http from "node:http";
import authRoutes from "../routes.js";
import {
  DEFAULT_OAUTH_REDIRECT_PATH,
  googleOAuthCallback,
  isSafeRedirectPath,
  normalizeOAuthRedirectPath,
} from "../controller.js";

const encodeState = (stateObj) =>
  encodeURIComponent(
    Buffer.from(JSON.stringify(stateObj), "utf8").toString("base64"),
  );

const restoreEnvValue = (key, value) => {
  if (value === undefined) {
    delete process.env[key];
    return;
  }

  process.env[key] = value;
};

const redirectFromCallback = async ({ state, frontendUrl = "https://app.example.com" }) => {
  const previousFrontendUrl = process.env.FRONTEND_URL;
  process.env.FRONTEND_URL = frontendUrl;

  let redirectedTo;
  const req = {
    query: state ? { state: encodeState(state) } : {},
  };
  const res = {
    redirect(url) {
      redirectedTo = url;
    },
  };

  try {
    await googleOAuthCallback(req, res, (error) => {
      throw error;
    });

    return redirectedTo;
  } finally {
    restoreEnvValue("FRONTEND_URL", previousFrontendUrl);
  }
};

const requestOAuthStart = async (redirect) => {
  const previousEnv = {
    FRONTEND_URL: process.env.FRONTEND_URL,
    GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
    GOOGLE_CALLBACK_URL: process.env.GOOGLE_CALLBACK_URL,
  };

  process.env.FRONTEND_URL = "https://app.example.com";
  process.env.GOOGLE_CLIENT_ID = "google-client-id";
  process.env.GOOGLE_CLIENT_SECRET = "google-client-secret";
  process.env.GOOGLE_CALLBACK_URL = "https://api.example.com/api/auth/google/callback";

  const app = express();
  app.use("/api/auth", authRoutes);
  const server = app.listen(0);

  try {
    const { port } = server.address();
    const redirectQuery = encodeURIComponent(redirect);
    const response = await new Promise((resolve, reject) => {
      http
        .get(`http://127.0.0.1:${port}/api/auth/google?redirect=${redirectQuery}`, resolve)
        .on("error", reject);
    });

    return response.headers.location;
  } finally {
    server.close();
    restoreEnvValue("FRONTEND_URL", previousEnv.FRONTEND_URL);
    restoreEnvValue("GOOGLE_CLIENT_ID", previousEnv.GOOGLE_CLIENT_ID);
    restoreEnvValue("GOOGLE_CLIENT_SECRET", previousEnv.GOOGLE_CLIENT_SECRET);
    restoreEnvValue("GOOGLE_CALLBACK_URL", previousEnv.GOOGLE_CALLBACK_URL);
  }
};

const decodeOAuthStateFromGoogleUrl = (googleUrl) => {
  const state = new URL(googleUrl).searchParams.get("state");
  return JSON.parse(Buffer.from(decodeURIComponent(state), "base64").toString("utf8"));
};

describe("OAuth redirect path validation", () => {
  afterEach(() => {
    delete process.env.NODE_ENV;
  });

  const safeRedirectPaths = ["/dashboard", "/profile", "/auth/success"];

  for (const redirectPath of safeRedirectPaths) {
    it(`accepts safe internal redirect path ${redirectPath}`, () => {
      assert.equal(isSafeRedirectPath(redirectPath), true);
      assert.equal(normalizeOAuthRedirectPath(redirectPath), redirectPath);
    });
  }

  const unsafeRedirects = [
    ["https external URL", "https://evil.com"],
    ["http external URL", "http://evil.com"],
    ["protocol-relative URL", "//evil.com"],
    ["javascript URL", "javascript:alert(1)"],
    ["malformed percent encoding", "%"],
    ["space-prefixed path", " /dashboard"],
    ["path with spaces", "/dash board"],
    ["backslash path", "/\\evil.com"],
    ["encoded backslash path", "/%5Cevil.com"],
    ["encoded external URL", "https%3A%2F%2Fevil.com"],
    ["encoded protocol-relative URL", "%2F%2Fevil.com"],
    ["double-encoded protocol-relative URL", "%252F%252Fevil.com"],
    ["production localhost URL", "http://localhost:3000"],
    ["production loopback URL", "http://127.0.0.1:3000"],
  ];

  for (const [name, redirectPath] of unsafeRedirects) {
    it(`rejects ${name}`, () => {
      assert.equal(isSafeRedirectPath(redirectPath), false);
      assert.equal(normalizeOAuthRedirectPath(redirectPath), DEFAULT_OAUTH_REDIRECT_PATH);
    });
  }
});

describe("Google OAuth callback state redirect handling", () => {
  afterEach(() => {
    delete process.env.FRONTEND_URL;
  });

  it("redirects no-code callbacks to a safe internal path from state", async () => {
    const redirectedTo = await redirectFromCallback({
      state: { redirect: "/dashboard" },
    });

    assert.equal(
      redirectedTo,
      "https://app.example.com/dashboard?error=No%20code%20received",
    );
  });

  it("falls back when state contains an external URL", async () => {
    const redirectedTo = await redirectFromCallback({
      state: { redirect: "https://evil.com" },
    });

    assert.equal(
      redirectedTo,
      "https://app.example.com/auth/callback?error=No%20code%20received",
    );
  });

  it("falls back when state contains an encoded external redirect", async () => {
    const redirectedTo = await redirectFromCallback({
      state: { redirect: "%2F%2Fevil.com" },
    });

    assert.equal(
      redirectedTo,
      "https://app.example.com/auth/callback?error=No%20code%20received",
    );
  });

  it("falls back when state contains a production localhost URL", async () => {
    process.env.NODE_ENV = "production";

    const redirectedTo = await redirectFromCallback({
      state: { redirect: "http://localhost:3000" },
    });

    assert.equal(
      redirectedTo,
      "https://app.example.com/auth/callback?error=No%20code%20received",
    );
  });
});

describe("Google OAuth start route state handling", () => {
  it("stores safe internal redirect paths in OAuth state", async () => {
    const googleUrl = await requestOAuthStart("/profile");
    const stateObj = decodeOAuthStateFromGoogleUrl(googleUrl);

    assert.equal(stateObj.redirect, "/profile");
  });

  it("falls back before storing external redirect values in OAuth state", async () => {
    const googleUrl = await requestOAuthStart("https://evil.com");
    const stateObj = decodeOAuthStateFromGoogleUrl(googleUrl);

    assert.equal(stateObj.redirect, DEFAULT_OAUTH_REDIRECT_PATH);
  });
});
