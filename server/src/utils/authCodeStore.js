import crypto from "crypto";

const authCodeStore = new Map();

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
