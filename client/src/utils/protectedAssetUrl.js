const TOKEN_KEY = "skillssphere.auth.token";

export const getAuthToken = () =>
  localStorage.getItem(TOKEN_KEY) || sessionStorage.getItem(TOKEN_KEY) || "";

const getTrustedAssetOrigins = () => {
  const origins = new Set();

  if (typeof window !== "undefined" && window.location?.origin) {
    origins.add(window.location.origin);
  }

  const apiUrl = import.meta.env?.VITE_API_URL;
  if (apiUrl) {
    try {
      origins.add(new URL(apiUrl).origin);
    } catch {
      // Ignore invalid build-time API URL values.
    }
  }

  return origins;
};

export const isTrustedProtectedAssetOrigin = (url) => {
  const parsedUrl = url instanceof URL ? url : new URL(url);
  return getTrustedAssetOrigins().has(parsedUrl.origin);
};

export const resolveProtectedFilePath = (url) => {
  if (!url || typeof url !== "string") return null;

  let candidateUrl = url;

  if (/^https?:\/\//i.test(url)) {
    try {
      const parsed = new URL(url);
      if (!isTrustedProtectedAssetOrigin(parsed)) return null;
      candidateUrl = parsed.pathname;
    } catch {
      return null;
    }
  }

  let apiPath = candidateUrl;

  // Legacy public static paths → protected API routes
  if (candidateUrl.includes("/uploads/avatars/")) {
    const filename = candidateUrl.split("/uploads/avatars/").pop()?.split("?")[0];
    apiPath = filename ? `/api/files/avatars/${filename}` : candidateUrl;
  } else if (candidateUrl.includes("/uploads/")) {
    const filename = candidateUrl.split("/uploads/").pop()?.split("?")[0];
    apiPath = filename ? `/api/files/resumes/${filename}` : candidateUrl;
  } else if (candidateUrl.startsWith("/api/files/")) {
    apiPath = candidateUrl.split("?")[0];
  }

  if (!apiPath.startsWith("/api/files/")) return null;

  return apiPath;
};

/**
 * Helper to return a URL suitable for use in <img src=""> for protected files.
 * If the input is already a public URL, it is returned unchanged. For protected
 * server paths ("/api/files/..."), this returns the path and, if a token is
 * provided, appends it as `access_token` query param to allow simple fetching
 * in environments where Authorization header cannot be set for images.
 */
export const getProtectedAssetUrl = (url, token) => {
  if (!url) return null;
  const apiPath = resolveProtectedFilePath(url);
  if (!apiPath) return url;
  if (token) return `${apiPath}?access_token=${encodeURIComponent(token)}`;
  return apiPath;
};
