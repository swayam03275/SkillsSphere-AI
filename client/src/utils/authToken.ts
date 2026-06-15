export const TOKEN_KEY = "skillssphere.auth.token";

export const getToken = () =>
  localStorage.getItem(TOKEN_KEY) || sessionStorage.getItem(TOKEN_KEY) || null;
