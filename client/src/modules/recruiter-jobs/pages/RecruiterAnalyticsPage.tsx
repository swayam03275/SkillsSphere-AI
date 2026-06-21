
import React, { useState, useEffect, useMemo } from "react";
import { useSelector } from "react-redux";
import { Link } from "react-router-dom";
import {
  Briefcase,
  CheckCircle,
  Clock,
  FileEdit,
  TrendingUp,
  ArrowLeft,
  BarChart3,
  Zap,
  Target,
  MapPin,
  Calendar,
  Users,
  UserCheck,
  UserX,
  Eye,
  Sparkles,
  Award,
  BookOpen,
  Code,
  ShieldAlert,
  Download,
  ChevronDown,
  FileText
} from "lucide-react";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar
} from "recharts";
import Navbar from "../../../shared/components/Navbar";
import Footer from "../../../shared/components/Footer";

import LoadingState from "../../../shared/components/LoadingState";
import ErrorState from "../../../shared/components/ErrorState";
import { getRecruiterAnalytics } from "../services/jobPostingService";
import { exportToCSV, exportToPDF } from "../../../utils/exportUtils";
import { useDocumentTitle } from "../../../hooks/useDocumentTitle";


// Month label helper
const MONTH_NAMES = [
  "", "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

const formatMonthLabel = (monthStr) => {
  if (!monthStr) return "";
  const [year, month] = monthStr.split("-");
  return `${MONTH_NAMES[parseInt(month, 10)]} ${year.slice(-2)}`;
};

// Status config mapping
const STATUS_CONFIG = {
  open: {
    label: "Active",
    color: "#10b981",
    bg: "bg-emerald-500/10",
    text: "text-emerald-400",
    border: "border-emerald-500/20",
  },
  draft: {
    label: "Draft",
    color: "#f59e0b",
    bg: "bg-amber-500/10",
    text: "text-amber-400",
    border: "border-amber-500/20",
  },
  closed: {
    label: "Closed",
    color: "#64748b",
    bg: "bg-slate-500/10",
    text: "text-slate-600 dark:text-slate-400",
    border: "border-slate-500/20",
  },
};

const PIE_COLORS = ["#10b981", "#f59e0b", "#64748b"];
const MATCH_COLORS = ["#10b981", "#3b82f6", "#f59e0b", "#ef4444"];

// Tooltips for recharts
const CustomBarTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-slate-950 border border-slate-200 dark:border-white/10 p-3 rounded-xl shadow-2xl backdrop-blur-md">
        <p className="text-xs text-slate-600 dark:text-slate-400 mb-1">{label}</p>
        <p className="text-sm font-bold text-blue-400">
          {payload[0].value} {payload[0].value === 1 ? "job" : "jobs"}
        </p>
      </div>
    );
  }
  return null;
};

const CustomPieTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-slate-950 border border-slate-200 dark:border-white/10 p-3 rounded-xl shadow-2xl backdrop-blur-md">
        <p className="text-xs text-slate-600 dark:text-slate-400 mb-1">{payload[0].name}</p>
        <p className="text-sm font-bold" style={{ color: payload[0].payload.fill }}>
          {payload[0].value} {payload[0].value === 1 ? "candidate" : "candidates"}
        </p>
      </div>
    );
  }
  return null;
};

// Circular gauge component
const CircularProgressRing = ({ value, color, label, icon: Icon }) => {
  const radius = 40;
  const stroke = 8;
  const normalizedRadius = radius - stroke * 2;
  const circumference = normalizedRadius * 2 * Math.PI;
  const strokeDashoffset = circumference - (Math.min(value, 100) / 100) * circumference;

  return (
    <div className="flex flex-col items-center p-6 bg-gray-50 dark:bg-slate-900/30 border border-gray-200 dark:border-white/5 rounded-2xl">
      <div className="relative flex items-center justify-center">
        <svg height={radius * 2} width={radius * 2} className="transform -rotate-90">
          <circle
            stroke="rgba(255,255,255,0.03)"
            fill="transparent"
            strokeWidth={stroke}
            r={normalizedRadius}
            cx={radius}
            cy={radius}
          />
          <circle
            stroke={color}
            fill="transparent"
            strokeWidth={stroke}
            strokeDasharray={circumference + " " + circumference}
            style={{ strokeDashoffset }}
            r={normalizedRadius}
            cx={radius}
            cy={radius}
            className="transition-all duration-1000 ease-out"
          />
        </svg>
        <div className="absolute flex flex-col items-center justify-center text-center">
          {Icon && <Icon size={14} className="text-slate-600 dark:text-slate-400 mb-0.5" />}
          <span className="text-lg font-black text-slate-900 dark:text-white">{value}%</span>
        </div>
      </div>
      <span className="mt-3 text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-widest text-center">
        {label}
      </span>
    </div>
  );
};

