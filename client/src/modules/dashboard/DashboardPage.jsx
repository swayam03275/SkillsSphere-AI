import React from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link, useNavigate } from "react-router-dom";
import { LogOut, Menu, User, FileText, Target, Briefcase, Video, BadgeCheck, Sparkles } from "lucide-react";

import { logout } from "../../features/auth/authSlice";
import Button from "../../shared/components/Button";
import Navbar from "../../shared/components/Navbar";
import Footer from "../../shared/components/Footer";

import { useDocumentTitle } from "../../hooks/useDocumentTitle";

import StudentDashboard from "./components/dashboards/StudentDashboard";
import TutorDashboard from "./components/dashboards/TutorDashboard";
import RecruiterDashboard from "./components/dashboards/RecruiterDashboard";

const ROLE_LABELS = {
  student: "Student",
  tutor: "Tutor",
  recruiter: "Recruiter",
};

const getSidebarItems = (role) => {
  if (role === "tutor") {
    return [
      { label: "Analytics", icon: Target, to: "/tutor/analytics" },
      { label: "Roadmaps", icon: FileText, to: "/tutor/roadmaps" },
      { label: "Interviews", icon: Video, to: "/tutor/interviews" },
      { label: "Classrooms", icon: Video, to: "/classrooms" },
    ];
  }
  if (role === "recruiter") {
    return [
      { label: "Manage Jobs", icon: Briefcase, to: "/recruiter/jobs" },
      { label: "Talent Finder", icon: Target, to: "/recruiter/talent-finder" },
      { label: "Analytics", icon: FileText, to: "/recruiter/analytics" },
    ];
  }
  // Default to student
  return [
    { label: "Resume Analyzer", icon: FileText, to: "/resume-analyzer" },
    { label: "Smart Job Matching", icon: Target, to: "/job-matcher" },
    { label: "My Applications", icon: Briefcase, to: "/my-applications" },
    { label: "Mock Interview", icon: Video, to: "/mock-interview" },
    { label: "Live Classrooms", icon: Video, to: "/classrooms" },
  ];
};

