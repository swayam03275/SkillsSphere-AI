import { apiRequest } from "./apiClient";

export interface RegisterPayload {
  name: string;
  email: string;
  password?: string;
  role?: string;
}

export interface LoginPayload {
  email: string;
  password?: string;
}

export interface VerifyEmailPayload {
  email: string;
  otp: string;
}

export interface ResendOtpPayload {
  email: string;
}

export const register = ({ name, email, password, role }: RegisterPayload) =>
  apiRequest("/api/auth/register", {
    method: "POST",
    body: { name, email, password, role },
  });

export const login = ({ email, password }: LoginPayload) =>
  apiRequest("/api/auth/login", {
    method: "POST",
    body: { email, password },
  });

export const verifyEmail = ({ email, otp }: VerifyEmailPayload) =>
  apiRequest("/api/auth/verify-email", {
    method: "POST",
    body: { email, otp },
  });

export const resendOtp = ({ email }: ResendOtpPayload) =>
  apiRequest("/api/auth/resend-otp", {
    method: "POST",
    body: { email },
  });

export const getCurrentUser = (token: string) => 
  apiRequest("/api/auth/me", {
    method: "GET",
    token,
  });

export const logout = (token: string) =>
  apiRequest("/api/auth/logout", {
    method: "POST",
    token,
  });