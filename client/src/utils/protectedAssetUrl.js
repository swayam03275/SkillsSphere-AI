const TOKEN_KEY = "skillssphere.auth.token";

export const getAuthToken = () =>
  localStorage.getItem(TOKEN_KEY) || sessionStorage.getItem(TOKEN_KEY) || "";

export const resolveProtectedFilePath = (url) => {
  if (!url || typeof url !== "string") return null;

  // Skip third-party URLs
  if (/^https?:\/\//i.test(url) && !url.includes("/uploads/") && !url.includes("/api/files/")) {
    return null;
  }

  let apiPath = url;

  // Legacy public static paths → protected API routes
  if (url.includes("/uploads/avatars/")) {
    const filename = url.split("/uploads/avatars/").pop()?.split("?")[0];
    apiPath = filename ? `/api/files/avatars/${filename}` : url;
  } else if (url.includes("/uploads/")) {
    const filename = url.split("/uploads/").pop()?.split("?")[0];
    apiPath = filename ? `/api/files/resumes/${filename}` : url;
  } else if (url.startsWith("/api/files/")) {
    apiPath = url.split("?")[0];
  } else if (url.startsWith("http")) {
    try {
      const parsed = new URL(url);
      if (parsed.pathname.startsWith("/api/files/")) {
        apiPath = parsed.pathname;
      }
    } catch {
      return null;
    }
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
