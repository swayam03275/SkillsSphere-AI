import { z } from "zod";
import { apiRequest, normalizeApiError } from "../../../services/apiClient";
import { TOKEN_KEY } from "../../../utils/authToken";
const USER_KEY = "skillssphere.auth.user";
const CACHE_TTL_MS = 60 * 1000;
const REQUEST_TIMEOUT_MS = 10 * 1000;
const VALID_ROLES = new Set(["student", "tutor", "recruiter"]);
const roleSchema = z.enum(["student", "tutor", "recruiter"]);
const successEnvelopeSchema = z
  .object({
    success: z.literal(true),
  })
  .passthrough();
const arrayPayloadSchema = z.array(z.unknown());

const fallbackAnalytics = Object.freeze({
  role: null,
  roadmapProgress: 0,
  averageInterviewScore: 0,
  totalInterviews: 0,
  completedTopics: 0,
  averagePlatformScore: 0,
  totalMockInterviewsCompleted: 0,
  activeStudents: 0,
  talentDensity: [],
  totalEliteCandidates: 0,
});

const dashboardCache = new Map();

/**
 * Safely reads a value from Web Storage.
 *
 * @param {Storage | undefined} storage - localStorage or sessionStorage.
 * @param {string} key - Storage key to read.
 * @returns {string | null} Stored value, or null when storage is unavailable.
 */
const safeGetItem = (storage, key) => {
  try {
    return storage?.getItem(key) || null;
  } catch {
    return null;
  }
};

/**
 * Resolves the auth token used by dashboard requests.
 *
 * @param {string} [token] - Optional token passed by a caller.
 * @returns {string | null} Auth token from arguments or persisted auth state.
 */
const getAuthToken = (token) => {
  if (token) return token;
  if (typeof window === "undefined") return null;

  return (
    safeGetItem(window.localStorage, TOKEN_KEY) ||
    safeGetItem(window.sessionStorage, TOKEN_KEY)
  );
};

/**
 * Reads the stored user's role when available.
 *
 * @returns {"student" | "tutor" | "recruiter" | null} Known user role or null.
 */
const getStoredUserRole = () => {
  if (typeof window === "undefined") return null;

  const storedUser =
    safeGetItem(window.localStorage, USER_KEY) ||
    safeGetItem(window.sessionStorage, USER_KEY);

  if (!storedUser) return null;

  try {
    const user = JSON.parse(storedUser);
    return VALID_ROLES.has(user?.role) ? user.role : null;
  } catch {
    return null;
  }
};

/**
 * Checks whether a value is a plain object.
 *
 * @param {unknown} value - Value to inspect.
 * @returns {boolean} True when value is a non-array object.
 */
const isPlainObject = (value) =>
  value !== null && typeof value === "object" && !Array.isArray(value);

/**
 * Converts numeric API values into finite, frontend-safe numbers.
 *
 * @param {unknown} value - Raw numeric value from the API.
 * @param {number} [fallback=0] - Value to use when conversion fails.
 * @returns {number} Finite numeric value.
 */
export const toSafeNumber = (value, fallback = 0) => {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : fallback;
};

/**
 * Keeps percentage-style values within the display-safe 0-100 range.
 *
 * @param {unknown} value - Raw percentage value.
 * @returns {number} Clamped percentage.
 */
const toPercentage = (value) =>
  Math.min(100, Math.max(0, Math.round(toSafeNumber(value))));

/**
 * Validates that an API envelope is object-shaped and successful.
 *
 * @param {unknown} response - Raw API response.
 * @param {string} payloadKey - Required response payload key.
 * @returns {void}
 * @throws {Error} When the response is not a successful API envelope.
 */
export const validateSuccessEnvelope = (response, payloadKey) => {
  if (isPlainObject(response) && response.success !== true) {
    throw new Error(response.message || "Dashboard API request was not successful.");
  }

  const parsed = successEnvelopeSchema.safeParse(response);

  if (!parsed.success) {
    throw new Error("Dashboard API returned an invalid response.");
  }

  if (!(payloadKey in response)) {
    throw new Error(`Dashboard API response is missing ${payloadKey}.`);
  }
};

/**
 * Validates an array payload returned by dashboard endpoints.
 *
 * @param {unknown} value - Raw array payload.
 * @param {string} label - Human-readable payload label for errors.
 * @returns {void}
 * @throws {Error} When the payload is not an array.
 */
