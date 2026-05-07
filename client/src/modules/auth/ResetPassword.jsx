import React, { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import Input from "../../shared/components/Input";
import Button from "../../shared/components/Button";
import { KeyRound, ArrowLeft, CheckCircle } from "lucide-react";
import { useToast } from "../../shared/components";


const ResetPassword = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { success: showSuccessToast, error: showErrorToast } = useToast();

  const [form, setForm] = useState({
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
      setForm((prev) => ({ ...prev, email: emailParam }));
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
      setForm({ ...form, otp: sanitized });
    } else {
      setForm({ ...form, [id]: value });
    }

    if (errors[id]) {
      setErrors({ ...errors, [id]: "" });
    }
  };

  const validate = () => {
    const newErrors = {};

    if (!form.email.trim()) newErrors.email = "Email is required";
    else if (!/\S+@\S+\.\S+/.test(form.email))
      newErrors.email = "Please enter a valid email";

    if (!form.otp.trim()) newErrors.otp = "OTP is required";
    else if (form.otp.length !== 6)
      newErrors.otp = "OTP must be exactly 6 digits";

    if (!form.newPassword)
      newErrors.newPassword = "New password is required";
    else if (form.newPassword.length < 8)
      newErrors.newPassword = "Password must be at least 8 characters";

    if (!form.confirmPassword)
      newErrors.confirmPassword = "Please confirm your password";
    else if (form.newPassword !== form.confirmPassword)
      newErrors.confirmPassword = "Passwords do not match";

    return newErrors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const newErrors = validate();
    setErrors(newErrors);

    if (Object.keys(newErrors).length === 0) {
      setLoading(true);
      try {
        const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";
        const response = await fetch(`${API_URL}/api/auth/reset-password`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email: form.email,
            otp: form.otp,
            newPassword: form.newPassword,
          }),
        });

        const data = await response.json();

        if (response.ok) {
          setSuccess(true);
          showSuccessToast("Password reset successfully!");
        } else {
          const errorMessage = data.message || "Failed to reset password";
          showErrorToast(errorMessage);
          setErrors({ form: errorMessage });
        }
      } catch (err) {
        showErrorToast("Connection error. Please check if the server is running.");
        console.error("Reset password error:", err);
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <div className="min-h-screen flex justify-center items-center bg-[radial-gradient(circle_at_top_left,#0f172a,#020617)] overflow-hidden relative p-5 box-border">
      <div className="relative z-10 w-full max-w-[420px]">
        {/* Background glow */}
        <div className="absolute w-[500px] h-[500px] bg-blue-500/40 rounded-full blur-[120px] -top-[150px] -left-[150px] -z-10 animate-pulse"></div>
        <div className="absolute w-[400px] h-[400px] bg-purple-500/40 rounded-full blur-[120px] -bottom-[120px] -right-[120px] -z-10 animate-pulse"></div>

        {success ? (
          /* ── Success State ── */
          <div className="p-6 sm:p-[30px] rounded-[20px] backdrop-blur-[20px] bg-slate-900/70 border border-white/10 shadow-[0_0_40px_rgba(0,0,0,0.6)] animate-[fadeIn_0.8s_ease] text-center">
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center">
                <CheckCircle className="w-8 h-8 text-green-400" />
              </div>
            </div>
            <h2 className="text-white text-2xl font-semibold mb-2">
              Password Reset Successful
            </h2>
            <p className="text-slate-400 text-sm mb-6">
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
            className="p-6 sm:p-[30px] rounded-[20px] backdrop-blur-[20px] bg-slate-900/70 border border-white/10 shadow-[0_0_40px_rgba(0,0,0,0.6)] animate-[fadeIn_0.8s_ease]"
            onSubmit={handleSubmit}
            noValidate
          >
            {/* Header */}
            <div className="flex justify-center mb-4">
              <div className="w-14 h-14 rounded-full bg-blue-500/20 flex items-center justify-center">
                <KeyRound className="w-7 h-7 text-blue-400" />
              </div>
            </div>
            <h2 className="text-center text-white mb-1 text-2xl font-semibold">
              Reset Password
            </h2>
            <p className="text-center text-slate-400 text-sm mb-6">
              Enter the details below to reset your password
            </p>

            <div className="flex flex-col gap-4 mb-5">
              <Input
                id="email"
                type="email"
                label="Email"
                placeholder="Enter your registered email"
                value={form.email}
                onChange={handleChange}
                error={errors.email}
                disabled={loading}
              />

              <Input
                id="otp"
                type="text"
                label="OTP (6-digit)"
                placeholder="Enter 6-digit OTP"
                value={form.otp}
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
                value={form.newPassword}
                onChange={handleChange}
                error={errors.newPassword}
                helperText="Must be at least 8 characters"
                disabled={loading}
              />

              <Input
                id="confirmPassword"
                type="password"
                label="Confirm Password"
                placeholder="Confirm your new password"
                value={form.confirmPassword}
                onChange={handleChange}
                error={errors.confirmPassword}
                disabled={loading}
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
            <p className="text-center mt-5 text-slate-400 text-[14px] flex items-center justify-center gap-1">
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
