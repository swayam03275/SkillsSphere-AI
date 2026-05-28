import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Input from "../../shared/components/Input";
import Button from "../../shared/components/Button";
import { useToast } from "../../shared/components";
import { API_URL } from "../../config/env";

const ForgotPassword = () => {
  const navigate = useNavigate();
  const { success, error: showError } = useToast();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email) {
      setError("Email is required");
      return;
    }
    if (!/\S+@\S+\.\S+/.test(email)) {
      setError("Please enter a valid email");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await fetch(`${API_URL}/api/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });

      const data = await response.json();

      if (response.ok) {
        success("OTP sent to your email!");
        // Navigate to reset password and pass the email so they don't have to re-type it
        navigate(`/reset-password?email=${encodeURIComponent(email)}`);
      } else {
        showError(data.message || "Failed to send OTP");
      }
    } catch (err) {
      showError("Connection error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-center items-center bg-slate-50 dark:bg-[radial-gradient(circle_at_top_left,#0f172a,#020617)] overflow-hidden relative px-3 py-6 box-border">
      <div className="relative z-10 w-full max-w-[400px]">
        {/* Background glow */}
        <div className="hidden sm:block absolute w-[520px] h-[520px] bg-blue-400/40 dark:bg-blue-500/30 rounded-full blur-[140px] dark:blur-[120px] -top-[150px] -left-[150px] -z-10 animate-pulse"></div>
        <div className="hidden sm:block absolute w-[400px] h-[400px] bg-purple-400/35 dark:bg-transparent rounded-full blur-[140px] -bottom-[120px] -right-[120px] -z-10 animate-pulse"></div>

        <form
          className="p-6 sm:p-8 rounded-[24px] backdrop-blur-[20px] bg-white/95 dark:bg-slate-900/70 border border-slate-200 dark:border-white/10 shadow-[0_20px_60px_rgba(15,23,42,0.14)] dark:shadow-[0_0_40px_rgba(0,0,0,0.6)] animate-[fadeIn_0.8s_ease] w-full"
          onSubmit={handleSubmit}
          noValidate
        >
          <div className="flex justify-center mb-6">
            <div className="w-14 h-14 bg-blue-500/20 rounded-2xl flex items-center justify-center border border-blue-500/30 shadow-[0_0_20px_rgba(59,130,246,0.2)]">
              <svg className="w-7 h-7 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
          </div>

          <h2 className="text-center text-gray-900 dark:text-white mb-2 text-2xl font-bold tracking-tight">
            Forgot Password?
          </h2>
          <p className="text-center text-slate-600 dark:text-slate-400 mb-8 text-sm leading-relaxed">
            Enter your email address and we'll send you a 6-digit code to reset your password.
          </p>

          <div className="mb-6">
            <Input
              id="email"
              type="email"
              label="Email Address"
              placeholder="Enter your registered email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (error) setError("");
              }}
              error={error}
              disabled={loading}
            />
          </div>

          <Button
            type="submit"
            fullWidth
            loading={loading}
            disabled={loading}
            className="rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 font-bold hover:scale-[1.02] active:scale-[0.98] transition-all duration-200"
          >
            Send OTP
          </Button>

          <div className="mt-8 text-center">
            <Link
              to="/login"
              className="text-slate-600 hover:text-gray-900 dark:text-slate-400 dark:hover:text-white transition-colors duration-200 text-sm flex items-center justify-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Back to Login
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ForgotPassword;
