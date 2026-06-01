import { useState, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link, useNavigate } from "react-router-dom";
import { Check, X } from "lucide-react";
import { registerUser } from "../../features/auth/authSlice";
import { useToast } from "../../shared/components";
import Button from "../../shared/components/Button";
import Input from "../../shared/components/Input";
import Select from "../../shared/components/Select";
import GoogleOAuthButton from "../../shared/components/GoogleOAuthButton";
import Navbar from "../../modules/landing/components/Navbar";
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

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    role: "student",
  });

  const [errors, setErrors] = useState({});

  const strength = useMemo(() => calculatePasswordStrength(formData.password), [formData.password]);

  const handleChange = (e) => {
    const { id, value } = e.target;
    setFormData({ ...formData, [id]: value });

    if (errors[id] || errors.form) {
      setErrors({ ...errors, [id]: "", form: "" });
    }
  };

  const handleRoleChange = (e) => {
    setFormData({ ...formData, role: e.target.value });
    if (errors.role || errors.form) {
      setErrors({ ...errors, role: "", form: "" });
    }
  };

  const validate = () => {
    const parsed = registerSchema.safeParse(formData);
    const newErrors = {};

    if (!parsed.success) {
      parsed.error.issues.forEach((issue) => {
        if (!newErrors[issue.path[0]]) {
          newErrors[issue.path[0]] = issue.message;
        }
      });
    }

    if (formData.password && strength.score < 4) {
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

    const email = formData.email.trim().toLowerCase();

    const resultAction = await dispatch(
      registerUser({
        name: formData.name.trim(),
        email,
        password: formData.password,
        role: formData.role,
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
    formData.password && formData.confirmPassword && formData.password === formData.confirmPassword;

  const isSubmitDisabled =
    loading ||
    !formData.password ||
    !formData.confirmPassword ||
    formData.password !== formData.confirmPassword ||
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
              value={formData.name}
              onChange={handleChange}
              error={errors.name}
              disabled={loading}
            />

            <Input
              id="email"
              type="email"
              label="Email"
              placeholder="Enter your email"
              value={formData.email}
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
                value={formData.password}
                onChange={handleChange}
                error={errors.password}
                disabled={loading}
              />
              
              {/* Password Strength Indicator */}
              {formData.password && (
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
              value={formData.confirmPassword}
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
              value={formData.role}
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
          <GoogleOAuthButton role={form.role} />
        </form>
        {/* Footer */}
        <p className="text-center mt-4 sm:mt-5 text-slate-600 dark:text-slate-400 text-xs sm:text-sm">
          Already have an account?{" "}
          <Link
            to="/login"
            className="text-blue-400 hover:underline"
          >
            Login
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Register;
