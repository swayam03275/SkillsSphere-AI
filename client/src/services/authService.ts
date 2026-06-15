import { apiRequest } from "./apiClient";

export const register = ({ name, email, password, role }) =>
  apiRequest("/api/auth/register", {
    method: "POST",
    body: { name, email, password, role },
  });

export const login = ({ email, password }) =>
  apiRequest("/api/auth/login", {
    method: "POST",
    body: { email, password },
  });

export const verifyEmail = ({ email, otp }) =>
  apiRequest("/api/auth/verify-email", {
    method: "POST",
    body: { email, otp },
  });

export const resendOtp = ({ email }) =>
  apiRequest("/api/auth/resend-otp", {
    method: "POST",
    body: { email },
  });

export const getCurrentUser = (token) => 
apiRequest("/api/auth/me", {
    method: "GET",
    token,
  });

export const logout = (token) =>
  apiRequest("/api/auth/logout", {
    method: "POST",
    token,
  });