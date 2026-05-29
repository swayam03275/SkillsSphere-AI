import crypto from "crypto";

const authCodeStore = new Map();
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000;

export const generateAuthCode = (userId) => {
  const code = crypto.randomUUID();
  authCodeStore.set(code, {
    userId,
    expiresAt: Date.now() + 5 * 60 * 1000,
  });
  return code;
};

export const consumeAuthCode = (code) => {
  const entry = authCodeStore.get(code);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    authCodeStore.delete(code);
    return null;
  }
  authCodeStore.delete(code);
  return entry.userId;
};

const purgeExpiredCodes = () => {
  const now = Date.now();
  for (const [code, entry] of authCodeStore) {
    if (entry.expiresAt <= now) {
      authCodeStore.delete(code);
    }
  }
};

const cleanupTimer = setInterval(purgeExpiredCodes, CLEANUP_INTERVAL_MS);
if (cleanupTimer.unref) {
  cleanupTimer.unref();
}
