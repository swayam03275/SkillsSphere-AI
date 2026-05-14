import React, { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { loginUser } from "../../features/auth/authSlice";
import Input from "../../shared/components/Input";
import Button from "../../shared/components/Button";
import { useToast } from "../../shared/components";
import Navbar from "../../shared/landing/Navbar";

const Login = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const { loading } = useSelector((state) => state.auth);
  const { success, warning, error: showError } = useToast();

  const [form, setForm] = useState({
    email: "",
    password: "",
  });
  const [rememberMe, setRememberMe] = useState(true);

  const [errors, setErrors] = useState({});

  const handleChange = (e) => {
    const { id, value } = e.target;
    setForm({ ...form, [id]: value });
    
    if (errors[id] || errors.form) {
      setErrors({ ...errors, [id]: "", form: "" });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    let newErrors = {};

    if (!form.email) newErrors.email = "Email is required";
    else if (!/\S+@\S+\.\S+/.test(form.email))
      newErrors.email = "Please enter a valid email";
    if (!form.password) newErrors.password = "Password is required";

    setErrors(newErrors);

    if (Object.keys(newErrors).length > 0) {
      warning("Please fix the highlighted login fields before continuing.");
      return;
    }

    const resultAction = await dispatch(
      loginUser({
        email: form.email.trim().toLowerCase(),
        password: form.password,
        rememberMe,
      }),
    );

    if (loginUser.fulfilled.match(resultAction)) {
      success("Logged in successfully.");
      const fallbackPath = "/dashboard";
      const redirectTo = location.state?.from?.pathname || fallbackPath;
      navigate(redirectTo, { replace: true });
    } else {
      const message = resultAction.payload || "Login failed";
      setErrors({ ...errors, form: message });
      showError(message);
    }
  };

  const goToVerification = () => {
    const email = form.email.trim().toLowerCase();
    navigate(`/verify-email?email=${encodeURIComponent(email)}`, {
      state: { email },
    });
  };

  return (
    <div className="min-h-screen flex flex-col justify-center items-center bg-[radial-gradient(circle_at_top_left,#0f172a,#020617)] overflow-hidden relative px-3 py-6 box-border">
      <Navbar />
      <div className="relative z-10 w-full max-w-[380px]">
        {/* Background glow */}
        <div className="hidden sm:block absolute w-[500px] h-[500px] bg-blue-500/40 rounded-full blur-[120px] -top-[150px] -left-[150px] -z-10 animate-pulse"></div>
        <div className="hidden sm:block absolute w-[400px] h-[400px] bg-purple-500/40 rounded-full blur-[120px] -bottom-[120px] -right-[120px] -z-10 animate-pulse"></div>

        <form
          className="p-4 sm:p-[30px] rounded-[20px] backdrop-blur-[20px] bg-slate-900/70 border border-white/10 shadow-[0_0_40px_rgba(0,0,0,0.6)] animate-[fadeIn_0.8s_ease] w-full"
          onSubmit={handleSubmit}
          noValidate
        >
          <h2 className="text-center text-white mb-5 sm:mb-6 text-xl sm:text-2xl font-semibold">
            Welcome Back
          </h2>

          <div className="flex flex-col gap-3 sm:gap-4 mb-4 sm:mb-5">
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
              placeholder="Enter your password"
              value={form.password}
              onChange={handleChange}
              error={errors.password}
              disabled={loading}
            />
          </div>

          {/* Options */}
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 sm:gap-0 text-xs sm:text-sm text-slate-400 mb-4 px-0 sm:px-1">
            <label htmlFor="remember-me" className="flex items-center gap-2 cursor-pointer">
              <input
                id="remember-me"
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="accent-blue-500 rounded focus:ring-2 focus:ring-blue-500 cursor-pointer"
              />
              Remember me
            </label>
            <Link to="/forgot-password" className="text-blue-400 cursor-pointer hover:underline">
              Forgot?
            </Link>
          </div>

          {/* Button */}
          <Button 
            type="submit"
            fullWidth
            loading={loading}
            disabled={loading}
            className="mt-3 sm:mt-4 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-500 border-none font-bold text-sm sm:text-base hover:scale-105 hover:shadow-[0_0_20px_rgba(59,130,246,0.6)] transition-all duration-300 min-h-[44px]"
          >
            Login
          </Button>

          {errors.form && (
            <div className="mt-3 text-center">
              <p className="text-red-400 text-xs sm:text-sm">{errors.form}</p>
              {errors.form.toLowerCase().includes("verify") && (
                <button
                  type="button"
                  onClick={goToVerification}
                  className="mt-2 text-xs sm:text-sm text-blue-400 hover:underline bg-transparent border-none cursor-pointer"
                >
                  Verify your email
                </button>
              )}
            </div>
          )}
            <div className="mt-4">
              <button
                type="button"  //prevents from validation,so that the toast notification doesnt show up when we click on the continue with google button
                onClick={() => {
                  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
                  const redirect = encodeURIComponent(`${window.location.origin}/auth/callback`);
                  window.location.href = `${API_URL}/api/auth/google?redirect=${redirect}`;
                }}
                className="w-full flex items-center justify-center gap-3 px-4 py-2.5 
                          bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl
                          text-white font-medium transition-all duration-200
                          hover:scale-[1.02] active:scale-[0.98]"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                <span>Continue with Google</span>
              </button>
            </div>
          </form>
          
        
          {/* Footer */}
          <p className="text-center mt-4 sm:mt-5 text-slate-400 text-xs sm:text-sm">
            Don't have an account?{" "}
            <Link to="/register" className="text-blue-400 hover:underline">
              Sign up
            </Link>
          </p>
      </div>
    </div>
  );
};

export default Login;
