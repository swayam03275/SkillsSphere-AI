import React, { useState, useEffect, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link, useNavigate } from "react-router-dom";
import DashboardSkeleton from "./components/DashboardSkeleton";
import {
  BadgeCheck,
  FileText,
  LogOut,
  Mail,
  Shield,
  User,
  Activity,
  CheckCircle,
  AlertCircle,
  TrendingUp,
  Clock,
  ArrowRight,
  Target,
  Sparkles,
  Zap,
  ChevronRight,
  BarChart3,
  Calendar,
  PlusCircle,
  Briefcase,
  LayoutDashboard,
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  BarChart,
  Bar,
  Cell,
} from "recharts";
import { logout } from "../../features/auth/authSlice";
import Button from "../../shared/components/Button";
import Navbar from "../../shared/landing/Navbar";
import { getAnalysisHistory, getSkillTrends } from "./services/dashboardService";
import { getMyRoadmap } from "../roadmap/services/roadmapService";
import { getRecruiterJobs } from "../recruiter-jobs/services/jobPostingService";
import { Rocket } from "lucide-react";
import SuggestionItem from "./components/SuggestionItem";
import StatCard from "./components/StatCard";
import PerformanceTrend from "./components/PerformanceTrend";
import VersionComparisonModal from "./components/VersionComparisonModal";

const ROLE_LABELS = {
  student: "Student",
  tutor: "Tutor",
  recruiter: "Recruiter",
};

