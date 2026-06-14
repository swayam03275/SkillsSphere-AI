import { getToken } from "./authToken";

export const getAuthToken = () => getToken() || "";

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
 * server paths ("/api/files/..."), this returns the path without any token in
 * the URL. Components needing authenticated file access should use the signed
 * URL service (getSignedFileUrl) for <img> tags, or the Authorization header
 * for fetch-based requests.
 */
export const getProtectedAssetUrl = (url) => {
  if (!url) return null;
  const apiPath = resolveProtectedFilePath(url);
  if (!apiPath) return url;
  return apiPath;
};
