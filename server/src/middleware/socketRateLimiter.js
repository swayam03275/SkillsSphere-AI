import logger from "../utils/logger.js";

const DEFAULT_WINDOW_MS = parseInt(process.env.SOCKET_RATE_WINDOW_MS, 10) || 10000;
const DEFAULT_MAX_EVENTS = parseInt(process.env.SOCKET_RATE_MAX_EVENTS, 10) || 50;
const WHITELIST = new Set(
  (process.env.SOCKET_RATE_WHITELIST || "ping,pong,connect,disconnect,error")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean),
);

const ENABLED = process.env.SOCKET_RATE_ENABLED !== "false";
const WARNING_PERCENT = parseInt(process.env.SOCKET_RATE_WARNING_PERCENT, 10) || 80;
const WARNING_COOLDOWN_MS = parseInt(process.env.SOCKET_RATE_WARNING_COOLDOWN_MS, 10) || 5000;

// Module-level state so close() can clear it across module reloads
let _state = null;
let _cleanupTimer = null;

/**
 * Clears in-memory state and stops the cleanup timer.
 * Safe to call multiple times (idempotent).
 */
export function close() {
  if (_state) {
    _state.clear();
    _state = null;
  }
  if (_cleanupTimer) {
    clearInterval(_cleanupTimer);
    _cleanupTimer = null;
  }
}

export function attachSocketRateLimiter(io) {
  if (!ENABLED) {
    logger.info("Socket rate limiter disabled via SOCKET_RATE_ENABLED=false");
    return;
  }

  const state = new Map();
  _state = state;
  const maxEvents = DEFAULT_MAX_EVENTS;
  const windowMs = DEFAULT_WINDOW_MS;
  const refillRatePerMs = maxEvents / windowMs;
  const warningThreshold = Math.max(1, Math.floor((WARNING_PERCENT / 100) * maxEvents));

  // Periodic cleanup of expired entries
  const cleanupTimer = setInterval(() => {
    const now = Date.now();
    for (const [socketId, entry] of state) {
      // Clean up entries with zero tokens that have been disconnected
      if (entry.tokens <= 0) {
        // entries remain until explicit disconnect to keep rate limit state
      }
    }
  }, windowMs);
  _cleanupTimer = cleanupTimer;
  if (cleanupTimer.unref) cleanupTimer.unref();

  function refillTokens(entry, now) {
    const elapsed = Math.max(0, now - entry.lastRefill);
    entry.tokens = Math.min(maxEvents, entry.tokens + elapsed * refillRatePerMs);
    entry.lastRefill = now;
  }

  io.on("connection", (socket) => {
    state.set(socket.id, { tokens: maxEvents, lastRefill: Date.now(), warned: false, lastWarning: 0 });

    socket.onAny((event) => {
      try {
        if (WHITELIST.has(event)) return;

        const entry = state.get(socket.id);
        if (!entry) return;

        refillTokens(entry, Date.now());

        if (entry.tokens >= 1) {
          entry.tokens -= 1;
          // Reset warned flag when tokens climb back above threshold
          if (entry.warned && entry.tokens >= warningThreshold) entry.warned = false;
          // Emit a soft warning when nearing limit
          const now = Date.now();
          if (!entry.warned && entry.tokens < warningThreshold) {
            const sinceLast = now - (entry.lastWarning || 0);
            if (sinceLast >= WARNING_COOLDOWN_MS) {
              entry.warned = true;
              entry.lastWarning = now;
              try {
                socket.emit("rate_warning", { remaining: Math.floor(entry.tokens), threshold: warningThreshold });
              } catch (e) { /* ignore */ }
            }
          }
          return;
        }

        logger.warn(`Socket ${socket.id} rate-limited (events in ${windowMs}ms > ${maxEvents})`);
        try {
          socket.emit("rate_limited", {
            message: "Too many events sent in a short period. Connection will be closed.",
          });
        } catch (e) { /* ignore */ }

        socket.disconnect(true);
      } catch (err) {
        logger.error("[socketRateLimiter] error:", err);
      }
    });

    socket.on("disconnect", () => state.delete(socket.id));
  });
}

export default attachSocketRateLimiter;
