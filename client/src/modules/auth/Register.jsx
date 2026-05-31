import { useState, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { Check, X } from "lucide-react";
import { registerUser } from "../../features/auth/authSlice";
import { useToast } from "../../shared/components";
import Button from "../../shared/components/Button";
import Input from "../../shared/components/Input";
import Select from "../../shared/components/Select";
import Navbar from "../../shared/landing/Navbar";
import { API_URL } from "../../config/env";
import { z } from "zod";
import { useDocumentTitle } from "../../hooks/useDocumentTitle";

const registerSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().min(1, "Email is required").email("Please enter a valid email"),
  password: z.string().min(1, "Password is required"),
  confirmPassword: z.string().min(1, "Please confirm your password"),
  role: z.string()
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

// Helper function to calculate password strength
const calculatePasswordStrength = (password) => {
  const criteria = [
    { label: "At least 8 characters", met: password.length >= 8 },
    { label: "Contains uppercase letter", met: /[A-Z]/.test(password) },
    { label: "Contains lowercase letter", met: /[a-z]/.test(password) },
    { label: "Contains a number", met: /[0-9]/.test(password) },
    { label: "Contains special character", met: /[^A-Za-z0-9]/.test(password) },
  ];

  const score = criteria.filter((c) => c.met).length;

  let color = "bg-red-500";
  let label = "Weak";
  
  if (score === 0) {
    color = "bg-slate-200 dark:bg-slate-700";
    label = "";
  } else if (score <= 2) {
    color = "bg-red-500";
    label = "Weak";
  } else if (score === 3) {
    color = "bg-yellow-500";
    label = "Fair";
  } else if (score === 4) {
    color = "bg-emerald-400";
    label = "Good";
  } else if (score === 5) {
    color = "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]";
    label = "Strong";
  }

  return { score, criteria, color, label };
};

const Register = () => {
  useDocumentTitle("Register");
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { loading } = useSelector((state) => state.auth);
  const { success, warning, error: showError } = useToast();

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    role: "student",
  });

  const [errors, setErrors] = useState({});

  const strength = useMemo(() => calculatePasswordStrength(form.password), [form.password]);

  const handleChange = (e) => {
    const { id, value } = e.target;
    setForm({ ...form, [id]: value });

    if (errors[id] || errors.form) {
      setErrors({ ...errors, [id]: "", form: "" });
    }
  };

  const handleRoleChange = (e) => {
    setForm({ ...form, role: e.target.value });
    if (errors.role || errors.form) {
      setErrors({ ...errors, role: "", form: "" });
    }
  };

  const validate = () => {
    const newErrors = {};
    const result = registerSchema.safeParse(form);

    if (!result.success) {
      result.error.errors.forEach((err) => {
        if (!newErrors[err.path[0]]) {
          newErrors[err.path[0]] = err.message;
        }
      });
    }

    if (form.password && strength.score < 4) {
      newErrors.password = "Please create a stronger password (at least Good)";
    }

    return newErrors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const newErrors = validate();
    setErrors(newErrors);

    if (Object.keys(newErrors).length > 0) {
      warning(
        "Please fix the highlighted registration fields before submitting.",
      );
      return;
    }

    const email = form.email.trim().toLowerCase();

    const resultAction = await dispatch(
      registerUser({
        name: form.name.trim(),
        email,
        password: form.password,
        role: form.role,
      }),
    );

    if (registerUser.fulfilled.match(resultAction)) {
      const isAutoVerified = resultAction.payload?.user?.isVerified;
      if (isAutoVerified) {
        success("Account created and verified! You can now log in.");
        navigate("/login", { replace: true });
      } else {
        success("Account created. Check your email for the verification code.");
        navigate(`/verify-email?email=${encodeURIComponent(email)}`, {
          state: { email },
          replace: true,
        });
      }
    } else {
      const message = resultAction.payload || "Registration failed";
      setErrors({
        ...errors,
        form: message,
      });
      showError(message);
    }
  };

  const roleOptions = [
    { value: "student", label: "Student" },
    { value: "tutor", label: "Tutor" },
    { value: "recruiter", label: "Recruiter" },
  ];

  const passwordsMatch =
    form.password && form.confirmPassword && form.password === form.confirmPassword;

  const isSubmitDisabled =
    loading ||
    !form.password ||
    !form.confirmPassword ||
    form.password !== form.confirmPassword ||
    strength.score < 4;

  return (
    <div className="min-h-[125vh] flex flex-col justify-center items-center bg-slate-50 dark:bg-[radial-gradient(circle_at_top_left,#0f172a,#020617)] overflow-hidden relative px-3 py-6 box-border">
      <Navbar />
      <div className="relative z-10 w-full max-w-[380px] mt-16 sm:mt-24">
        {/* Background glow */}
        <div className="hidden sm:block absolute w-[520px] h-[520px] bg-blue-400/45 dark:bg-blue-500/40 rounded-full blur-[140px] dark:blur-[120px] -top-[150px] -left-[150px] -z-10 animate-pulse"></div>
        <div className="hidden sm:block absolute w-[420px] h-[420px] bg-purple-400/45 dark:bg-purple-500/40 rounded-full blur-[140px] dark:blur-[120px] -bottom-[120px] -right-[120px] -z-10 animate-pulse"></div>

        <form
          className="p-4 sm:p-[30px] rounded-[20px] backdrop-blur-[20px] bg-white/95 dark:bg-slate-900/70 border border-slate-200 dark:border-white/10 shadow-[0_20px_60px_rgba(15,23,42,0.14)] dark:shadow-[0_0_40px_rgba(0,0,0,0.6)] animate-[fadeIn_0.8s_ease] w-full"
          onSubmit={handleSubmit}
          noValidate
        >
          <h2 className="text-center text-gray-900 dark:text-white mb-5 sm:mb-6 text-xl sm:text-2xl font-semibold">
            Create Account
          </h2>

          <div className="flex flex-col gap-3 sm:gap-4 mb-4 sm:mb-5">
            <Input
              id="name"
              label="Full Name"
              placeholder="Enter your full name"
              value={form.name}
              onChange={handleChange}
              error={errors.name}
              disabled={loading}
            />

            <Input
              id="email"
              type="email"
              label="Email"
              placeholder="Enter your email"
              value={form.email}
              onChange={handleChange}
              error={errors.email}
              disabled={loading}
            />

            <div className="flex flex-col gap-1">
              <Input
                id="password"
                type="password"
                label="Password"
                placeholder="Create a password"
                value={form.password}
                onChange={handleChange}
                error={errors.password}
                disabled={loading}
              />
              
              {/* Password Strength Indicator */}
              {form.password && (
                <div className="mt-1 flex flex-col gap-2">
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <span className="text-slate-500 dark:text-slate-400">Password Strength:</span>
                    <span className={`${strength.color.split(' ')[0].replace('bg-', 'text-')}`}>{strength.label}</span>
                  </div>
                  <div className="flex h-1.5 w-full gap-1">
                    {[1, 2, 3, 4, 5].map((index) => (
                      <div
                        key={index}
                        className={`h-full w-full rounded-full transition-all duration-300 ${
                          index <= strength.score ? strength.color : "bg-slate-200 dark:bg-slate-700"
                        }`}
                      />
                    ))}
                  </div>
                  <div className="mt-2 grid grid-cols-1 gap-1 text-[11px] sm:text-xs">
                    {strength.criteria.map((criterion, idx) => (
                      <div
                        key={idx}
                        className={`flex items-center gap-1.5 transition-colors duration-200 ${
                          criterion.met ? "text-emerald-500" : "text-slate-400 dark:text-slate-500"
                        }`}
                      >
                        {criterion.met ? <Check size={14} /> : <X size={14} />}
                        <span>{criterion.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <Input
              id="confirmPassword"
              type="password"
              label="Confirm Password"
              placeholder="Confirm your password"
              value={form.confirmPassword}
              onChange={handleChange}
              error={errors.confirmPassword}
              disabled={loading}
            />
            {passwordsMatch && (
              <p className="text-emerald-500 text-xs sm:text-sm -mt-1 font-medium flex items-center gap-1">
                <Check size={16} /> Passwords match
              </p>
            )}

            <Select
              id="role"
              label="I am a"
              value={form.role}
              onChange={handleRoleChange}
              options={roleOptions}
              disabled={loading}
            />
          </div>

          <Button
            type="submit"
            fullWidth
            loading={loading}
            disabled={isSubmitDisabled}
            className="mt-3 sm:mt-4 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-500 border-none font-bold text-sm sm:text-base hover:scale-105 hover:shadow-[0_0_20px_rgba(59,130,246,0.6)] transition-all duration-300 min-h-[44px] disabled:opacity-50 disabled:hover:scale-100 disabled:hover:shadow-none"
          >
            {loading ? "Creating Account..." : "Sign Up"}
          </Button>

          {errors.form && (
            <p className="text-red-400 text-center mt-3 text-xs sm:text-sm">
              {errors.form}
            </p>
          )}
          <div className="mt-4">
            <button
              type="button"
              onClick={() => {
                const redirect = encodeURIComponent(
                  `${window.location.origin}/auth/callback`,
                );
                window.location.href = `${API_URL}/api/auth/google?redirect=${redirect}`;
              }}
              className="w-full flex items-center justify-center gap-3 px-4 py-2.5 
                          bg-white hover:bg-slate-50 dark:bg-white/5 dark:hover:bg-white/10 border border-slate-200 dark:border-white/10 rounded-xl
                          text-gray-900 dark:text-white font-medium transition-all duration-200
                          hover:scale-[1.02] active:scale-[0.98]"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path
                  fill="currentColor"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="currentColor"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="currentColor"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="currentColor"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              <span>Continue with Google</span>
            </button>
          </div>
        </form>
        {/* Footer */}
        <p className="text-center mt-4 sm:mt-5 text-slate-600 dark:text-slate-400 text-xs sm:text-sm">
          Already have an account?{" "}
          <span
            className="text-blue-400 cursor-pointer hover:underline"
            onClick={() => navigate("/login")}
          >
            Login
          </span>
        </p>
      </div>
    </div>
  );
};

export default Register;