export const validateArrayPayload = (value, label) => {
  if (!arrayPayloadSchema.safeParse(value).success) {
    throw new Error(`${label} must be an array.`);
  }
};

/**
 * Normalizes a resume analysis history item.
 *
 * @param {Record<string, unknown>} item - Raw history item.
 * @returns {Record<string, unknown>} Frontend-safe history item.
 */
export const transformAnalysisHistoryItem = (item) => ({
  ...item,
  score: toPercentage(item.score),
  skills: Array.isArray(item.skills) ? item.skills : [],
  missingSkills: Array.isArray(item.missingSkills) ? item.missingSkills : [],
  suggestions: Array.isArray(item.suggestions) ? item.suggestions : [],
  classification:
    typeof item.classification === "string" ? item.classification : "Unclassified",
});

/**
 * Normalizes analysis history API responses.
 *
 * @param {unknown} response - Raw API response.
 * @returns {{success: true, message?: string, data: Array<Record<string, unknown>>}}
 * Normalized response with a data array.
 */
export const transformAnalysisHistoryResponse = (response) => {
  validateSuccessEnvelope(response, "data");
  validateArrayPayload(response.data, "Analysis history");

  return {
    ...response,
    success: true,
    data: response.data
      .filter(isPlainObject)
      .map(transformAnalysisHistoryItem),
    pagination: response.pagination || null,
  };
};

/**
 * Normalizes skill trend rows from the jobs API.
 *
 * @param {Record<string, unknown>} trend - Raw trend row.
 * @returns {Record<string, unknown>} Frontend-safe trend row.
 */
export const transformSkillTrendItem = (trend) => ({
  ...trend,
  count: toSafeNumber(trend.count),
});

/**
 * Normalizes skill trend API responses.
 *
 * @param {unknown} response - Raw API response.
 * @returns {{success: true, trends: Array<Record<string, unknown>>}}
 * Normalized response with a trends array.
 */
export const transformSkillTrendsResponse = (response) => {
  validateSuccessEnvelope(response, "trends");
  validateArrayPayload(response.trends, "Skill trends");

  return {
    ...response,
    success: true,
    trends: response.trends
      .filter(isPlainObject)
      .map(transformSkillTrendItem),
  };
};

/**
 * Normalizes cover letter history API responses.
 *
 * @param {unknown} response - Raw API response.
 * @returns {{success: true, data: Array<Record<string, unknown>>, count: number}}
 * Normalized response with a data array and count.
 */
export const transformCoverLetterHistoryResponse = (response) => {
  validateSuccessEnvelope(response, "data");
  validateArrayPayload(response.data, "Cover letter history");

  const data = response.data.filter(isPlainObject);

  return {
    ...response,
    success: true,
    data,
    count: toSafeNumber(response.count, data.length),
    pagination: response.pagination || null,
  };
};

/**
 * Normalizes recruiter density rows for the dashboard.
 *
 * @param {unknown} density - Raw density map.
 * @returns {Array<{topic: string, skilledCandidates: number}>} Safe density rows.
 */
export const transformTalentDensity = (density) => {
  if (!Array.isArray(density)) return [];

  return density
    .filter(isPlainObject)
    .map((item) => ({
      topic: typeof item.topic === "string" && item.topic.trim()
        ? item.topic.trim()
        : "Unknown",
      skilledCandidates: toSafeNumber(item.skilledCandidates),
    }));
};

/**
 * Normalizes role-specific dashboard analytics into one stable shape.
 *
 * @param {unknown} response - Raw API response from /api/analytics/dashboard.
 * @returns {{success: true, data: typeof fallbackAnalytics}}
 * Normalized analytics response.
 */
export const transformRoleAnalyticsResponse = (response) => {
  validateSuccessEnvelope(response, "data");

  if (!isPlainObject(response.data)) {
    throw new Error("Dashboard analytics data must be an object.");
  }

  const rawRole = response.data.role || response.role || getStoredUserRole();
  const parsedRole = roleSchema.safeParse(rawRole);
  const role = parsedRole.success ? parsedRole.data : null;
  const talentDensity = transformTalentDensity(response.data.talentDensity);

  return {
    ...response,
    success: true,
    data: {
      ...fallbackAnalytics,
      ...response.data,
      role,
      roadmapProgress: toPercentage(response.data.roadmapProgress),
      averageInterviewScore: toPercentage(response.data.averageInterviewScore),
      totalInterviews: toSafeNumber(response.data.totalInterviews),
      completedTopics: toSafeNumber(response.data.completedTopics),
      averagePlatformScore: toPercentage(response.data.averagePlatformScore),
      totalMockInterviewsCompleted: toSafeNumber(response.data.totalMockInterviewsCompleted),
      activeStudents: toSafeNumber(response.data.activeStudents),
      talentDensity,
      totalEliteCandidates: toSafeNumber(
        response.data.totalEliteCandidates,
        talentDensity.reduce((sum, item) => sum + item.skilledCandidates, 0),
      ),
    },
  };
};