const DashboardPage = () => {
  useDocumentTitle("Dashboard");
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user, token } = useSelector((state) => state.auth);

  const isStudent = user?.role === "student";
  const isRecruiter = user?.role === "recruiter";
  const isTutor = user?.role === "tutor";

  const handleLogout = () => {
    dispatch(logout());
    navigate("/login", { replace: true });
  };

  return (
    <main className="relative min-h-screen w-full overflow-hidden bg-[#d8dde5] text-gray-900 dark:bg-slate-950 dark:text-slate-100 flex flex-col">
      <div className="flex-1 px-3 pb-6 pt-20 sm:px-6 sm:pb-8 sm:pt-24 w-full">
      <div className="pointer-events-none absolute -left-28 top-12 h-72 w-72 rounded-full bg-emerald-400/30 blur-3xl dark:bg-emerald-500/20" />
      <div className="pointer-events-none absolute -right-24 top-28 h-80 w-80 rounded-full bg-violet-400/25 blur-3xl dark:bg-violet-500/20" />
      <div className="pointer-events-none absolute bottom-8 left-1/3 h-72 w-72 rounded-full bg-gradient-to-br from-emerald-400/20 to-violet-400/20 blur-3xl dark:from-emerald-500/15 dark:to-violet-500/15" />
      <Navbar />

      <div className="w-full py-4 sm:py-6">
        <div className="grid gap-4 lg:min-h-[calc(100vh-8.5rem)] lg:grid-cols-[240px_minmax(0,1fr)] pb-32">
          {/* Sidebar */}
          <aside className="rounded-xl bg-[#0f3558] px-5 py-10 text-white shadow-[0_20px_40px_rgba(12,26,47,0.25)] dark:bg-slate-900 dark:shadow-[0_20px_40px_rgba(0,0,0,0.5)] lg:min-h-[calc(100vh-8.5rem)]">
            <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-[#1a486f] shadow-[0_8px_20px_rgba(0,0,0,0.25)] dark:bg-slate-800">
              <User size={40} className="text-slate-100" />
            </div>
            <h2 className="text-center text-2xl font-semibold uppercase tracking-wide">
              {user?.name || "Dashboard User"}
            </h2>
            <p className="mt-2 break-all text-center text-xs text-blue-100/80 dark:text-slate-400">
              {user?.email || "john.don@company.com"}
            </p>
            <div className="mt-6 text-center">
              <p className="text-[10px] uppercase tracking-[0.2em] text-blue-200/70 dark:text-slate-400">
                Access Role
              </p>
              <p className="mt-2 text-sm font-semibold text-white">
                {ROLE_LABELS[user?.role] || user?.role || "Member"}
              </p>
            </div>

            <nav className="mt-10 space-y-3">
              {getSidebarItems(user?.role).map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.label}
                    to={item.to}
                    className="flex items-center gap-3 rounded-lg px-3 py-3 text-sm capitalize text-blue-100/90 transition hover:bg-white/10 hover:text-white dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
                  >
                    <Icon size={15} />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>
          </aside>

          {/* Main Dashboard Content */}
          <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-emerald-100 via-violet-100 to-fuchsia-100 p-4 shadow-[0_20px_40px_rgba(12,26,47,0.18)] dark:bg-gradient-to-br dark:from-emerald-950/45 dark:via-violet-950/45 dark:to-fuchsia-950/45 dark:shadow-[0_20px_40px_rgba(0,0,0,0.45)] sm:p-6 lg:min-h-[calc(100vh-8.5rem)]">
            <div className="pointer-events-none absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-emerald-500 via-violet-500 to-fuchsia-500" />
            <div className="pointer-events-none absolute -left-20 top-20 h-56 w-56 rounded-full bg-emerald-400/20 blur-3xl dark:bg-emerald-500/18" />
            <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-violet-400/20 blur-3xl dark:bg-violet-500/18" />
            <div className="pointer-events-none absolute bottom-10 right-1/4 h-52 w-52 rounded-full bg-fuchsia-400/20 blur-3xl dark:bg-fuchsia-500/16" />
            
            {/* Header Section */}
            <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h1 className="bg-gradient-to-r from-emerald-600 via-violet-600 to-fuchsia-600 bg-clip-text text-2xl font-semibold text-transparent dark:from-emerald-300 dark:via-violet-300 dark:to-fuchsia-300 sm:text-3xl">
                  Welcome, {user?.name || "Learner"}
                </h1>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-200/85">
                  {ROLE_LABELS[user?.role] || "Member"} workspace overview
                </p>
              </div>

              <div className="flex items-center gap-2 self-start sm:self-auto">
                <button
                  type="button"
                  className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 shadow-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                  aria-label="Dashboard menu"
                >
                  <Menu size={18} />
                </button>

                <Button
                  variant="outline"
                  size="md"
                  onClick={handleLogout}
                  leftIcon={<LogOut size={16} />}
                  className="border-slate-200 bg-white text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                >
                  Logout
                </Button>
              </div>
            </div>

            {/* Role Specific Sub-Dashboards */}
            {isStudent && <StudentDashboard token={token} />}
            {isTutor && <TutorDashboard token={token} />}
            {isRecruiter && <RecruiterDashboard token={token} />}

            {/* Account Status - Common for all roles */}
            <div className="mt-6 rounded-2xl border border-gray-200 dark:border-white/10 bg-gray-100 dark:bg-slate-900/50 p-6 backdrop-blur-md">
              <h3 className="text-[10px] font-bold text-gray-500 dark:text-slate-500 uppercase tracking-widest mb-4">
                Account Status
              </h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`h-8 w-8 rounded-full flex items-center justify-center ${user?.isVerified ? "bg-emerald-500/20 text-emerald-400" : "bg-slate-500/20 text-slate-400"}`}>
                      <BadgeCheck size={16} />
                    </div>
                    <span className="text-sm font-medium">
                      {user?.isVerified ? "Verified Account" : "Unverified Account"}
                    </span>
                  </div>
                  {user?.isVerified && <div className="h-1.5 w-1.5 rounded-full bg-emerald-500"></div>}
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`h-8 w-8 rounded-full flex items-center justify-center ${user?.proFeatures ? "bg-blue-500/20 text-blue-400" : "bg-slate-500/20 text-slate-400"}`}>
                      <Sparkles size={16} />
                    </div>
                    <span className="text-sm font-medium">Pro Features</span>
                  </div>
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${user?.proFeatures ? "bg-blue-500 text-white" : "bg-slate-500/20 text-slate-500"}`}>
                    {user?.proFeatures ? "ACTIVE" : "INACTIVE"}
                  </span>
                </div>
              </div>
            </div>
            
          </div>
        </div>
      </div>
      </div>
      <Footer />
    </main>
  );
};

export default DashboardPage;
