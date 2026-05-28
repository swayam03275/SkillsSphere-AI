import { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { registerUser } from "../../features/auth/authSlice";
import { useToast } from "../../shared/components";
import Button from "../../shared/components/Button";
import Input from "../../shared/components/Input";
import Select from "../../shared/components/Select";
import Navbar from "../../shared/landing/Navbar";
import { API_URL } from "../../config/env";

const Register = () => {
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

    if (!form.name.trim()) newErrors.name = "Name is required";
    else if (form.name.trim().length < 2)
      newErrors.name = "Name must be at least 2 characters";

    if (!form.email.trim()) newErrors.email = "Email is required";
    else if (!/\S+@\S+\.\S+/.test(form.email))
      newErrors.email = "Please enter a valid email";

    if (!form.password) newErrors.password = "Password is required";
    else if (form.password.length < 8)
      newErrors.password = "Password must be at least 8 characters";

    if (!form.confirmPassword)
      newErrors.confirmPassword = "Please confirm your password";
    else if (form.password !== form.confirmPassword)
      newErrors.confirmPassword = "Passwords do not match";

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
    form.password !== form.confirmPassword;

  return (
    <div className="h-[125vh] flex flex-col justify-center items-center bg-slate-50 dark:bg-[radial-gradient(circle_at_top_left,#0f172a,#020617)] overflow-hidden relative px-3 py-6 box-border">
      <Navbar />
      <div className="relative z-10 w-full max-w-[380px]">
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
              <p className="text-green-400 text-xs sm:text-sm -mt-1">
                ✓ Passwords match
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
            className="mt-3 sm:mt-4 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-500 border-none font-bold text-sm sm:text-base hover:scale-105 hover:shadow-[0_0_20px_rgba(59,130,246,0.6)] transition-all duration-300 min-h-[44px]"
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