/**
 * Gets a response from the in-memory dashboard cache.
 *
 * @param {string} key - Cache key.
 * @param {number} [now=Date.now()] - Current time, injectable for tests.
 * @returns {unknown | null} Cached response or null when missing/expired.
 */
export const getCachedDashboardResponse = (key, now = Date.now()) => {
  const entry = dashboardCache.get(key);
  if (!entry) return null;

  if (entry.expiresAt <= now) {
    dashboardCache.delete(key);
    return null;
  }

  return entry.value;
};

/**
 * Stores a response in the in-memory dashboard cache.
 *
 * @param {string} key - Cache key.
 * @param {unknown} value - Response to cache.
 * @param {number} [ttlMs=CACHE_TTL_MS] - Time-to-live in milliseconds.
 * @param {number} [now=Date.now()] - Current time, injectable for tests.
 * @returns {unknown} Cached value.
 */
export const setCachedDashboardResponse = (
  key,
  value,
  ttlMs = CACHE_TTL_MS,
  now = Date.now(),
) => {
  dashboardCache.set(key, {
    value,
    expiresAt: now + ttlMs,
  });

  return value;
};

/**
 * Clears dashboard service cache entries.
 *
 * @param {string} [key] - Optional key to clear. Clears all entries when omitted.
 * @returns {void}
 */
export const clearDashboardCache = (key) => {
  if (key) {
    dashboardCache.delete(key);
    return;
  }

  dashboardCache.clear();
};

/**
 * Builds a stable cache key for a dashboard endpoint and token.
 *
 * @param {string} path - API path.
 * @param {string | null} token - Auth token.
 * @returns {string} Cache key.
 */
const buildCacheKey = (path, token) => `${path}:${token || "anonymous"}`;

/**
 * Creates an AbortController-backed timeout for dashboard requests.
 *
 * @param {number} [timeoutMs=REQUEST_TIMEOUT_MS] - Timeout duration.
 * @returns {{signal: AbortSignal | undefined, cleanup: () => void}}
 * Timeout signal and cleanup function.
 */
