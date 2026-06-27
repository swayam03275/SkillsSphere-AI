import crypto from "crypto";

const PROTECTED_PATH_RE = /^\/api\/files\/(avatars|resumes)\/[^/]+$/;

const getSigningSecret = () => {
  const secret = process.env.FILE_URL_SIGNING_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error(
      "FILE_URL_SIGNING_SECRET must be set and at least 32 characters"
    );
  }
  return secret;
};

const buildSignaturePayload = (path, expiresAt, extra = "") =>
  `${extra ? `${path}.${extra}` : path}.${expiresAt}`;

export const normalizeProtectedFilePath = (input) => {
  if (!input || typeof input !== "string") return null;

  let path = input;

  if (input.startsWith("http://") || input.startsWith("https://")) {
    try {
      const parsed = new URL(input);
      path = parsed.pathname;
    } catch {
      return null;
    }
  }

  path = path.split("?")[0];

  if (path.includes("/uploads/avatars/")) {
    const filename = path.split("/uploads/avatars/").pop();
    path = filename ? `/api/files/avatars/${filename}` : path;
  } else if (path.includes("/uploads/")) {
    const filename = path.split("/uploads/").pop();
    path = filename ? `/api/files/resumes/${filename}` : path;
  }

  if (!PROTECTED_PATH_RE.test(path)) {
    return null;
  }

  return path;
};

export const buildSignedFileUrl = ({ path, expiresAt, extra = "" }) => {
  const secret = getSigningSecret();

  const payload = buildSignaturePayload(path, expiresAt, extra);
  const sig = crypto.createHmac("sha256", secret).update(payload).digest("hex");
  const separator = path.includes("?") ? "&" : "?";
  const extraParam = extra ? `&uid=${encodeURIComponent(extra)}` : "";

  return `${path}${separator}exp=${expiresAt}&sig=${sig}${extraParam}`;
};

export const verifySignedFileUrl = (path, expiresAt, sig, extra = "") => {
  if (!PROTECTED_PATH_RE.test(path)) return false;

  let secret;
  try {
    secret = getSigningSecret();
  } catch {
    return false;
  }

  if (typeof sig !== "string" || sig.length === 0) return false;

  const exp = Number(expiresAt);
  if (!Number.isFinite(exp) || exp <= 0) return false;

  const nowSeconds = Math.floor(Date.now() / 1000);
  if (exp < nowSeconds) return false;

  const payload = buildSignaturePayload(path, exp, extra);
  const expected = crypto.createHmac("sha256", secret).update(payload).digest("hex");

  if (expected.length !== sig.length) return false;

  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(sig));
};

/**
 * Extracts and validates the expiry timestamp from a signed URL query string.
 *
 * @param {string} url - Full URL or path+query string containing an 'exp' parameter.
 * @returns {number|null} Numeric expiry timestamp in seconds, or null if missing,
 *                        invalid, or already expired.
 */
export const parseSignedUrlExpiry = (url) => {
  if (!url || typeof url !== "string") return null;

  let queryString = "";

  if (url.includes("?")) {
    const parts = url.split("?", 2);
    queryString = parts[1] || "";
  }

  const params = new URLSearchParams(queryString);
  const expValue = params.get("exp");

  if (!expValue) return null;

  const exp = Number(expValue);
  if (!Number.isFinite(exp) || exp <= 0) return null;

  const nowSeconds = Math.floor(Date.now() / 1000);
  if (exp < nowSeconds) return null;

  return exp;
};