const DashboardPage = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user, token } = useSelector((state) => state.auth);
  const [history, setHistory] = useState([]);
  const [recruiterJobs, setRecruiterJobs] = useState([]);
  const [skillTrends, setSkillTrends] = useState([]);
  const [roadmap, setRoadmap] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedVersions, setSelectedVersions] = useState([]);
  const [showComparison, setShowComparison] = useState(false);

  const isStudent = user?.role === "student";
  const isRecruiter = user?.role === "recruiter";
  const isTutor = user?.role === "tutor";

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        if (isStudent) {
          const response = await getAnalysisHistory(token);
          if (response.success) {
            setHistory(response.data || []);
          }
        } else if (isRecruiter) {
          const response = await getRecruiterJobs(token);
          if (response.success) {
            setRecruiterJobs(response.jobs || []);
          }
        }

        // Fetch Skill Trends for both if needed, but mostly for students
        if (isStudent) {
          const [trendsRes, roadmapRes] = await Promise.all([
            getSkillTrends(),
            getMyRoadmap()
          ]);
          if (trendsRes.success) setSkillTrends(trendsRes.trends || []);
          if (roadmapRes.success) setRoadmap(roadmapRes.data || null);
        }
      } catch (error) {
        console.error("Failed to fetch dashboard data:", error);
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      if (isStudent || isRecruiter) {
        fetchData();
      } else {
        setLoading(false);
      }
    }
  }, [user, isStudent, isRecruiter, token]);

  const chartData = useMemo(() => {
    return [...history].reverse().map((item) => ({
      date: new Date(item.createdAt).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
      }),
      score: item.score,
      fullDate: new Date(item.createdAt).toLocaleDateString(undefined, {
        year: "numeric",
        month: "long",
        day: "numeric",
      }),
    }));
  }, [history]);

  const handleLogout = () => {
    dispatch(logout());
    navigate("/login", { replace: true });
  };

  const toggleVersionSelection = (id) => {
    setSelectedVersions((prev) => {
      if (prev.includes(id)) return prev.filter((v) => v !== id);
      if (prev.length >= 2) return [prev[1], id];
      return [...prev, id];
    });
  };

  const compareData = useMemo(() => {
    if (selectedVersions.length !== 2) return null;
    return selectedVersions.map((id) =>
      history.find((item) => item._id === id),
    );
  }, [selectedVersions, history]);

  const latestAnalysis = history.length > 0 ? history[0] : null;
  const nextMilestone = roadmap?.roadmap?.find(t => t.status !== "completed");

  // Recruiter Stats Calculation
  const jobStats = useMemo(() => {
    if (!isRecruiter) return null;
    const jobs = Array.isArray(recruiterJobs) ? recruiterJobs : [];
    return {
      total: jobs.length,
      open: jobs.filter(
        (j) => j.status === "open" || j.status === "active" || !j.status,
      ).length,
      closed: jobs.filter((j) => j.status === "closed").length,
      draft: jobs.filter((j) => j.status === "draft").length,
    };
  }, [recruiterJobs, isRecruiter]);

  return (
    <main className="min-h-screen bg-white dark:bg-[radial-gradient(circle_at_top_left,#0f172a,#020617)] p-3 sm:p-5 pt-20 sm:pt-28 text-gray-900 dark:text-slate-100">
      <Navbar />

      {loading ? (
        <div className="mx-auto w-full max-w-6xl py-6 sm:py-8 px-0 sm:px-2">
          <DashboardSkeleton />
        </div>
      ) : (
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 sm:gap-8 py-6 sm:py-8 px-0 sm:px-2">
          {/* Header Section */}
          <div className="flex flex-col gap-3 sm:gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <div className="h-2 w-2 rounded-full bg-blue-500 dark:bg-blue-500/20 animate-pulse"></div>
                <p className="text-xs sm:text-sm font-medium text-blue-900 dark:text-blue-300 uppercase tracking-wider">
                  Professional Intelligence
                </p>
              </div>
              <h1 className="text-3xl sm:text-4xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-gray-500 dark:from-white dark:to-slate-400">
                Welcome, {user?.name || "Learner"}
              </h1>
            </div>

            <Button
              variant="outline"
              size="md"
              onClick={handleLogout}
              leftIcon={<LogOut size={16} />}
              className="border-gray-300 dark:border-slate-700/50 bg-gray-100 dark:bg-slate-900/40 text-gray-700 dark:text-slate-300 hover:bg-gray-200 dark:hover:bg-slate-800 hover:text-gray-900 dark:hover:text-white backdrop-blur-sm w-full sm:w-auto transition-all duration-300"
            >
              Logout
            </Button>
          </div>

          {/* User Stats Grid */}
          <section className="grid gap-4 sm:gap-6 md:grid-cols-3 grid-cols-1 sm:grid-cols-2">
            <StatCard
              icon={User}
              label="Profile Name"
              value={user?.name || "Not available"}
              color="blue"
            />
            <StatCard
              icon={Mail}
              label="Email Address"
              value={user?.email || "Not available"}
              color="emerald"
            />
            <StatCard
              icon={Shield}
              label="Access Role"
              value={ROLE_LABELS[user?.role] || user?.role || "Not available"}
              color="violet"
              className="sm:col-span-2 md:col-span-1"
            />
          </section>

          {/* Recruiter Specific Stats Grid */}
          {isRecruiter && (
            <section className="grid gap-4 sm:gap-6 md:grid-cols-3 grid-cols-1">
              <div className="group relative rounded-2xl border border-gray-200 dark:border-white/10 bg-gray-100 dark:bg-slate-900/50 p-5 shadow-2xl backdrop-blur-md transition-all hover:border-blue-500/30">
                <div className="relative">
                  <div className="mb-2 flex items-center justify-between">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/20 text-blue-400">
                      <Briefcase size={20} />
                    </div>
                    <span className="text-2xl font-black text-white">
                      {jobStats?.total || 0}
                    </span>
                  </div>
                  <p className="text-xs font-semibold text-gray-500 dark:text-slate-500 uppercase tracking-widest">
                    Total Jobs Posted
                  </p>
                </div>
              </div>

              <div className="group relative rounded-2xl border border-gray-200 dark:border-white/10 bg-gray-100 dark:bg-slate-900/50 p-5 shadow-2xl backdrop-blur-md transition-all hover:border-emerald-500/30">
                <div className="relative">
                  <div className="mb-2 flex items-center justify-between">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-400">
                      <CheckCircle size={20} />
                    </div>
                    <span className="text-2xl font-black text-white">
                      {jobStats?.open || 0}
                    </span>
                  </div>
                  <p className="text-xs font-semibold text-gray-500 dark:text-slate-500 uppercase tracking-widest">
                    Active Postings
                  </p>
                </div>
              </div>

              <div className="group relative rounded-2xl border border-gray-200 dark:border-white/10 bg-gray-100 dark:bg-slate-900/50 p-5 shadow-2xl backdrop-blur-md transition-all hover:border-amber-500/30">
                <div className="relative">
                  <div className="mb-2 flex items-center justify-between">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/20 text-amber-400">
                      <Clock size={20} />
                    </div>
                    <span className="text-2xl font-black text-white">
                      {(jobStats?.draft || 0) + (jobStats?.closed || 0)}
                    </span>
                  </div>
                  <p className="text-xs font-semibold text-gray-500 dark:text-slate-500 uppercase tracking-widest">
                    Drafts / Closed
                  </p>
                </div>
              </div>
            </section>
          )}

        {/* Analytics Section */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {/* Next Roadmap Milestone - Student Only */}
            {isStudent && nextMilestone && (
              <Link to="/roadmap" className="block group">
                <div className="mb-6 p-6 bg-gradient-to-br from-blue-600/20 to-indigo-900/40 border border-blue-500/20 rounded-[2rem] hover:border-blue-500/40 transition-all shadow-xl relative overflow-hidden group">
                  <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 group-hover:opacity-20 transition-all">
                    <Rocket size={80} className="text-blue-400" />
                  </div>
                  <div className="relative z-10">
                    <div className="flex items-center gap-2 mb-3">
                      <Target size={16} className="text-blue-400" />
                      <span className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-400">
                        Next Career Milestone
                      </span>
                    </div>
                    <h3 className="text-xl font-bold text-white mb-2 group-hover:text-blue-400 transition-colors">
                      Master {nextMilestone.topicName}
                    </h3>
                    <p className="text-sm text-slate-400 max-w-md mb-4 font-medium italic">
                      Completing this milestone will significantly boost your
                      profile strength for {roadmap.targetRole} roles.
                    </p>
                    <div className="flex items-center gap-2 text-xs font-bold text-white bg-white/5 w-fit px-4 py-2 rounded-xl group-hover:bg-blue-600 transition-all">
                      Continue Learning
                      <ChevronRight
                        size={14}
                        className="group-hover:translate-x-1 transition-transform"
                      />
                    </div>
                  </div>
                </div>
              </Link>
            )}

            {/* Score Trend Chart - Student Only */}
            {isStudent && (
              <PerformanceTrend 
                data={chartData} 
                historyLength={history.length} 
                customTooltip={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    return (
                      <div className="bg-slate-900 border border-gray-200 dark:border-white/10 p-3 rounded-lg shadow-xl backdrop-blur-md">
                        <p className="text-xs text-slate-400 mb-1">{payload[0].payload.fullDate}</p>
                        <p className="text-sm font-bold text-blue-400">Score: {payload[0].value}%</p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
            )}

              {/* Skill Trends - Student Only */}
              {isStudent && (
                <div className="rounded-2xl border border-gray-200 dark:border-white/10 bg-gray-100 dark:bg-slate-900/50 overflow-hidden backdrop-blur-md">
                  <div className="border-b border-white/5 bg-white/5 px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="text-emerald-400" size={20} />
                      <h2 className="text-lg font-bold">
                        Trending Skills in Market
                      </h2>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-slate-400 bg-white/5 px-2 py-1 rounded-md">
                      <Activity size={12} />
                      <span>Real-time Insights</span>
                    </div>
                  </div>
                  <div className="p-6 h-[280px] min-h-[280px] w-full">
                    {skillTrends.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={skillTrends}
                          layout="vertical"
                          margin={{ left: 20, right: 30 }}
                        >
                          <XAxis type="number" hide />
                          <YAxis
                            dataKey="skill"
                            type="category"
                            stroke="#94a3b8"
                            fontSize={11}
                            tickLine={false}
                            axisLine={false}
                            width={100}
                          />
                          <RechartsTooltip
                            cursor={{ fill: "rgba(255,255,255,0.05)" }}
                            content={({ active, payload }) => {
                              if (active && payload && payload.length) {
                                return (
                                  <div className="bg-slate-900 border border-white/10 p-2 rounded shadow-lg text-xs">
                                    <span className="font-bold text-emerald-400">
                                      {payload[0].value} jobs
                                    </span>{" "}
                                    requesting this skill
                                  </div>
                                );
                              }
                              return null;
                            }}
                          />
                          <Bar
                            dataKey="count"
                            radius={[0, 4, 4, 0]}
                            barSize={12}
                          >
                            {skillTrends.map((entry, index) => (
                              <Cell
                                key={`cell-${index}`}
                                fill={
                                  [
                                    "#10b981",
                                    "#3b82f6",
                                    "#8b5cf6",
                                    "#f59e0b",
                                    "#ef4444",
                                  ][index % 5]
                                }
                              />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-full flex flex-col items-center justify-center text-gray-500 dark:text-slate-500">
                        <Briefcase size={40} className="opacity-20 mb-3" />
                        <p className="text-sm">
                          No job data available for trends
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Recruiter Jobs List Preview */}
              {isRecruiter && (
                <div className="rounded-2xl border border-gray-200 dark:border-white/10 bg-gray-100 dark:bg-slate-900/50 overflow-hidden backdrop-blur-md">
                  <div className="border-b border-white/5 bg-white/5 px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <LayoutDashboard className="text-blue-400" size={20} />
                      <h2 className="text-lg font-bold">Recent Job Postings</h2>
                    </div>
                    <Link
                      to="/recruiter/jobs"
                      className="text-xs font-medium text-blue-400 hover:underline"
                    >
                      View All
                    </Link>
                  </div>

                  <div className="p-6">
                    {recruiterJobs.length === 0 ? (
                      <div className="py-12 flex flex-col items-center justify-center text-center">
                        <div className="h-16 w-16 bg-slate-800 rounded-full flex items-center justify-center mb-4 text-gray-500 dark:text-slate-500">
                          <Briefcase size={32} />
                        </div>
                        <h3 className="text-xl font-semibold mb-2">
                          No jobs posted yet
                        </h3>
                        <p className="text-slate-400 max-w-sm mb-6">
                          Start recruiting top talent by posting your first job
                          opening today.
                        </p>
                        <Link
                          to="/recruiter/jobs/new"
                          className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-3 font-bold text-white transition hover:bg-blue-500"
                        >
                          <PlusCircle size={18} />
                          Post a New Job
                        </Link>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {recruiterJobs.slice(0, 3).map((job, idx) => (
                          <div
                            key={job.id || idx}
                            className="flex items-center justify-between p-4 rounded-xl bg-slate-800/50 border border-white/5 hover:bg-slate-800 transition-colors"
                          >
                            <div className="flex items-center gap-4">
                              <div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-400">
                                <Target size={20} />
                              </div>
                              <div>
                                <h4 className="font-bold text-gray-900 dark:text-slate-100">
                                  {job.title || job.designation}
                                </h4>
                                <p className="text-xs text-gray-500 dark:text-slate-500">
                                  {typeof job.location === "object"
                                    ? `${job.location.city || ""}${job.location.city && job.location.state ? ", " : ""}${job.location.state || ""} ${job.location.remote ? "(Remote)" : ""}`.trim() ||
                                      "Remote"
                                    : job.location || "Remote"}{" "}
                                  •{" "}
                                  {new Date(job.createdAt).toLocaleDateString()}
                                </p>
                              </div>
                            </div>
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                job.status === "open" || job.status === "active"
                                  ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                                  : "bg-slate-700 text-gray-700 dark:text-slate-300"
                              }`}
                            >
                              {job.status || "Active"}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {isStudent && (
                <div className="rounded-2xl border border-gray-200 dark:border-white/10 bg-gray-100 dark:bg-slate-900/50 overflow-hidden backdrop-blur-md">
                  <div className="border-b border-white/5 bg-white/5 px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Activity className="text-emerald-400" size={20} />
                      <h2 className="text-lg font-bold">
                        Latest Analysis Summary
                      </h2>
                    </div>
                    {latestAnalysis && (
                      <span className="text-xs font-medium text-slate-400 flex items-center gap-1">
                        <Clock size={14} />
                        {new Date(
                          latestAnalysis.createdAt,
                        ).toLocaleDateString()}
                      </span>
                    )}
                  </div>

                  <div className="p-6">
                    {!latestAnalysis ? (
                      <div className="py-12 flex flex-col items-center justify-center text-center">
                        <div className="h-16 w-16 bg-slate-800 rounded-full flex items-center justify-center mb-4 text-gray-500 dark:text-slate-500">
                          <FileText size={32} />
                        </div>
                        <h3 className="text-xl font-semibold mb-2">
                          No analysis data yet
                        </h3>
                        <p className="text-slate-400 max-w-sm mb-6">
                          Upload your resume to see your profile strength,
                          skills analysis, and strategic recommendations.
                        </p>
                        <Link
                          to="/resume-analyzer"
                          className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-3 font-bold text-white transition hover:bg-blue-500 hover:shadow-[0_0_20px_rgba(37,99,235,0.4)]"
                        >
                          <Sparkles size={18} />
                          Start Analyzing Now
                        </Link>
                      </div>
                    ) : (
                      <div className="space-y-8">
                        {/* Score and Level */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                          <div className="flex items-center gap-4 p-4 rounded-xl bg-slate-800/50 border border-white/5">
                            <div className="relative h-20 w-20 flex items-center justify-center">
                              <svg
                                className="h-full w-full"
                                viewBox="0 0 36 36"
                              >
                                <path
                                  className="stroke-slate-700"
                                  strokeWidth="3"
                                  fill="none"
                                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                />
                                <path
                                  className={`${latestAnalysis.score >= 70 ? "stroke-emerald-500" : latestAnalysis.score >= 40 ? "stroke-yellow-500" : "stroke-red-500"}`}
                                  strokeWidth="3"
                                  strokeDasharray={`${latestAnalysis.score}, 100`}
                                  strokeLinecap="round"
                                  fill="none"
                                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                />
                              </svg>
                              <span className="absolute text-xl font-black">
                                {latestAnalysis.score}%
                              </span>
                            </div>
                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                <p className="text-xs font-bold text-gray-500 dark:text-slate-500 uppercase tracking-wider">
                                  Overall Score
                                </p>
                                {latestAnalysis.mode === "benchmark" && (
                                  <span className="px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 text-[8px] font-black uppercase tracking-tighter border border-blue-500/20">
                                    Benchmark
                                  </span>
                                )}
                              </div>
                              <p className="text-2xl font-black text-white">
                                {latestAnalysis.classification}
                              </p>
                            </div>
                          </div>

                          <div className="flex flex-col justify-center p-4 rounded-xl bg-slate-800/50 border border-white/5">
                            <p className="text-xs font-bold text-gray-500 dark:text-slate-500 uppercase tracking-wider mb-2">
                              Target Skills Match
                            </p>
                            <div className="flex flex-wrap gap-2">
                              {latestAnalysis.skills
                                .slice(0, 5)
                                .map((skill, idx) => (
                                  <span
                                    key={idx}
                                    className="px-2 py-1 rounded-md bg-blue-500/10 text-blue-400 text-[10px] font-bold border border-blue-500/20 uppercase tracking-tight"
                                  >
                                    {skill}
                                  </span>
                                ))}
                              {latestAnalysis.skills.length > 5 && (
                                <span className="text-[10px] text-gray-500 dark:text-slate-500 self-center font-bold">
                                  +{latestAnalysis.skills.length - 5} MORE
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Missing Skills */}
                        <div className="space-y-4">
                          <div className="flex items-center gap-2 text-red-400">
                            <AlertCircle size={18} />
                            <h3 className="font-bold text-sm uppercase tracking-widest">
                              Priority Gaps
                            </h3>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {latestAnalysis.missingSkills.length > 0 ? (
                              latestAnalysis.missingSkills.map((skill, idx) => (
                                <span
                                  key={idx}
                                  className="px-3 py-1.5 rounded-lg bg-red-500/5 text-red-400 text-xs font-bold border border-red-500/20 uppercase tracking-wide"
                                >
                                  {skill}
                                </span>
                              ))
                            ) : (
                              <span className="text-sm text-slate-400 italic">
                                No missing skills identified
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

            {/* History Table - Student Only */}
            {isStudent && (
              <div className="rounded-2xl border border-gray-200 dark:border-white/10 bg-gray-100 dark:bg-slate-900/50 overflow-hidden backdrop-blur-md">
                <div className="border-b border-white/5 bg-white/5 px-6 py-4 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Clock className="text-violet-400" size={20} />
                    <h2 className="text-lg font-bold">Analysis History</h2>
                  </div>
                  <span className="text-xs font-medium text-gray-500 dark:text-slate-500">{history.length} records found</span>
                </div>
                
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-800/30 text-[10px] uppercase tracking-widest text-gray-500 dark:text-slate-500">
                        <th className="px-6 py-4 font-bold w-10">Select</th>
                        <th className="px-6 py-4 font-bold">Date</th>
                        <th className="px-6 py-4 font-bold">Score</th>
                        <th className="px-6 py-4 font-bold">Level</th>
                        <th className="px-6 py-4 font-bold">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {history.length > 0 ? (
                        history.map((item, idx) => (
                          <tr 
                            key={idx} 
                            className={`hover:bg-white/5 transition-colors group cursor-pointer ${selectedVersions.includes(item._id) ? 'bg-blue-500/10 border-l-2 border-blue-500' : ''}`}
                            onClick={() => toggleVersionSelection(item._id)}
                          >
                            <td className="px-6 py-4 text-center">
                              <input 
                                type="checkbox" 
                                checked={selectedVersions.includes(item._id)}
                                onChange={() => {}} // Handled by tr onClick
                                className="rounded border-gray-600 bg-transparent text-blue-600 focus:ring-blue-500"
                              />
                            </td>
                            <td className="px-6 py-4 text-sm whitespace-nowrap text-gray-700 dark:text-slate-300">
                              {new Date(item.createdAt).toLocaleDateString()}
                            </td>
                            <td className="px-6 py-4 text-sm font-bold whitespace-nowrap">
                              <span className={`${item.score >= 70 ? "text-emerald-400" : item.score >= 40 ? "text-yellow-400" : "text-red-400"}`}>
                                {item.score}%
                                {item.mode === "benchmark" && (
                                  <span className="ml-2 text-[8px] opacity-60 text-blue-400 font-black uppercase">BM</span>
                                )}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-sm whitespace-nowrap">
                              <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase ${
                                item.classification?.includes("Strong") || item.classification === "Advanced"
                                  ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                                  : item.classification === "Intermediate"
                                  ? "bg-yellow-500/10 text-yellow-400 border border-yellow-500/20"
                                  : "bg-red-500/10 text-red-400 border border-red-500/20"
                              }`}>
                                {item.classification}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-sm whitespace-nowrap">
                               <div className="flex items-center gap-1.5 text-emerald-500">
                                 <CheckCircle size={14} />
                                 <span className="text-[10px] font-bold uppercase tracking-wide">Processed</span>
                               </div>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan="4" className="px-6 py-12 text-center text-gray-500 dark:text-slate-500 text-sm">
                            No history found
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

            <div className="space-y-6">
              {/* Smart Suggestions Card - Student Only */}
              {isStudent && (
                <div className="rounded-2xl border border-gray-200 dark:border-white/10 bg-gray-100 dark:bg-slate-900/50 overflow-hidden backdrop-blur-md">
                  <div className="border-b border-white/5 bg-white/5 px-6 py-4 flex items-center gap-2">
                    <Target className="text-emerald-400" size={20} />
                    <h2 className="text-lg font-bold">Smart Insights</h2>
                  </div>
                  <div className="p-4 space-y-4">
                    {latestAnalysis && latestAnalysis.suggestions.length > 0 ? (
                      latestAnalysis.suggestions.map((suggestion, idx) => (
                        <SuggestionItem key={idx} suggestion={suggestion} />
                      ))
                    ) : (
                      <div className="p-8 text-center text-gray-500 dark:text-slate-500">
                        <Zap size={24} className="mx-auto mb-2 opacity-20" />
                        <p className="text-xs uppercase tracking-widest">
                          No insights generated yet
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Quick Actions Card */}
              <div className="rounded-2xl border border-gray-200 dark:border-white/10 bg-gradient-to-br from-blue-600/20 to-blue-900/40 p-6 shadow-xl backdrop-blur-md relative overflow-hidden group">
                <div className="absolute top-0 right-0 -mt-4 -mr-4 h-24 w-24 bg-blue-500/20 rounded-full blur-3xl group-hover:bg-blue-500/40 transition-all"></div>
                <h3 className="text-xl font-bold mb-2 flex items-center gap-2">
                  <TrendingUp size={20} className="text-blue-400" />
                  {isStudent ? "Improve Profile" : isTutor ? "Tutor Hub" : "Recruitment Hub"}
                </h3>
                <p className="text-sm text-gray-700 dark:text-blue-100/70 mb-6">
                  {isStudent
                    ? "Take the next step in your career journey with our AI-driven tools."
                    : isTutor
                    ? "Monitor class performance and identify critical skill gaps."
                    : "Manage your hiring pipeline and find the perfect candidates."}
                </p>

                <div className="space-y-3">
                  {isStudent ? (
                    <>
                      <Link
                        to="/resume-analyzer"
                        className="flex items-center justify-between group/link w-full p-4 rounded-xl bg-white/10 border border-gray-200 dark:border-white/10 hover:bg-white/20 transition-all"
                      >
                        <div className="flex items-center gap-3">
                          <FileText size={18} className="text-blue-300" />
                          <span className="font-semibold text-sm">
                            Update Resume
                          </span>
                        </div>
                        <ArrowRight
                          size={16}
                          className="text-blue-300 group-hover/link:translate-x-1 transition-transform"
                        />
                      </Link>

                      <Link
                        to="/job-matcher"
                        className="flex items-center justify-between group/link w-full p-4 rounded-xl bg-white/10 border border-gray-200 dark:border-white/10 hover:bg-white/20 transition-all"
                      >
                        <div className="flex items-center gap-3">
                          <Target size={18} className="text-emerald-300" />
                          <span className="font-semibold text-sm">
                            Find Matches
                          </span>
                        </div>
                        <ArrowRight
                          size={16}
                          className="text-emerald-300 group-hover/link:translate-x-1 transition-transform"
                        />
                      </Link>

                      <Link
                        to="/my-applications"
                        className="flex items-center justify-between group/link w-full p-4 rounded-xl bg-white/10 border border-gray-200 dark:border-white/10 hover:bg-white/20 transition-all"
                      >
                        <div className="flex items-center gap-3">
                          <Briefcase size={18} className="text-violet-300" />
                          <span className="font-semibold text-sm">
                            Applied Jobs
                          </span>
                        </div>
                        <ArrowRight
                          size={16}
                          className="text-violet-300 group-hover/link:translate-x-1 transition-transform"
                        />
                      </Link>
                    </>
                  ) : isTutor ? (
                    <>
                      <Link
                        to="/tutor/analytics"
                        className="flex items-center justify-between group/link w-full p-4 rounded-xl bg-white/10 border border-gray-200 dark:border-white/10 hover:bg-white/20 transition-all"
                      >
                        <div className="flex items-center gap-3">
                          <BarChart3 size={18} className="text-emerald-300" />
                          <span className="font-semibold text-sm">
                            Skill Gap Analytics
                          </span>
                        </div>
                        <ArrowRight
                          size={16}
                          className="text-emerald-300 group-hover/link:translate-x-1 transition-transform"
                        />
                      </Link>

                      <Link
                        to="/tutor/roadmaps"
                        className="flex items-center justify-between group/link w-full p-4 rounded-xl bg-white/10 border border-gray-200 dark:border-white/10 hover:bg-white/20 transition-all"
                      >
                        <div className="flex items-center gap-3">
                          <Target size={18} className="text-indigo-300" />
                          <span className="font-semibold text-sm">
                            Student Learning Roadmaps
                          </span>
                        </div>
                        <ArrowRight
                          size={16}
                          className="text-indigo-300 group-hover/link:translate-x-1 transition-transform"
                        />
                      </Link>
                    </>
                  ) : (
                    <>
                      <Link
                        to="/recruiter/jobs/new"
                        className="flex items-center justify-between group/link w-full p-4 rounded-xl bg-white/10 border border-gray-200 dark:border-white/10 hover:bg-white/20 transition-all"
                      >
                        <div className="flex items-center gap-3">
                          <PlusCircle size={18} className="text-blue-300" />
                          <span className="font-semibold text-sm">
                            Post New Job
                          </span>
                        </div>
                        <ArrowRight
                          size={16}
                          className="text-blue-300 group-hover/link:translate-x-1 transition-transform"
                        />
                      </Link>

                      <Link
                        to="/recruiter/jobs"
                        className="flex items-center justify-between group/link w-full p-4 rounded-xl bg-white/10 border border-gray-200 dark:border-white/10 hover:bg-white/20 transition-all"
                      >
                        <div className="flex items-center gap-3">
                          <Briefcase size={18} className="text-emerald-300" />
                          <span className="font-semibold text-sm">
                            Manage Jobs
                          </span>
                        </div>
                        <ArrowRight
                          size={16}
                          className="text-emerald-300 group-hover/link:translate-x-1 transition-transform"
                        />
                      </Link>

                      <Link
                        to="/recruiter/analytics"
                        className="flex items-center justify-between group/link w-full p-4 rounded-xl bg-white/10 border border-gray-200 dark:border-white/10 hover:bg-white/20 transition-all"
                      >
                        <div className="flex items-center gap-3">
                          <BarChart3 size={18} className="text-violet-300" />
                          <span className="font-semibold text-sm">
                            View Analytics
                          </span>
                        </div>
                        <ArrowRight
                          size={16}
                          className="text-violet-300 group-hover/link:translate-x-1 transition-transform"
                        />
                      </Link>
                    </>
                  )}
                </div>
              </div>

              {/* Account Status */}
              <div className="rounded-2xl border border-gray-200 dark:border-white/10 bg-gray-100 dark:bg-slate-900/50 p-6 backdrop-blur-md">
                <h3 className="text-[10px] font-bold text-gray-500 dark:text-slate-500 uppercase tracking-widest mb-4">
                  Account Status
                </h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400">
                        <BadgeCheck size={16} />
                      </div>
                      <span className="text-sm font-medium">
                        Verified Account
                      </span>
                    </div>
                    <div className="h-1.5 w-1.5 rounded-full bg-emerald-500"></div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400">
                        <Sparkles size={16} />
                      </div>
                      <span className="text-sm font-medium">Pro Features</span>
                    </div>
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-500 text-white">
                      ACTIVE
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>
      )}

      {/* Comparison Modal */}
      <VersionComparisonModal 
        isOpen={showComparison}
        onClose={() => setShowComparison(false)}
        versions={compareData}
      />

      {/* Floating Selection Bar */}
      {selectedVersions.length > 0 && !showComparison && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 bg-slate-900 border border-blue-500/30 p-4 rounded-2xl shadow-2xl flex items-center gap-6 animate-slide-up">
          <div className="flex items-center gap-3">
            <div className="flex -space-x-2">
              {selectedVersions.map((_, i) => (
                <div key={i} className="h-8 w-8 rounded-full bg-blue-600 border-2 border-slate-900 flex items-center justify-center text-[10px] font-black">
                  V{i + 1}
                </div>
              ))}
            </div>
            <p className="text-xs font-bold text-white whitespace-nowrap">
              {selectedVersions.length} {selectedVersions.length === 1 ? 'version' : 'versions'} selected
            </p>
          </div>
          <div className="h-8 w-px bg-white/10"></div>
          <div className="flex gap-3">
            <button 
              onClick={() => setSelectedVersions([])}
              className="px-4 py-2 text-xs font-bold uppercase text-slate-400 hover:text-white transition-colors"
            >
              Clear
            </button>
            {selectedVersions.length === 2 && (
              <button
                onClick={() => setShowComparison(true)}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-black uppercase rounded-xl transition-all shadow-lg"
              >
                Compare Now
              </button>
            )}
          </div>
        </div>
      )}
    </main>
  );
};

export default DashboardPage;
