const SENSITIVE_RE = /(token|accessToken|refreshToken|password|confirmPassword|authorization|cookie|secret|apiKey)["'`:=\s]+([^,}\s]+)/gi;

function redact(text) {
  if (!text || typeof text !== "string") return text;
  return text.replace(SENSITIVE_RE, (m, key) => `${key}=<redacted>`);
}

function formatArgs(args) {
  return args.map((a) => (typeof a === "string" ? redact(a) : a));
}

const isDev = process.env.NODE_ENV !== "production";

export function info(...args) {
  if (!isDev) return;
  console.log("[ai-ml]", ...formatArgs(args));
}

export function warn(...args) {
  console.warn("[ai-ml]", ...formatArgs(args));
}

export function error(...args) {
  console.error("[ai-ml]", ...formatArgs(args));
}

export function debug(...args) {
  if (!isDev) return;
  console.debug("[ai-ml-debug]", ...formatArgs(args));
}

export default { info, warn, error, debug, redact };

