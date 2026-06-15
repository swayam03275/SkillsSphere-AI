// @ts-nocheck

import React, { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import Input from "../../shared/components/Input";
import Button from "../../shared/components/Button";
import { KeyRound, ArrowLeft, CheckCircle } from "lucide-react";
import { useToast } from "../../shared/components";
import { API_URL } from "../../config/env";
import { useDocumentTitle } from "../../hooks/useDocumentTitle";
import { reportError } from "../../utils/errorReporter";
import { z } from "zod";

const resetSchema = z.object({
  email: z.string().min(1, "Email is required").email("Please enter a valid email"),
  otp: z.string().length(6, "OTP must be exactly 6 digits"),
  newPassword: z.string().min(8, "Password must be at least 8 characters"),
  confirmPassword: z.string().min(1, "Please confirm your password")
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

const RESET_PASSWORD_ERROR_MESSAGE =
  "Unable to reset password. Please try again or request a new reset link.";
const RESET_PASSWORD_CONNECTION_MESSAGE =
  "Unable to reset password right now. Please check your connection and try again.";

const ResetPassword = () => {
  useDocumentTitle("Reset Password");
  const navigate = useNavigate();
  const location = useLocation();
  const { success: showSuccessToast, error: showErrorToast } = useToast();

  const [formData, setFormData] = useState({
    email: "",
    otp: "",
    newPassword: "",
    confirmPassword: "",
  });

  // Extract email from URL if present
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const emailParam = params.get("email");
    if (emailParam) {
      setFormData((prev) => ({ ...prev, email: emailParam }));
    }
  }, [location]);

  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleChange = (e) => {
    const { id, value } = e.target;

    // For OTP, allow only digits and max 6
    if (id === "otp") {
      const sanitized = value.replace(/\D/g, "").slice(0, 6);
      setFormData({ ...formData, otp: sanitized });
    } else {
      setFormData({ ...formData, [id]: value });
    }

    if (errors[id]) {
      setErrors({ ...errors, [id]: "" });
    }
  };

  const validate = () => {
    const parsed = resetSchema.safeParse(formData);
    const newErrors = {};

    if (!parsed.success) {
      parsed.error.issues.forEach((issue) => {
        if (!newErrors[issue.path[0]]) {
          newErrors[issue.path[0]] = issue.message;
        }
      });
    }

    return newErrors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const newErrors = validate();
    setErrors(newErrors);

    if (Object.keys(newErrors).length === 0) {
      setLoading(true);
      try {
        const response = await fetch(`${API_URL}/api/auth/reset-password`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email: formData.email,
            otp: formData.otp,
            newPassword: formData.newPassword,
          }),
        });

        const data = await response.json();

        if (response.ok) {
          setSuccess(true);
          showSuccessToast("Password reset successfully!");
        } else {
          const error = new Error("Password reset request failed");
          reportError(error, {
            source: "auth",
            feature: "reset-password",
            status: response.status,
          }).catch(() => {});
          showErrorToast(RESET_PASSWORD_ERROR_MESSAGE);
          setErrors({ form: RESET_PASSWORD_ERROR_MESSAGE });
        }
      } catch (err) {
        reportError(new Error("Password reset request could not be completed"), {
          source: "auth",
          feature: "reset-password",
          reason: err?.name || "request-failed",
        }).catch(() => {});
        showErrorToast(RESET_PASSWORD_CONNECTION_MESSAGE);
        setErrors({ form: RESET_PASSWORD_CONNECTION_MESSAGE });
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <div className="min-h-screen flex justify-center items-center bg-slate-50 dark:bg-[radial-gradient(circle_at_top_left,#0f172a,#020617)] overflow-hidden relative p-5 box-border">
      <div className="relative z-10 w-full max-w-[420px]">
        {/* Background glow */}
        <div className="absolute w-[520px] h-[520px] bg-blue-400/45 dark:bg-blue-500/40 rounded-full blur-[140px] dark:blur-[120px] -top-[150px] -left-[150px] -z-10 animate-pulse"></div>
        <div className="absolute w-[420px] h-[420px] bg-purple-400/45 dark:bg-purple-500/40 rounded-full blur-[140px] dark:blur-[120px] -bottom-[120px] -right-[120px] -z-10 animate-pulse"></div>

        {success ? (
          /* ── Success State ── */
          <div className="p-6 sm:p-[30px] rounded-[20px] backdrop-blur-[20px] bg-white/95 dark:bg-slate-900/70 border border-slate-200 dark:border-white/10 shadow-[0_20px_60px_rgba(15,23,42,0.14)] dark:shadow-[0_0_40px_rgba(0,0,0,0.6)] animate-[fadeIn_0.8s_ease] text-center">
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center">
                <CheckCircle className="w-8 h-8 text-green-400" />
              </div>
            </div>
            <h2 className="text-gray-900 dark:text-white text-2xl font-semibold mb-2">
              Password Reset Successful
            </h2>
            <p className="text-slate-600 dark:text-slate-400 text-sm mb-6">
              Your password has been updated successfully. You can now log in
              with your new password.
            </p>
            <Button
              fullWidth
              className="rounded-xl bg-gradient-to-r from-blue-500 to-indigo-500 border-none font-bold text-[15px] hover:scale-105 hover:shadow-[0_0_20px_rgba(59,130,246,0.6)] transition-all duration-300"
              onClick={() => navigate("/login")}
            >
              Back to Login
            </Button>
          </div>
        ) : (
          /* ── Reset Password Form ── */
          <form
            className="p-6 sm:p-[30px] rounded-[20px] backdrop-blur-[20px] bg-white/95 dark:bg-slate-900/70 border border-slate-200 dark:border-white/10 shadow-[0_20px_60px_rgba(15,23,42,0.14)] dark:shadow-[0_0_40px_rgba(0,0,0,0.6)] animate-[fadeIn_0.8s_ease]"
            onSubmit={handleSubmit}
            noValidate
          >
            {/* Header */}
            <div className="flex justify-center mb-4">
              <div className="w-14 h-14 rounded-full bg-blue-500/20 flex items-center justify-center">
                <KeyRound className="w-7 h-7 text-blue-400" />
              </div>
            </div>
            <h2 className="text-center text-gray-900 dark:text-white mb-1 text-2xl font-semibold">
              Reset Password
            </h2>
            <p className="text-center text-slate-600 dark:text-slate-400 text-sm mb-6">
              Enter the details below to reset your password
            </p>

            <div className="flex flex-col gap-4 mb-5">
              <Input
                id="email"
                type="email"
                label="Email"
                placeholder="Enter your registered email"
                value={formData.email}
                onChange={handleChange}
                error={errors.email}
                disabled={loading}
              />

              <Input
                id="otp"
                type="text"
                label="OTP (6-digit)"
                placeholder="Enter 6-digit OTP"
                value={formData.otp}
                onChange={handleChange}
                error={errors.otp}
                helperText="Check your email for the verification code"
                disabled={loading}
                maxLength={6}
              />

              <Input
                id="newPassword"
                type="password"
                label="New Password"
                placeholder="Create a new password"
                value={formData.newPassword}
                onChange={handleChange}
                error={errors.newPassword}
                helperText="Must be at least 8 characters"
                disabled={loading}
                autoComplete="new-password"
              />

              <Input
                id="confirmPassword"
                type="password"
                label="Confirm Password"
                placeholder="Confirm your new password"
                value={formData.confirmPassword}
                onChange={handleChange}
                error={errors.confirmPassword}
                disabled={loading}
                autoComplete="new-password"
              />
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              fullWidth
              loading={loading}
              disabled={loading}
              className="mt-2 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-500 border-none font-bold text-[15px] hover:scale-105 hover:shadow-[0_0_20px_rgba(59,130,246,0.6)] transition-all duration-300"
            >
              Reset Password
            </Button>

            {/* Footer */}
            <p className="text-center mt-5 text-slate-600 dark:text-slate-400 text-[14px] flex items-center justify-center gap-1">
              <ArrowLeft className="w-4 h-4" />
              <Link to="/login" className="text-blue-400 hover:underline">
                Back to Login
              </Link>
            </p>
          </form>
        )}
      </div>
    </div>
  );
};

export default ResetPassword;
