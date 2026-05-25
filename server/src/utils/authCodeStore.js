import crypto from "crypto";

const CODE_TTL_MS = 60 * 1000;
const CLEANUP_INTERVAL_MS = 30 * 1000;

const store = new Map();

const cleanup = () => {
  const now = Date.now();
  for (const [code, entry] of store) {
    if (entry.expiresAt <= now) {
      store.delete(code);
    }
  }
};

setInterval(cleanup, CLEANUP_INTERVAL_MS).unref();

export const generateAuthCode = (userId) => {
  const code = crypto.randomBytes(24).toString("hex");
  store.set(code, {
    userId,
    expiresAt: Date.now() + CODE_TTL_MS,
  });
  return code;
};

export const consumeAuthCode = (code) => {
  const entry = store.get(code);
  if (!entry) return null;
  if (entry.expiresAt <= Date.now()) {
    store.delete(code);
    return null;
  }
  store.delete(code);
  return entry.userId;
};
