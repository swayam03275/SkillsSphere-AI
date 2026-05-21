import crypto from "crypto";

const getSigningSecret = () =>
  process.env.FILE_URL_SIGNING_SECRET || process.env.JWT_SECRET || "";

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

  if (!/^\/api\/files\/(avatars|resumes)\/[^/]+$/.test(path)) {
    return null;
  }

  return path;
};

export const buildSignedFileUrl = ({ path, expiresAt, extra = "" }) => {
  const secret = getSigningSecret();
  if (!secret) {
    throw new Error("FILE_URL_SIGNING_SECRET is not configured");
  }

  const payload = buildSignaturePayload(path, expiresAt, extra);
  const sig = crypto.createHmac("sha256", secret).update(payload).digest("hex");
  const separator = path.includes("?") ? "&" : "?";
  const extraParam = extra ? `&uid=${encodeURIComponent(extra)}` : "";

  return `${path}${separator}exp=${expiresAt}&sig=${sig}${extraParam}`;
};

export const verifySignedFileUrl = (path, expiresAt, sig, extra = "") => {
  const secret = getSigningSecret();
  if (!secret) return false;

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
