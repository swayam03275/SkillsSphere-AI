/**
 * In-memory JWT token blacklist.
 *
 * Stores revoked token JTIs (JWT IDs) along with their expiration timestamps.
 * Expired entries are automatically purged every 15 minutes to prevent memory leaks.
 *
 * Trade-off: blacklisted tokens are lost on server restart, so a revoked token
 * could be reused until it expires naturally. For multi-instance deployments,
 * swap this store for Redis or a shared cache.
 */

// Map<jti: string, expiresAt: number (epoch seconds)>
const blacklist = new Map();

const CLEANUP_INTERVAL_MS = 15 * 60 * 1000; // 15 minutes

/**
 * Add a token's JTI to the blacklist.
 * @param {string} jti    - The JWT ID claim from the token
 * @param {number} exp    - The token's expiration time (epoch seconds, from JWT `exp` claim)
 */
export const blacklistToken = (jti, exp) => {
  if (!jti || !exp) return;
  blacklist.set(jti, exp);
};

/**
 * Check whether a token's JTI has been blacklisted.
 * @param {string} jti - The JWT ID claim to look up
 * @returns {boolean}  - true if the token was revoked
 */
export const isTokenBlacklisted = (jti) => {
  if (!jti) return false;
  return blacklist.has(jti);
};

/**
 * Remove expired entries from the blacklist.
 * Called automatically on a timer — no need to invoke manually.
 */
const purgeExpired = () => {
  const now = Math.floor(Date.now() / 1000);
  for (const [jti, exp] of blacklist) {
    if (exp <= now) {
      blacklist.delete(jti);
    }
  }
};

// Schedule automatic cleanup
const cleanupTimer = setInterval(purgeExpired, CLEANUP_INTERVAL_MS);

// Allow the Node.js process to exit gracefully without waiting for this timer
if (cleanupTimer.unref) {
  cleanupTimer.unref();
}