const createTimeoutSignal = (timeoutMs = REQUEST_TIMEOUT_MS) => {
  if (typeof AbortController === "undefined") {
    return { signal: undefined, cleanup: () => {} };
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  return {
    signal: controller.signal,
    cleanup: () => clearTimeout(timeoutId),
  };
};

/**
 * Detects timeout and abort failures, including errors wrapped by apiClient.
 *
 * @param {unknown} error - Raw or wrapped error thrown during a request.
 * @returns {boolean} True when the error represents an aborted request.
 */
export const isDashboardTimeoutError = (error) => {
  const cause = error?.cause;

  return (
    error?.name === "AbortError" ||
    cause?.name === "AbortError" ||
    /abort|timeout/i.test(error?.message || "") ||
    /abort|timeout/i.test(cause?.message || "")
  );
};

/**
 * Converts low-level failures into user-friendly dashboard messages.
 *
 * @param {unknown} error - Raw error thrown by apiRequest or validators.
 * @returns {{status: number, message: string, reason: string}}
 * Normalized service error metadata.
 */
export const handleDashboardServiceError = (error) => {
  const normalized = normalizeApiError(error);
  const status = normalized.status || 500;
  const reason = normalized.message || "Dashboard data could not be loaded.";

  if (isDashboardTimeoutError(error) || /abort|timeout/i.test(reason)) {
    return {
      status: 408,
      message: "Dashboard data took too long to load. Showing the latest safe values.",
      reason,
    };
  }

  if (status === 0 || /network/i.test(reason)) {
    return {
      status,
      message: "Unable to reach the server. Showing the latest safe dashboard values.",
      reason,
    };
  }

  if (/invalid|missing|must be/i.test(reason)) {
    return {
      status,
      message: "Dashboard data was incomplete. Showing safe fallback values.",
      reason,
    };
  }

  if (status === 401 || status === 403) {
    return {
      status,
      message: "Please sign in again to refresh your dashboard.",
      reason,
    };
  }

  return {
    status,
    message: "Dashboard data could not be loaded. Showing safe fallback values.",
    reason,
  };
};

/**
 * Builds a successful fallback response so dashboard widgets can keep rendering.
 *
 * @param {unknown} error - Raw error.
 * @param {string} payloadKey - Response payload key.
 * @param {unknown} fallbackValue - Fallback payload value.
 * @returns {Record<string, unknown>} Response containing fallback data and error metadata.
 */
const createFallbackResponse = (error, payloadKey, fallbackValue) => {
  const normalized = handleDashboardServiceError(error);

  return {
    success: true,
    [payloadKey]: fallbackValue,
    message: normalized.message,
    isFallback: true,
    error: {
      status: normalized.status,
      reason: normalized.reason,
    },
  };
};

/**
 * Executes, validates, transforms, and caches a dashboard request.
 *
 * @param {string} path - API path.
 * @param {Object} options - Request options.
 * @param {string | null} options.token - Auth token.
 * @param {string} options.payloadKey - Response payload key.
 * @param {unknown} options.fallbackValue - Fallback payload for errors.
 * @param {(response: unknown) => Record<string, unknown>} options.transform - Response transformer.
 * @returns {Promise<Record<string, unknown>>} Safe dashboard service response.
 */
const requestDashboardResource = async (
  path,
  { token, payloadKey, fallbackValue, transform },
) => {
  const cacheKey = buildCacheKey(path, token);
  const cached = getCachedDashboardResponse(cacheKey);

  if (cached) {
    return cached;
  }

  const { signal, cleanup } = createTimeoutSignal();

  try {
    const response = await apiRequest(path, {
      method: "GET",
      token,
      signal,
    });
    const transformed = transform(response);
    return setCachedDashboardResponse(cacheKey, transformed);
  } catch (error) {
    return createFallbackResponse(error, payloadKey, fallbackValue);
  } finally {
    cleanup();
  }
};

/**
 * Fetches the authenticated user's resume analysis history.
 *
 * @param {string} [token] - Optional auth token. Falls back to persisted auth state.
 * @returns {Promise<{success: boolean, data: Array, message?: string, isFallback?: boolean}>}
 * Safe analysis history response.
 */
export const getAnalysisHistory = async (token, page = 1, limit = 10) => {
  const authToken = getAuthToken(token);

  return requestDashboardResource(`/api/dashboard/history?page=${page}&limit=${limit}`, {
    token: authToken,
    payloadKey: "data",
    fallbackValue: [],
    transform: transformAnalysisHistoryResponse,
  });
};

/**
 * Fetches trending skills for dashboard charts.
 *
 * @param {string} [token] - Optional auth token. Falls back to persisted auth state.
 * @returns {Promise<{success: boolean, trends: Array, message?: string, isFallback?: boolean}>}
 * Safe skill trends response.
 */
export const getSkillTrends = async (token) => {
  const authToken = getAuthToken(token);

  return requestDashboardResource("/api/jobs/trends/skills", {
    token: authToken,
    payloadKey: "trends",
    fallbackValue: [],
    transform: transformSkillTrendsResponse,
  });
};

/**
 * Fetches generated cover letter history for the authenticated user.
 *
 * @param {string} [token] - Optional auth token. Falls back to persisted auth state.
 * @returns {Promise<{success: boolean, data: Array, count: number, message?: string, isFallback?: boolean}>}
 * Safe cover letter history response.
 */
export const getCoverLetterHistory = async (token, page = 1, limit = 10) => {
  const authToken = getAuthToken(token);

  return requestDashboardResource(`/api/cover-letters?page=${page}&limit=${limit}`, {
    token: authToken,
    payloadKey: "data",
    fallbackValue: [],
    transform: transformCoverLetterHistoryResponse,
  });
};

/**
 * Fetches role-specific analytics for the dashboard.
 *
 * @param {string} [token] - Optional auth token. Falls back to persisted auth state.
 * @returns {Promise<{success: boolean, data: Object, message?: string, isFallback?: boolean}>}
 * Safe role analytics response with normalized student, tutor, and recruiter fields.
 */
export const getRoleAnalytics = async (token) => {
  const authToken = getAuthToken(token);

  return requestDashboardResource("/api/analytics/dashboard", {
    token: authToken,
    payloadKey: "data",
    fallbackValue: { ...fallbackAnalytics, role: getStoredUserRole() },
    transform: transformRoleAnalyticsResponse,
  });
};
