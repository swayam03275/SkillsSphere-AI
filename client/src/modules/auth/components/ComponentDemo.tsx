
import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Input, Button, Select } from "../../../shared/components";
const ROLE_OPTIONS = [
  { value: "student",   label: "Student" },
  { value: "tutor",     label: "Tutor" },
  { value: "recruiter", label: "Recruiter" },
];

const ComponentDemo = () => {
  const [formData, setFormData] = useState({ fullName: "", email: "", password: "", role: "" });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleChange = (field) => (e) =>
    setFormData((prev) => ({ ...prev, [field]: e.target.value }));

  const validate = () => {
    const errs = {};
    // @ts-expect-error TODO: Fix pervasive types
    if (!formData.fullName.trim())     errs.fullName = "Full name is required.";
    // @ts-expect-error TODO: Fix pervasive types
    if (!formData.email.includes("@")) errs.email    = "Enter a valid email address.";
    // @ts-expect-error TODO: Fix pervasive types
    if (formData.password.length < 8)  errs.password = "Password must be at least 8 characters.";
    // @ts-expect-error TODO: Fix pervasive types
    if (!formData.role)                 errs.role     = "Please select your role.";
    return errs;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setErrors({});
    setLoading(true);
    setTimeout(() => { setLoading(false); setSubmitted(true); }, 1500);
  };

  const handleReset = () => {
    setFormData({ fullName: "", email: "", password: "", role: "" });
    setErrors({});
    setSubmitted(false);
  };

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">

        {/* Logo + title */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-brand-600 text-white font-bold text-sm mb-4 select-none">
            SS
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Create your account</h1>
          <p className="mt-1 text-sm text-slate-500">Join SkillSphere AI — free to get started</p>
        </div>

        {/* Form card */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm px-8 py-8">
          {submitted ? (
            <div className="text-center py-6">
              <p className="text-slate-700 font-semibold text-lg">Welcome aboard! 🎉</p>
              <p className="text-slate-500 text-sm mt-1">
                Account created for <strong>{formData.email}</strong>
              </p>
              {/* @ts-expect-error TODO: Fix pervasive types */}
              <Button variant="outline" size="sm" className="mt-6" onClick={handleReset}>
                Start over
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
              {/* @ts-expect-error TODO: Fix pervasive types */}
              <Input
                id="reg-name"
                label="Full Name"
                placeholder="Jane Doe"
                value={formData.fullName}
                onChange={handleChange("fullName")}
                // @ts-expect-error TODO: Fix pervasive types
                error={errors.fullName}
                required
              />
              {/* @ts-expect-error TODO: Fix pervasive types */}
              <Input
                id="reg-email"
                label="Email Address"
                type="email"
                placeholder="jane@example.com"
                value={formData.email}
                onChange={handleChange("email")}
                // @ts-expect-error TODO: Fix pervasive types
                error={errors.email}
                required
              />
              {/* @ts-expect-error TODO: Fix pervasive types */}
              <Input
                id="reg-password"
                label="Password"
                type="password"
                placeholder="Min 8 characters"
                value={formData.password}
                onChange={handleChange("password")}
                // @ts-expect-error TODO: Fix pervasive types
                error={errors.password}
                // @ts-expect-error TODO: Fix pervasive types
                helperText={!errors.password ? "Use at least 8 characters." : undefined}
                required
              />
              {/* @ts-expect-error TODO: Fix pervasive types */}
              <Select
                id="reg-role"
                label="I am a…"
                options={ROLE_OPTIONS}
                value={formData.role}
                onChange={handleChange("role")}
                // @ts-expect-error TODO: Fix pervasive types
                error={errors.role}
                placeholder="Select your role"
                required
              />
              {/* @ts-expect-error TODO: Fix pervasive types */}
              <Button
                type="submit"
                variant="primary"
                size="md"
                fullWidth
                loading={loading}
              >
                Create Account
              </Button>
            </form>
          )}
        </div>

        {/* Back link */}
        <p className="text-center text-xs text-slate-400 mt-6">
          <Link to="/" className="hover:text-slate-600 underline underline-offset-2">
            ← Back to home
          </Link>
        </p>

      </div>
    </div>
  );
};

export default ComponentDemo;
