export const TOKEN_KEY = "skillssphere.auth.token";

/**
 * Checks whether browser localStorage or sessionStorage is available.
 * Safe to call in both browser and SSR environments.
 */
export const isStorageAvailable = () => {
  if (typeof window === "undefined") return false;
  try {
    // Check that at least one storage is accessible
    return !!(window.localStorage || window.sessionStorage);
  } catch {
    return false;
  }
};

export const getToken = () => {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY) || sessionStorage.getItem(TOKEN_KEY) || null;
};