// Summary Metric Cards
const SummaryMetricCard = ({ icon: Icon, color, bg, hoverBorder, label, value, subtext }) => (
  <div className={`group relative rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-slate-900/40 p-5 shadow-2xl backdrop-blur-md transition-all hover:${hoverBorder} duration-300`}>
    <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-white/[0.01] to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
    <div className="relative">
      <div className="mb-2 flex items-center justify-between">
        <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${bg} ${color} group-hover:scale-110 transition-transform duration-300`}>
          <Icon size={18} />
        </div>
        <span className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">{value}</span>
      </div>
      <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">{label}</p>
      {subtext && <p className="text-[10px] text-slate-600 dark:text-slate-400 mt-1 font-medium">{subtext}</p>}
    </div>
  </div>
);

const RecruiterAnalyticsPage = () => {
  useDocumentTitle("Recruiter Analytics");
  const { token } = useSelector((state: any) => state.auth);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState("overview");
  const [isExportDropdownOpen, setIsExportDropdownOpen] = useState(false);

  const handleExportCSV = () => {
    setIsExportDropdownOpen(false);
    if (!analytics) return;
    
    // Create a comprehensive summary row for the CSV
    const data = [{
      "Report Date": new Date().toLocaleDateString(),
      "Total Jobs": analytics.totalJobs || 0,
      "Total Applicants": analytics.totalApplicants || 0,
      "Avg AI Match Score": `${analytics.averageAiMatchScore || 0}%`,
      "Top Match Candidates": analytics.topCandidatesCount || 0,
      "Avg ATS Score": `${analytics.averageAtsScore || 0}%`,
      "ATS Ready Percentage": `${analytics.atsReadyPercentage || 0}%`,
      "OSS Contributors": analytics.ossContributorCount || 0,
    }];
    
    exportToCSV("Recruiter_Intelligence_Summary.csv", data);
  };

  const handleExportPDF = () => {
    setIsExportDropdownOpen(false);
    exportToPDF("analytics-dashboard", "Recruiter_Analytics_Snapshot.pdf");
  };

  const fetchAnalytics = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await getRecruiterAnalytics(token);
      setAnalytics(response.analytics);
    } catch (err: any) {
      setError(err.message || "Failed to load analytics");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, [token]);

  // Extract aggregated analytics metrics
  const {
    totalJobs = 0,
    statusBreakdown = {},
    topSkills = [],
    recentJobs = [],
    totalApplicants = 0,
    applicantsByStatus = {},
    applicantsPerJob = [],
    averageAiMatchScore = 0,
    topCandidatesCount = 0,
    matchCategoryDistribution = {},
    averageAtsScore = 0,
    atsReadyPercentage = 0,
    lowAtsCount = 0,
    ossContributorCount = 0,
    ossContributorPercentage = 0,
    activeRoadmapCount = 0,
    specializationCounts = {}
  } = analytics || {};

  // Status pie chart data
  const statusPieData = useMemo(() => {
    return [
      { name: "Active", value: statusBreakdown.open || 0, fill: PIE_COLORS[0] },
      { name: "Draft", value: statusBreakdown.draft || 0, fill: PIE_COLORS[1] },
      { name: "Closed", value: statusBreakdown.closed || 0, fill: PIE_COLORS[2] },
    ].filter((d) => d.value > 0);
  }, [statusBreakdown]);

  // Timeline bar data
  const timelineBarData = useMemo(() => {
    if (!analytics?.jobsByMonth) return [];
    return analytics.jobsByMonth.map((item) => ({
      month: formatMonthLabel(item.month),
      count: item.count,
    }));
  }, [analytics]);

  // Match category distribution pie data
  const matchCategoryPieData = useMemo(() => {
    return [
      { name: "Excellent Match", value: matchCategoryDistribution["Excellent Match"] || 0, fill: MATCH_COLORS[0] },
      { name: "Moderate Match", value: matchCategoryDistribution["Moderate Match"] || 0, fill: MATCH_COLORS[1] },
      { name: "Growth Potential", value: matchCategoryDistribution["Growth Potential"] || 0, fill: MATCH_COLORS[2] },
      { name: "Weak Alignment", value: matchCategoryDistribution["Weak Alignment"] || 0, fill: MATCH_COLORS[3] },
    ].filter((d) => d.value > 0);
  }, [matchCategoryDistribution]);

  // Specialization chart data
  const specializationData = useMemo(() => {
    return [
      { name: "Frontend", count: specializationCounts.frontend || 0 },
      { name: "Backend", count: specializationCounts.backend || 0 },
      { name: "Full Stack", count: specializationCounts.fullstack || 0 },
      { name: "DevOps", count: specializationCounts.devops || 0 },
      { name: "AI / ML", count: specializationCounts.aiml || 0 },
      { name: "Database", count: specializationCounts.database || 0 },
    ];
  }, [specializationCounts]);

  const strongestSpecialization = useMemo(() => {
    if (!specializationCounts) return "N/A";
    let max = -1;
    let strongest = "None";
    Object.entries(specializationCounts).forEach(([name, count]) => {
      // @ts-expect-error TODO: Fix pervasive types
      if (count > max) {
        // @ts-expect-error TODO: Fix pervasive types
        max = count;
        strongest = name;
      }
    });
    const labelMap = {
      frontend: "Frontend Engineering",
      backend: "Backend Engineering",
      fullstack: "Full Stack Engineering",
      devops: "DevOps Expert",
      aiml: "AI / ML Engineering",
      database: "Database Administration",
      None: "N/A"
    };
    return labelMap[strongest] || strongest;
  }, [specializationCounts]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50/50 dark:bg-[#09090b] text-gray-900 dark:text-text-main font-sans pt-20 flex flex-col">
        <Navbar />
        <main className="flex-grow flex flex-col items-center justify-start px-4 sm:px-6 lg:px-8 pb-12 animate-fade-in relative overflow-hidden w-full">
          <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
            <div className="absolute -top-[10%] -left-[5%] w-[40%] h-[40%] rounded-full bg-blue-100/40 dark:bg-blue-900/10 blur-[120px]" />
            <div className="absolute top-[20%] -right-[5%] w-[35%] h-[35%] rounded-full bg-purple-100/40 dark:bg-purple-900/10 blur-[100px]" />
            <div className="absolute top-[5%] right-[20%] w-[35%] h-[35%] rounded-full bg-teal-50/40 dark:bg-teal-900/10 blur-[100px]" />
          </div>
          <div className="w-full max-w-[1200px] relative z-10 flex flex-col gap-6 pt-12">
            {/* @ts-expect-error TODO: Fix pervasive types */}
            <LoadingState message="Aggregating hiring intelligence analytics..." />
          </div>
        </main>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50/50 dark:bg-[#09090b] text-gray-900 dark:text-text-main font-sans pt-20 flex flex-col">
        <Navbar />
        <main className="flex-grow flex flex-col items-center justify-start px-4 sm:px-6 lg:px-8 pb-12 animate-fade-in relative overflow-hidden w-full">
          <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
            <div className="absolute -top-[10%] -left-[5%] w-[40%] h-[40%] rounded-full bg-blue-100/40 dark:bg-blue-900/10 blur-[120px]" />
            <div className="absolute top-[20%] -right-[5%] w-[35%] h-[35%] rounded-full bg-purple-100/40 dark:bg-purple-900/10 blur-[100px]" />
            <div className="absolute top-[5%] right-[20%] w-[35%] h-[35%] rounded-full bg-teal-50/40 dark:bg-teal-900/10 blur-[100px]" />
          </div>
          <div className="w-full max-w-[1200px] relative z-10 flex flex-col gap-6 pt-12">
            <ErrorState description={error} onRetry={fetchAnalytics} />
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50/50 dark:bg-[#09090b] text-gray-900 dark:text-text-main font-sans pt-20 flex flex-col">
      <Navbar />

      <main className="flex-grow flex flex-col items-center justify-start px-4 sm:px-6 lg:px-8 pb-12 animate-fade-in relative overflow-hidden w-full">
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
          <div className="absolute -top-[10%] -left-[5%] w-[40%] h-[40%] rounded-full bg-blue-100/40 dark:bg-blue-900/10 blur-[120px]" />
          <div className="absolute top-[20%] -right-[5%] w-[35%] h-[35%] rounded-full bg-purple-100/40 dark:bg-purple-900/10 blur-[100px]" />
          <div className="absolute top-[5%] right-[20%] w-[35%] h-[35%] rounded-full bg-teal-50/40 dark:bg-teal-900/10 blur-[100px]" />
        </div>

        <div id="analytics-dashboard" className="w-full max-w-[1200px] relative z-10 flex flex-col gap-8">
          
          <div className="py-6 flex justify-between items-center">
            <Link 
              to="/dashboard" 
              className="inline-flex items-center gap-2 text-sm font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors"
            >
              <ArrowLeft size={16} />
              Back to Dashboard
            </Link>
          </div>

          {/* Header Block */}
          <div className="text-center space-y-4 mb-6 relative">
            <div className="hidden md:flex absolute top-4 left-4 xl:left-8 w-14 h-14 bg-blue-50 dark:bg-blue-500/10 border border-blue-100 dark:border-blue-500/20 rounded-2xl items-center justify-center shadow-sm transform -rotate-3 hover:rotate-0 transition-transform">
               <BarChart3 className="w-6 h-6 text-blue-600" />
            </div>
            <div className="hidden md:flex absolute top-8 right-4 xl:right-8 w-14 h-14 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-100 dark:border-emerald-500/20 rounded-2xl items-center justify-center shadow-sm transform rotate-3 hover:rotate-0 transition-transform">
               <Sparkles className="w-6 h-6 text-emerald-600" />
            </div>

            <div className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-blue-50 dark:bg-blue-500/10 border border-blue-100 dark:border-blue-500/20 shadow-sm text-[11px] font-bold text-blue-600 dark:text-blue-400 mx-auto tracking-wide uppercase">
              <Sparkles size={12} className="text-blue-500" /> HIRING INTELLIGENCE
            </div>
            
            <h1 className="text-4xl md:text-5xl font-black text-gray-900 dark:text-white tracking-tight">
              <span className="bg-gradient-to-r from-blue-600 via-purple-500 to-teal-400 bg-clip-text text-transparent">Intelligence</span> Dashboard
            </h1>
            
            <p className="text-gray-500 dark:text-gray-400 text-[15px] max-w-2xl mx-auto font-medium">
              Aggregated analytics and insights across all your job postings and applicants.
            </p>

            <div className="pt-2 flex justify-center">
              <div className="relative">
                <button
                  onClick={() => setIsExportDropdownOpen(!isExportDropdownOpen)}
                  className="inline-flex items-center gap-2 rounded-xl border border-blue-500/30 bg-blue-600/10 px-6 py-2.5 text-sm font-semibold text-blue-500 dark:text-blue-400 hover:bg-blue-600/20 hover:text-blue-600 dark:hover:text-blue-300 backdrop-blur-sm transition-all duration-300 shadow-sm"
                >
                  <Download size={16} />
                  Export Report
                  <ChevronDown size={14} className={`transition-transform ${isExportDropdownOpen ? "rotate-180" : ""}`} />
                </button>
                
                {isExportDropdownOpen && (
                  <div className="absolute right-0 top-full mt-2 w-48 rounded-xl border border-gray-200 dark:border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900/95 p-2 shadow-2xl backdrop-blur-md z-50 animate-in fade-in slide-in-from-top-2 duration-200 text-left">
                    <button
                      onClick={handleExportPDF}
                      className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-white dark:bg-slate-800 hover:text-slate-900 dark:hover:text-white transition-colors"
                    >
                      <FileEdit size={14} />
                      Export as PDF Snapshot
                    </button>
                    <button
                      onClick={handleExportCSV}
                      className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-white dark:bg-slate-800 hover:text-slate-900 dark:hover:text-white transition-colors"
                    >
                      <BarChart3 size={14} />
                      Export Summary (CSV)
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

        {/* High-Level Overview Metrics */}
        <section className="grid gap-4 sm:gap-6 grid-cols-2 lg:grid-cols-5">
          <SummaryMetricCard
            icon={Briefcase}
            color="text-blue-400"
            bg="bg-blue-500/20"
            hoverBorder="border-blue-500/30"
            label="Total Jobs"
            value={totalJobs}
            subtext={`${statusBreakdown.open || 0} active postings`}
          />
          <SummaryMetricCard
            icon={Users}
            color="text-violet-400"
            bg="bg-violet-500/20"
            hoverBorder="border-violet-500/30"
            label="Total Applicants"
            value={totalApplicants}
            subtext={`${applicantsByStatus.pending || 0} pending review`}
          />
          <SummaryMetricCard
            icon={Sparkles}
            color="text-emerald-400"
            bg="bg-emerald-500/20"
            hoverBorder="border-emerald-500/30"
            label="Average Match"
            value={`${averageAiMatchScore}%`}
            subtext={`${topCandidatesCount} top matches`}
          />
          <SummaryMetricCard
            icon={Award}
            color="text-amber-400"
            bg="bg-amber-500/20"
            hoverBorder="border-amber-500/30"
            label="OSS Contributors"
            value={`${ossContributorPercentage}%`}
            subtext={`${ossContributorCount} candidates active`}
          />
          <SummaryMetricCard
            icon={Code}
            color="text-indigo-400"
            bg="bg-indigo-500/20"
            hoverBorder="border-indigo-500/30"
            label="Top Specialty"
            value={strongestSpecialization.split(" ")[0]}
            subtext={strongestSpecialization}
          />
        </section>

        {/* Segmented Tab Controller */}
        <div className="flex border-b border-gray-200 dark:border-white/5 p-1 bg-white dark:bg-slate-900/30 backdrop-blur-md rounded-2xl w-full sm:w-max">
          <button
            onClick={() => setActiveTab("overview")}
            className={`flex-1 sm:flex-initial px-6 py-2.5 text-xs font-extrabold tracking-wider uppercase rounded-xl transition-all duration-300 ${
              activeTab === "overview"
                ? "bg-blue-600 text-white shadow-[0_0_15px_rgba(37,99,235,0.4)]"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-800 dark:hover:text-slate-200"
            }`}
          >
            Hiring Overview
          </button>
          <button
            onClick={() => setActiveTab("ai_ats")}
            className={`flex-1 sm:flex-initial px-6 py-2.5 text-xs font-extrabold tracking-wider uppercase rounded-xl transition-all duration-300 ${
              activeTab === "ai_ats"
                ? "bg-blue-600 text-white shadow-[0_0_15px_rgba(37,99,235,0.4)]"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-800 dark:hover:text-slate-200"
            }`}
          >
            AI & ATS Intelligence
          </button>
          <button
            onClick={() => setActiveTab("specialty")}
            className={`flex-1 sm:flex-initial px-6 py-2.5 text-xs font-extrabold tracking-wider uppercase rounded-xl transition-all duration-300 ${
              activeTab === "specialty"
                ? "bg-blue-600 text-white shadow-[0_0_15px_rgba(37,99,235,0.4)]"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-800 dark:hover:text-slate-200"
            }`}
          >
            Technical & OSS Insights
          </button>
        </div>

        {/* Dynamic Tab Render Area */}
        <div className="space-y-8 animate-in fade-in duration-300">
          
          {/* TAB 1: OVERVIEW & POSTING TIMELINE */}
          {activeTab === "overview" && (
            <div className="space-y-8">
              {/* Applicant Workflow Timeline Summary */}
              {totalApplicants > 0 && (
                <div className="grid gap-4 sm:gap-6 grid-cols-2 lg:grid-cols-4">
                  <div className="group relative rounded-2xl border border-gray-100 dark:border-white/5 bg-white dark:bg-slate-900/30 p-5 shadow-inner transition-all hover:border-amber-500/20">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10 text-amber-400">
                        <Clock size={18} />
                      </div>
                      <div>
                        <p className="text-2xl font-black text-slate-900 dark:text-white">{applicantsByStatus.pending || 0}</p>
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Pending Review</p>
                      </div>
                    </div>
                  </div>
                  <div className="group relative rounded-2xl border border-gray-100 dark:border-white/5 bg-white dark:bg-slate-900/30 p-5 shadow-inner transition-all hover:border-blue-500/20">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10 text-blue-400">
                        <Eye size={18} />
                      </div>
                      <div>
                        <p className="text-2xl font-black text-slate-900 dark:text-white">{applicantsByStatus.reviewed || 0}</p>
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Reviewed</p>
                      </div>
                    </div>
                  </div>
                  <div className="group relative rounded-2xl border border-gray-100 dark:border-white/5 bg-white dark:bg-slate-900/30 p-5 shadow-inner transition-all hover:border-emerald-500/20">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400">
                        <UserCheck size={18} />
                      </div>
                      <div>
                        <p className="text-2xl font-black text-slate-900 dark:text-white">{applicantsByStatus.shortlisted || 0}</p>
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Shortlisted</p>
                      </div>
                    </div>
                  </div>
                  <div className="group relative rounded-2xl border border-gray-100 dark:border-white/5 bg-white dark:bg-slate-900/30 p-5 shadow-inner transition-all hover:border-red-500/20">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-500/10 text-red-400">
                        <UserX size={18} />
                      </div>
                      <div>
                        <p className="text-2xl font-black text-slate-900 dark:text-white">{applicantsByStatus.rejected || 0}</p>
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Rejected</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Status and Posting charts */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                
                {/* Status Distribution */}
                <div className="rounded-2xl border border-gray-200 dark:border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900/50 overflow-hidden backdrop-blur-md shadow-2xl">
                  <div className="border-b border-gray-100 dark:border-white/5 bg-gray-50 dark:bg-white/5 px-6 py-4 flex items-center gap-2">
                    <BarChart3 className="text-blue-400" size={18} />
                    <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-200">Postings Status</h2>
                  </div>
                  <div className="p-6 h-[280px] flex items-center justify-center">
                    {statusPieData.length > 0 ? (
                      <div className="flex flex-col sm:flex-row items-center gap-6 w-full">
                        <ResponsiveContainer width="100%" height={220}>
                          <PieChart>
                            <Pie
                              data={statusPieData}
                              cx="50%"
                              cy="50%"
                              innerRadius={55}
                              outerRadius={80}
                              paddingAngle={4}
                              dataKey="value"
                              animationDuration={1000}
                              stroke="none"
                            >
                              {statusPieData.map((entry, idx) => (
                                <Cell key={`cell-${idx}`} fill={entry.fill} />
                              ))}
                            </Pie>
                            {/* @ts-expect-error TODO: Fix pervasive types */}
                            <RechartsTooltip content={<CustomPieTooltip />} />
                          </PieChart>
                        </ResponsiveContainer>
                        <div className="flex sm:flex-col gap-4 sm:gap-3 shrink-0">
                          {statusPieData.map((item) => (
                            <div key={item.name} className="flex items-center gap-2">
                              <div className="h-3 w-3 rounded-full" style={{ backgroundColor: item.fill }} />
                              <span className="text-xs text-slate-600 dark:text-slate-400 font-bold">
                                {item.name}{" "}
                                <span className="text-slate-900 dark:text-white font-extrabold">({item.value})</span>
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center text-slate-500">
                        <Briefcase size={36} className="opacity-20 mb-3" />
                        <p className="text-xs uppercase tracking-wider">No Job Postings</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Posting Timeline */}
                <div className="rounded-2xl border border-gray-200 dark:border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900/50 overflow-hidden backdrop-blur-md shadow-2xl">
                  <div className="border-b border-gray-100 dark:border-white/5 bg-gray-50 dark:bg-white/5 px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="text-emerald-400" size={18} />
                      <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-200">Posting History</h2>
                    </div>
                    <div className="flex items-center gap-1 text-[10px] text-slate-600 dark:text-slate-400 bg-gray-50 dark:bg-white/5 px-2 py-0.5 rounded border border-gray-100 dark:border-white/5 font-semibold uppercase tracking-wider">
                      <Calendar size={10} /> 6 Months
                    </div>
                  </div>
                  <div className="p-6 h-[280px]">
                    {timelineBarData.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={timelineBarData}>
                          <defs>
                            <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.8} />
                              <stop offset="100%" stopColor="#3b82f6" stopOpacity={0.2} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
                          <XAxis dataKey="month" stroke="#475569" fontSize={10} tickLine={false} axisLine={false} dy={8} />
                          <YAxis stroke="#475569" fontSize={10} tickLine={false} axisLine={false} allowDecimals={false} />
                          {/* @ts-expect-error TODO: Fix pervasive types */}
                          <RechartsTooltip content={<CustomBarTooltip />} />
                          <Bar dataKey="count" fill="url(#barGradient)" radius={[6, 6, 0, 0]} animationDuration={1000} maxBarSize={40} />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-full flex flex-col items-center justify-center text-slate-500">
                        <TrendingUp size={36} className="opacity-20 mb-3" />
                        <p className="text-xs uppercase tracking-wider">No Posting Timeline Data</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Demand & Job listing detail rows */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Top demanded skills */}
                <div className="rounded-2xl border border-gray-200 dark:border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900/50 overflow-hidden backdrop-blur-md p-6 space-y-4">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-200 flex items-center gap-2 pb-3 border-b border-gray-100 dark:border-white/5">
                    <Zap size={16} className="text-amber-400" /> Dominated Demanded Skills
                  </h3>
                  {topSkills.length > 0 ? (
                    <div className="space-y-3.5 pt-1">
                      {topSkills.map((item, idx) => {
                        const maxCount = topSkills[0]?.count || 1;
                        const percentage = Math.round((item.count / maxCount) * 100);
                        return (
                          <div key={item.skill} className="group">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 capitalize">{item.skill}</span>
                              <span className="text-[10px] font-bold text-slate-500">{item.count} {item.count === 1 ? "job" : "jobs"}</span>
                            </div>
                            <div className="h-1.5 w-full rounded-full bg-slate-100 dark:bg-slate-800/80 overflow-hidden border border-white/[0.02]">
                              <div
                                className="h-full rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 transition-all duration-1000"
                                style={{ width: `${percentage}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="py-12 text-center text-slate-500">
                      <Target size={24} className="mx-auto mb-2 opacity-20" />
                      <p className="text-xs uppercase tracking-widest">No Skill Trends Available</p>
                    </div>
                  )}
                </div>

                {/* Applicants Per Job Bar */}
                <div className="rounded-2xl border border-gray-200 dark:border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900/50 overflow-hidden backdrop-blur-md p-6 space-y-4">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-200 flex items-center gap-2 pb-3 border-b border-gray-100 dark:border-white/5">
                    <Users size={16} className="text-violet-400" /> Applicants Per Job
                  </h3>
                  {applicantsPerJob.length > 0 ? (
                    <div className="space-y-3.5 pt-1">
                      {applicantsPerJob.map((item) => {
                        const maxCount = applicantsPerJob[0]?.count || 1;
                        const percentage = Math.round((item.count / maxCount) * 100);
                        return (
                          <div key={item._id} className="group">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 truncate max-w-[150px]">{item.title}</span>
                              <span className="text-[10px] font-bold text-slate-500">{item.count} app{item.count !== 1 ? "s" : ""}</span>
                            </div>
                            <div className="h-1.5 w-full rounded-full bg-slate-100 dark:bg-slate-800/80 overflow-hidden border border-white/[0.02]">
                              <div
                                className="h-full rounded-full bg-gradient-to-r from-violet-500 to-purple-500 transition-all duration-1000"
                                style={{ width: `${percentage}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="py-12 text-center text-slate-500">
                      <Users size={24} className="mx-auto mb-2 opacity-20 animate-pulse" />
                      <p className="text-xs uppercase tracking-widest">No Applicant Counts</p>
                    </div>
                  )}
                </div>

                {/* Recent Jobs list */}
                <div className="rounded-2xl border border-gray-200 dark:border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900/50 overflow-hidden backdrop-blur-md p-6 space-y-4">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-200 flex items-center gap-2 pb-3 border-b border-gray-100 dark:border-white/5">
                    <Clock size={16} className="text-indigo-400" /> Recent Posting Activities
                  </h3>
                  {recentJobs.length > 0 ? (
                    <div className="space-y-3 pt-1">
                      {recentJobs.map((job) => {
                        const config = STATUS_CONFIG[job.status] || STATUS_CONFIG.draft;
                        return (
                          <div key={job._id} className="flex items-center justify-between p-2.5 rounded-xl bg-gray-50 dark:bg-slate-900/30 border border-gray-200 dark:border-white/5">
                            <div className="min-w-0">
                              <h4 className="text-xs font-bold text-slate-900 dark:text-slate-200 truncate">{job.title}</h4>
                              <p className="text-[10px] text-slate-500 mt-0.5">{new Date(job.createdAt).toLocaleDateString()}</p>
                            </div>
                            <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider border ${config.bg} ${config.text} ${config.border}`}>
                              {config.label}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="py-12 text-center text-slate-500">
                      <Briefcase size={24} className="mx-auto mb-2 opacity-20" />
                      <p className="text-xs uppercase tracking-widest">No Postings Listed</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: AI & ATS CANDIDATE INTELLIGENCE */}
          {activeTab === "ai_ats" && (
            <div className="space-y-8">
              {/* Gauges indicators */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <CircularProgressRing
                  value={averageAiMatchScore}
                  color="#10b981"
                  label="Average AI Score"
                  icon={Sparkles}
                />
                <CircularProgressRing
                  value={averageAtsScore}
                  color="#6366f1"
                  label="Average ATS Score"
                  icon={FileText}
                />
                <CircularProgressRing
                  value={atsReadyPercentage}
                  color="#f59e0b"
                  label="ATS-Ready (80%+)"
                  icon={CheckCircle}
                />
                <div className="flex flex-col items-center justify-center p-6 bg-gray-50 dark:bg-slate-900/30 border border-gray-200 dark:border-white/5 rounded-2xl text-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-red-500/10 text-red-400 mb-3 animate-pulse">
                    <ShieldAlert size={24} />
                  </div>
                  <span className="text-2xl font-black text-slate-900 dark:text-white">{lowAtsCount}</span>
                  <span className="mt-2 text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-widest">
                    Low ATS Compatibility (&lt;50%)
                  </span>
                </div>
              </div>

              {/* Match Category Pie & Detailed statistics */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Match Category Pie Chart */}
                <div className="lg:col-span-2 rounded-2xl border border-gray-200 dark:border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900/50 overflow-hidden backdrop-blur-md shadow-2xl">
                  <div className="border-b border-gray-100 dark:border-white/5 bg-gray-50 dark:bg-white/5 px-6 py-4 flex items-center gap-2">
                    <Sparkles className="text-blue-400" size={18} />
                    <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-200">Match Category Distributions</h2>
                  </div>
                  <div className="p-6 h-[300px] flex items-center justify-center">
                    {matchCategoryPieData.length > 0 ? (
                      <div className="flex flex-col sm:flex-row items-center gap-6 w-full">
                        <ResponsiveContainer width="100%" height={240}>
                          <PieChart>
                            <Pie
                              data={matchCategoryPieData}
                              cx="50%"
                              cy="50%"
                              innerRadius={60}
                              outerRadius={90}
                              paddingAngle={4}
                              dataKey="value"
                              animationDuration={1000}
                              stroke="none"
                            >
                              {matchCategoryPieData.map((entry, idx) => (
                                <Cell key={`cell-${idx}`} fill={entry.fill} />
                              ))}
                            </Pie>
                            {/* @ts-expect-error TODO: Fix pervasive types */}
                            <RechartsTooltip content={<CustomPieTooltip />} />
                          </PieChart>
                        </ResponsiveContainer>
                        <div className="flex sm:flex-col gap-4 sm:gap-3 shrink-0">
                          {matchCategoryPieData.map((item) => (
                            <div key={item.name} className="flex items-center gap-2">
                              <div className="h-3 w-3 rounded-full" style={{ backgroundColor: item.fill }} />
                              <span className="text-xs text-slate-600 dark:text-slate-400 font-bold">
                                {item.name}{" "}
                                <span className="text-slate-900 dark:text-white font-extrabold">({item.value})</span>
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center text-slate-500">
                        <Sparkles size={36} className="opacity-20 mb-3" />
                        <p className="text-xs uppercase tracking-wider">No AI Scored Candidates</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Recruiter Insight Alerts */}
                <div className="rounded-2xl border border-gray-200 dark:border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900/50 overflow-hidden backdrop-blur-md p-6 space-y-6">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-200 flex items-center gap-2 pb-3 border-b border-gray-100 dark:border-white/5">
                    <Award size={16} className="text-emerald-400" /> Talent Quality Index
                  </h3>
                  <div className="space-y-4 pt-1">
                    <div className="p-4 rounded-xl bg-gray-50 dark:bg-slate-950/40 border border-gray-100 dark:border-white/5 space-y-1">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Top Talent Concentration</span>
                      <p className="text-lg font-black text-slate-900 dark:text-white">
                        {totalApplicants > 0 ? Math.round((topCandidatesCount / totalApplicants) * 100) : 0}%
                      </p>
                      <p className="text-[10px] text-slate-600 dark:text-slate-400 leading-normal">
                        Candidates scoring above 85% represent excellent job skill fit.
                      </p>
                    </div>

                    <div className="p-4 rounded-xl bg-gray-50 dark:bg-slate-950/40 border border-gray-100 dark:border-white/5 space-y-1">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">ATS Optimization Index</span>
                      <p className="text-lg font-black text-slate-900 dark:text-white">
                        {atsReadyPercentage}% Ready
                      </p>
                      <p className="text-[10px] text-slate-600 dark:text-slate-400 leading-normal">
                        Candidates possessing highly compatible resumes requiring minimal layout adjustments.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: TECHNICAL SPECIALIZATIONS & OSS INSIGHTS */}
          {activeTab === "specialty" && (
            <div className="space-y-8">
              {/* Specialized candidate count graph */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Specialization Bar Chart */}
                <div className="lg:col-span-2 rounded-2xl border border-gray-200 dark:border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900/50 overflow-hidden backdrop-blur-md p-6 shadow-2xl">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-200 flex items-center gap-2 pb-4 border-b border-gray-100 dark:border-white/5 mb-6">
                    <Code size={18} className="text-blue-400" /> Specialization Demographics
                  </h3>
                  <div className="h-[280px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={specializationData} layout="vertical">
                        <defs>
                          <linearGradient id="specGradient" x1="0" y1="0" x2="1" y2="0">
                            <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.8} />
                            <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0.8} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" horizontal={false} />
                        <XAxis type="number" stroke="#475569" fontSize={10} tickLine={false} axisLine={false} allowDecimals={false} />
                        <YAxis dataKey="name" type="category" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} width={80} />
                        <RechartsTooltip cursor={{ fill: 'rgba(255,255,255,0.02)' }} />
                        <Bar dataKey="count" fill="url(#specGradient)" radius={[0, 4, 4, 0]} maxBarSize={20} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Contribution details & stages */}
                <div className="rounded-2xl border border-gray-200 dark:border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900/50 overflow-hidden backdrop-blur-md p-6 space-y-6">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-200 flex items-center gap-2 pb-3 border-b border-gray-100 dark:border-white/5">
                    <BookOpen size={16} className="text-indigo-400" /> Career & Contributions
                  </h3>
                  <div className="grid grid-cols-1 gap-4 pt-1">
                    
                    {/* OSS Contributor rate */}
                    <div className="p-4 bg-gray-50 dark:bg-slate-950/40 border border-gray-100 dark:border-white/5 rounded-xl flex items-center justify-between">
                      <div className="space-y-0.5">
                        <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">OSS Activity Rate</span>
                        <span className="block text-lg font-black text-slate-900 dark:text-white">{ossContributorPercentage}%</span>
                        <span className="block text-[9px] text-slate-600 dark:text-slate-400">High or Medium Open Source milestones</span>
                      </div>
                      <div className="h-10 w-10 bg-blue-500/15 border border-blue-500/20 text-blue-400 rounded-lg flex items-center justify-center font-extrabold text-sm shadow">
                        {ossContributorCount}
                      </div>
                    </div>

                    {/* Career readiness stages */}
                    <div className="p-4 bg-gray-50 dark:bg-slate-950/40 border border-gray-100 dark:border-white/5 rounded-xl flex items-center justify-between">
                      <div className="space-y-0.5">
                        <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Roadmap Active Rate</span>
                        <span className="block text-lg font-black text-slate-900 dark:text-white">
                          {totalApplicants > 0 ? Math.round((activeRoadmapCount / totalApplicants) * 100) : 0}%
                        </span>
                        <span className="block text-[9px] text-slate-600 dark:text-slate-400">High or Medium roadmap completion</span>
                      </div>
                      <div className="h-10 w-10 bg-indigo-500/15 border border-indigo-500/20 text-indigo-400 rounded-lg flex items-center justify-center font-extrabold text-sm shadow">
                        {activeRoadmapCount}
                      </div>
                    </div>

                  </div>
                </div>

              </div>
            </div>
          )}

          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default RecruiterAnalyticsPage;
