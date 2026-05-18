import React, { useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import {
  resendOtp,
  setPendingVerificationEmail,
  verifyEmail,
} from "../../features/auth/authSlice";
import Button from "../../shared/components/Button";
import Input from "../../shared/components/Input";
import { useToast } from "../../shared/components";
import { ShieldCheck, ArrowLeft, CheckCircle } from "lucide-react";

const OTP_LENGTH = 6;
const COOLDOWN_SECONDS = 60;

const isValidEmail = (email) => /\S+@\S+\.\S+/.test(email);

const VerifyEmail = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { success: showSuccess, error: showError } = useToast();
  const {
    pendingVerificationEmail,
    verificationLoading,
    resendLoading,
  } = useSelector((state) => state.auth);

  const initialEmail =
    searchParams.get("email") ||
    location.state?.email ||
    pendingVerificationEmail ||
    "";

  const [email, setEmail] = useState(initialEmail);
  const [emailError, setEmailError] = useState("");
  const [otp, setOtp] = useState(Array(OTP_LENGTH).fill(""));
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [countdown, setCountdown] = useState(COOLDOWN_SECONDS);
  const [canResend, setCanResend] = useState(false);

  const inputRefs = useRef([]);

  useEffect(() => {
    if (initialEmail) {
      dispatch(setPendingVerificationEmail(initialEmail));
    }
  }, [dispatch, initialEmail]);

  useEffect(() => {
    if (countdown <= 0) {
      setCanResend(true);
      return undefined;
    }

    const timer = window.setInterval(() => {
      setCountdown((prev) => prev - 1);
    }, 1000);

    return () => window.clearInterval(timer);
  }, [countdown]);

  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
  };

  const normalizedEmail = email.trim().toLowerCase();
  const otpValue = otp.join("");
  const isComplete = otp.every(Boolean) && otpValue.length === OTP_LENGTH;

  const validateEmailField = () => {
    if (!normalizedEmail) {
      setEmailError("Email is required");
      return false;
    }

    if (!isValidEmail(normalizedEmail)) {
      setEmailError("Please enter a valid email");
      return false;
    }

    setEmailError("");
    return true;
  };

  const handleEmailChange = (e) => {
    setEmail(e.target.value);
    setEmailError("");
    setError("");
  };

  const handleOtpChange = (index, value) => {
    if (value && !/^\d$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);
    setError("");

    if (value && index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }

    if (e.key === "ArrowRight" && index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }

    if (e.key === "ArrowLeft" && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData
      .getData("text")
      .replace(/\D/g, "")
      .slice(0, OTP_LENGTH);

    if (!pasted) return;

    const newOtp = Array(OTP_LENGTH).fill("");
    for (let i = 0; i < pasted.length; i += 1) {
      newOtp[i] = pasted[i];
    }

    setOtp(newOtp);
    setError("");

    const focusIndex = Math.min(pasted.length, OTP_LENGTH - 1);
    inputRefs.current[focusIndex]?.focus();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!validateEmailField()) return;

    if (!isComplete) {
      setError("Please enter all 6 digits");
      return;
    }

    const resultAction = await dispatch(
      verifyEmail({
        email: normalizedEmail,
        otp: otpValue,
      }),
    );

    if (verifyEmail.fulfilled.match(resultAction)) {
      setSuccess(true);
      showSuccess("Email verified successfully. You can now log in.");
    } else {
      const message = resultAction.payload || "Email verification failed";
      setError(message);
      showError(message);
    }
  };

  const handleResend = async () => {
    if (!canResend || resendLoading) return;
    setError("");

    if (!validateEmailField()) return;

    const resultAction = await dispatch(resendOtp({ email: normalizedEmail }));

    if (resendOtp.fulfilled.match(resultAction)) {
      setOtp(Array(OTP_LENGTH).fill(""));
      setCountdown(COOLDOWN_SECONDS);
      setCanResend(false);
      inputRefs.current[0]?.focus();
      showSuccess("A new verification code has been sent.");
    } else {
      const message = resultAction.payload || "Could not resend verification code";
      setError(message);
      showError(message);
    }
  };

  return (
    <div className="min-h-screen flex justify-center items-center bg-slate-50 dark:bg-[radial-gradient(circle_at_top_left,#0f172a,#020617)] overflow-hidden relative p-5 box-border">
      <div className="relative z-10 w-full max-w-[420px]">
        <div className="absolute w-[520px] h-[520px] bg-blue-400/45 dark:bg-blue-500/40 rounded-full blur-[140px] dark:blur-[120px] -top-[150px] -left-[150px] -z-10 animate-pulse"></div>
        <div className="absolute w-[420px] h-[420px] bg-purple-400/45 dark:bg-purple-500/40 rounded-full blur-[140px] dark:blur-[120px] -bottom-[120px] -right-[120px] -z-10 animate-pulse"></div>

        {success ? (
          <div className="p-6 sm:p-[30px] rounded-[20px] backdrop-blur-[20px] bg-white/95 dark:bg-slate-900/70 border border-slate-200 dark:border-white/10 shadow-[0_20px_60px_rgba(15,23,42,0.14)] dark:shadow-[0_0_40px_rgba(0,0,0,0.6)] animate-[fadeIn_0.8s_ease] text-center">
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center">
                <CheckCircle className="w-8 h-8 text-green-400" />
              </div>
            </div>
            <h2 className="text-gray-900 dark:text-white text-2xl font-semibold mb-2">
              Email Verified
            </h2>
            <p className="text-slate-600 dark:text-slate-400 text-sm mb-6">
              Your email has been verified successfully. Log in to continue.
            </p>
            <Button
              fullWidth
              className="rounded-xl bg-gradient-to-r from-blue-500 to-indigo-500 border-none font-bold text-[15px] hover:scale-105 hover:shadow-[0_0_20px_rgba(59,130,246,0.6)] transition-all duration-300"
              onClick={() => navigate("/login", { replace: true })}
            >
              Continue to Login
            </Button>
          </div>
        ) : (
          <form
            className="p-6 sm:p-[30px] rounded-[20px] backdrop-blur-[20px] bg-white/95 dark:bg-slate-900/70 border border-slate-200 dark:border-white/10 shadow-[0_20px_60px_rgba(15,23,42,0.14)] dark:shadow-[0_0_40px_rgba(0,0,0,0.6)] animate-[fadeIn_0.8s_ease]"
            onSubmit={handleSubmit}
            noValidate
          >
            <div className="flex justify-center mb-4">
              <div className="w-14 h-14 rounded-full bg-blue-500/20 flex items-center justify-center">
                <ShieldCheck className="w-7 h-7 text-blue-400" />
              </div>
            </div>
            <h2 className="text-center text-gray-900 dark:text-white mb-1 text-2xl font-semibold">
              Verify Your Email
            </h2>
            <p className="text-center text-slate-600 dark:text-slate-400 text-sm mb-6">
              Enter the email and 6-digit code sent during registration.
            </p>

            <div className="mb-5">
              <Input
                id="email"
                type="email"
                label="Email"
                placeholder="Enter your registered email"
                value={email}
                onChange={handleEmailChange}
                error={emailError}
                disabled={verificationLoading || resendLoading}
              />
            </div>

            <div className="flex justify-center gap-2 sm:gap-3 mb-2" onPaste={handlePaste}>
              {otp.map((digit, index) => (
                <input
                  key={index}
                  ref={(el) => (inputRefs.current[index] = el)}
                  id={`otp-digit-${index}`}
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleOtpChange(index, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(index, e)}
                  disabled={verificationLoading}
                  aria-label={`Digit ${index + 1}`}
                  className={`
                    w-11 h-13 sm:w-12 sm:h-14 text-center text-xl font-semibold
                    rounded-lg border bg-white dark:bg-slate-800 text-gray-900 dark:text-white caret-transparent
                    transition-all duration-200
                    focus:outline-none focus:ring-2 focus:ring-offset-0
                    ${
                      error
                        ? "border-red-400 focus:ring-red-400"
                        : digit
                        ? "border-blue-500 focus:ring-blue-500 shadow-[0_0_12px_rgba(59,130,246,0.3)]"
                        : "border-slate-600 focus:ring-blue-500 hover:border-slate-500"
                    }
                    ${verificationLoading ? "cursor-not-allowed opacity-60" : ""}
                  `}
                />
              ))}
            </div>

            {error && (
              <p className="text-center text-xs text-red-400 mt-2 flex items-center justify-center gap-1">
                <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                  <path fillRule="evenodd" d="M18 10A8 8 0 1 1 2 10a8 8 0 0 1 16 0Zm-8-5a.75.75 0 0 1 .75.75v4.5a.75.75 0 0 1-1.5 0v-4.5A.75.75 0 0 1 10 5Zm0 10a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" clipRule="evenodd" />
                </svg>
                {error}
              </p>
            )}

            <div className="text-center mt-6 mb-6">
              {canResend ? (
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={resendLoading}
                  className="text-blue-400 hover:text-blue-300 text-sm font-medium cursor-pointer bg-transparent border-none hover:underline transition-colors duration-200 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {resendLoading ? "Sending..." : "Resend OTP"}
                </button>
              ) : (
                <p className="text-slate-600 dark:text-slate-500 text-sm">
                  Resend code in{" "}
                  <span className="text-blue-400 font-semibold tabular-nums">
                    {formatTime(countdown)}
                  </span>
                </p>
              )}
            </div>

            <Button
              type="submit"
              fullWidth
              loading={verificationLoading}
              disabled={!isComplete || verificationLoading}
              className="rounded-xl bg-gradient-to-r from-blue-500 to-indigo-500 border-none font-bold text-[15px] hover:scale-105 hover:shadow-[0_0_20px_rgba(59,130,246,0.6)] transition-all duration-300"
            >
              Verify Email
            </Button>

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

export default VerifyEmail;
