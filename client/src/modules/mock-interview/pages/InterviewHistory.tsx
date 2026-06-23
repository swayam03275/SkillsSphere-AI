
import React, { useRef, useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { fetchInterviewHistory, clearInterviewsError } from "../../../features/interviews/interviewsSlice";
import { getHistory } from "../services/interviewService";
import Pagination from "../../../shared/components/Pagination";
import { ErrorState } from "../../../shared/components";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
} from "recharts";
import {
  Plus,
  Clock,
  BookOpen,
  Loader2,
  AlertCircle,
  Download,
  FileJson,
  ArrowLeft,
  History,
  Brain,
  Sparkles,
  Search,
  RotateCcw,
  Bookmark,
  TrendingUp,
  BarChart3,
  Target,
} from "lucide-react";
import Navbar from "../../../shared/components/Navbar";
import Footer from "../../../shared/components/Footer";

import { useDocumentTitle } from "../../../hooks/useDocumentTitle";
import logger from "../../../utils/logger";

const EXPORT_CSV_FILENAME = "interview-history.csv";
const EXPORT_JSON_FILENAME = "interview-history.json";

const DEFAULT_FILTERS = {
  search: "",
  difficulty: "",
  status: "",
  minScore: "",
  maxScore: "",
};

const toDisplayValue = (value) => {
  if (Array.isArray(value)) return value.filter(Boolean).join("; ");
  if (value && typeof value === "object") return JSON.stringify(value);
  return value ?? "";
};

const firstAvailable = (...values) => values.find((value) => value !== undefined && value !== null && value !== "");

const getNestedScore = (session, key) =>
  firstAvailable(
    session?.[`${key}Score`],
    session?.scores?.[key],
    session?.metrics?.[key],
    session?.performanceMetrics?.[key],
    session?.scoreBreakdown?.[key],
  );

const getSessionTitle = (session) =>
  firstAvailable(session?.title, session?.topic, session?.type, "Mock Interview");

const getSessionScore = (session) => {
  const score = Number(firstAvailable(session?.overallScore, session?.score, session?.scores?.overall, 0));
  return Number.isFinite(score) ? score : 0;
};

const getSessionStatus = (session) =>
  String(
    firstAvailable(
      session?.status,
      session?.interviewStatus,
      session?.state,
      session?.completedAt || session?.finishedAt ? "completed" : "unknown",
    ),
  )
    .toLowerCase()
    .replace(/[\s_]+/g, "-");

export const filterInterviewSessions = (interviews, filters = DEFAULT_FILTERS) => {
  const searchTerm = filters.search.trim().toLowerCase();
  const minScore = filters.minScore === "" ? null : Number(filters.minScore);
  const maxScore = filters.maxScore === "" ? null : Number(filters.maxScore);
  const difficulty = filters.difficulty.toLowerCase();
  const status = filters.status.toLowerCase();

  return interviews.filter((session) => {
    const title = String(getSessionTitle(session)).toLowerCase();
    const topic = String(session?.topic || "").toLowerCase();
    const sessionDifficulty = String(session?.difficulty || "").toLowerCase();
    const sessionStatus = getSessionStatus(session);
    const score = getSessionScore(session);

    const matchesSearch = !searchTerm || title.includes(searchTerm) || topic.includes(searchTerm);
    const matchesDifficulty = !difficulty || sessionDifficulty === difficulty;
    const matchesStatus = !status || sessionStatus === status;
    const matchesMinScore = minScore === null || score >= minScore;
    const matchesMaxScore = maxScore === null || score <= maxScore;

    return matchesSearch && matchesDifficulty && matchesStatus && matchesMinScore && matchesMaxScore;
  });
};

const normalizeCountItems = (items = [], labelKey) =>
  items
    .map((item) => {
      if (typeof item === "string") return { label: item, count: 1 };
      return {
        label: item?.[labelKey] || item?.label || item?.topic || item?.concept || "",
        count: Number(item?.count || 0),
      };
    })
    .filter((item) => item.label);

const countItems = (items) =>
  Object.entries(
    items.reduce((acc, item) => {
      if (!item) return acc;
      acc[item] = (acc[item] || 0) + 1;
      return acc;
    }, {}),
  )
    // @ts-expect-error TODO: Fix pervasive types
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([label, count]) => ({ label, count }));

export const calculateInterviewAnalytics = (interviews = [], serverAnalytics = null) => {
  const completedSessions = interviews.filter((session) => getSessionStatus(session) === "completed");
  const scoredSessions = completedSessions.filter((session) => Number.isFinite(getSessionScore(session)));
  const localTrend = scoredSessions
    .slice()
    .sort(
      (a, b) =>
        new Date(firstAvailable(a.completedAt, a.createdAt)).getTime() -
        new Date(firstAvailable(b.completedAt, b.createdAt)).getTime(),
    )
    .map((session, index) => ({
      label: `#${index + 1}`,
      topic: session.topic || getSessionTitle(session),
      score: getSessionScore(session),
      date: firstAvailable(session.completedAt, session.createdAt),
    }));

  const trend = serverAnalytics?.improvementTrend?.length
    ? serverAnalytics.improvementTrend.map((item, index) => ({
        label: `#${index + 1}`,
        topic: item.topic,
        score: Number(item.score || 0),
        date: item.date,
      }))
    : localTrend;

  const averageScore =
    serverAnalytics?.averageScore !== undefined
      ? Number(serverAnalytics.averageScore)
      : scoredSessions.length
        ? Math.round(scoredSessions.reduce((sum, session) => sum + getSessionScore(session), 0) / scoredSessions.length)
        : 0;

  const weakConcepts =
    serverAnalytics?.weakConcepts?.length
      ? normalizeCountItems(serverAnalytics.weakConcepts, "concept")
      : countItems(
          completedSessions.flatMap((session) => {
            if (Array.isArray(session.weakConcepts)) return session.weakConcepts;
            if (Array.isArray(session.improvementAreas)) return session.improvementAreas;
            return [];
          }),
        );

  const weakTopics =
    serverAnalytics?.weakTopics?.length
      ? normalizeCountItems(serverAnalytics.weakTopics, "topic")
      : countItems(
          scoredSessions
            .filter((session) => getSessionScore(session) < 70)
            .map((session) => session.topic || getSessionTitle(session)),
        );

  const firstScore = trend[0]?.score ?? 0;
  const lastScore = trend.at(-1)?.score ?? 0;
  const trendDelta = trend.length > 1 ? lastScore - firstScore : 0;

  const avgTechnical = scoredSessions.length
    ? Math.round(scoredSessions.reduce((sum, session) => sum + (Number(getNestedScore(session, "technical")) || 0), 0) / scoredSessions.length)
    : 0;
  const avgCommunication = scoredSessions.length
    ? Math.round(scoredSessions.reduce((sum, session) => sum + (Number(getNestedScore(session, "communication")) || 0), 0) / scoredSessions.length)
    : 0;
  const avgProblemSolving = scoredSessions.length
    ? Math.round(scoredSessions.reduce((sum, session) => {
        const ps = firstAvailable(
          session?.problemSolvingScore,
          session?.problem_solving_score,
          session?.scores?.problemSolving,
          session?.scores?.problem_solving,
          session?.scores?.relevance,
          session?.metrics?.problemSolving,
          session?.performanceMetrics?.problemSolving,
        );
        return sum + (Number(ps) || 0);
      }, 0) / scoredSessions.length)
    : 0;

  return {
    averageScore,
    completedCount: serverAnalytics?.completedCount ?? scoredSessions.length,
    trend,
    trendDelta,
    weakConcepts,
    weakTopics,
    avgTechnical,
    avgCommunication,
    avgProblemSolving,
  };
};

const normalizeInterviewForExport = (session) => {
  const technicalScore = getNestedScore(session, "technical");
  const communicationScore = getNestedScore(session, "communication");
  const problemSolvingScore = firstAvailable(
    session?.problemSolvingScore,
    session?.problem_solving_score,
    session?.scores?.problemSolving,
    session?.scores?.problem_solving,
    session?.scores?.relevance,
    session?.metrics?.problemSolving,
    session?.performanceMetrics?.problemSolving,
  );

  return {
    id: session?._id || session?.id || "",
    title: getSessionTitle(session),
    type: firstAvailable(session?.type, session?.interviewType, session?.category, session?.topic),
    dateCompleted: firstAvailable(session?.completedAt, session?.finishedAt, session?.updatedAt, session?.createdAt),
    overallScore: firstAvailable(session?.overallScore, session?.score, session?.scores?.overall),
    technicalScore,
    communicationScore,
    problemSolvingScore,
    feedbackSummary: firstAvailable(session?.feedbackSummary, session?.summary, session?.feedback?.summary, session?.feedback),
    strengths: firstAvailable(session?.strengths, session?.feedback?.strengths),
    improvementAreas: firstAvailable(
      session?.improvementAreas,
      session?.areasForImprovement,
      session?.weaknesses,
      session?.weakConcepts,
      session?.feedback?.improvementAreas,
    ),
    duration: session?.duration,
    difficulty: session?.difficulty,
    topic: session?.topic,
    category: session?.category,
    totalQuestions: session?.totalQuestions,
  };
};

export const convertToCSV = (interviews) => {
  const columns = [
    ["Interview Title", "title"],
    ["Interview Type", "type"],
    ["Date Completed", "dateCompleted"],
    ["Overall Score", "overallScore"],
    ["Technical Score", "technicalScore"],
    ["Communication Score", "communicationScore"],
    ["Problem-solving Score", "problemSolvingScore"],
    ["Feedback Summary", "feedbackSummary"],
    ["Strengths", "strengths"],
    ["Improvement Areas", "improvementAreas"],
    ["Duration", "duration"],
    ["Difficulty", "difficulty"],
    ["Topic", "topic"],
    ["Category", "category"],
    ["Total Questions", "totalQuestions"],
  ];

  const escapeCell = (value) => {
    const cell = String(toDisplayValue(value));
    const escaped = cell.replace(/"/g, '""');
    return /[",\n\r]/.test(escaped) ? `"${escaped}"` : escaped;
  };

  const rows = interviews.map((session) => {
    const normalized = normalizeInterviewForExport(session);
    return columns.map(([, key]) => escapeCell(normalized[key])).join(",");
  });

  return [columns.map(([label]) => escapeCell(label)).join(","), ...rows].join("\n");
};

export const downloadFile = (filename, content, type) => {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  let linkAppended = false;

  link.href = url;
  link.download = filename;
  link.style.display = "none";

  try {
    document.body.appendChild(link);
    linkAppended = true;
    link.click();
  } finally {
    if (linkAppended) {
      document.body.removeChild(link);
    }
    URL.revokeObjectURL(url);
  }
};

export const exportInterviewHistoryAsCSV = (interviews) => {
  downloadFile(EXPORT_CSV_FILENAME, convertToCSV(interviews), "text/csv;charset=utf-8;");
};

export const exportInterviewHistoryAsJSON = (interviews) => {
  const payload = {
    metadata: {
      exportDate: new Date().toISOString(),
      totalInterviews: interviews.length,
    },
    interviews: interviews.map(normalizeInterviewForExport),
  };

  downloadFile(
    EXPORT_JSON_FILENAME,
    JSON.stringify(payload, null, 2),
    "application/json;charset=utf-8;",
  );
};

const TrendLine = ({ points }) => {
  if (!points || !points.length) {
    return (
      <div className="flex h-64 items-center justify-center rounded-xl bg-gray-50 dark:bg-white/5 text-sm font-medium text-text-muted">
        No completed interviews yet
      </div>
    );
  }

  const chartData = points.map((p) => ({
    name: p.label,
    score: p.score,
    topic: p.topic,
  }));

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
          <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
          <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} domain={[0, 100]} />
          <RechartsTooltip
            content={({ active, payload }) => {
              if (active && payload && payload.length) {
                return (
                  <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-white/10 p-3 rounded-xl shadow-xl">
                    <p className="text-xs font-semibold text-indigo-500">{payload[0].payload.topic}</p>
                    <p className="text-sm font-bold text-slate-800 dark:text-white mt-1">Score: {payload[0].value}%</p>
                  </div>
                );
              }
              return null;
            }}
          />
          <Area type="monotone" dataKey="score" stroke="#6366f1" strokeWidth={3} fillOpacity={1} fill="url(#colorScore)" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};

const CompetencyRadar = ({ avgTechnical, avgCommunication, avgProblemSolving }) => {
  const radarData = [
    { subject: "Technical", value: avgTechnical, fullMark: 100 },
    { subject: "Communication", value: avgCommunication, fullMark: 100 },
    { subject: "Relevance", value: avgProblemSolving, fullMark: 100 },
  ];

  if (!avgTechnical && !avgCommunication && !avgProblemSolving) {
    return (
      <div className="flex h-64 items-center justify-center rounded-xl bg-gray-50 dark:bg-white/5 text-sm font-medium text-text-muted">
        No evaluation metrics available
      </div>
    );
  }

  return (
    <div className="h-64 w-full flex items-center justify-center">
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarData}>
          <PolarGrid stroke="#ffffff10" />
          <PolarAngleAxis dataKey="subject" stroke="#94a3b8" fontSize={11} />
          <PolarRadiusAxis angle={30} domain={[0, 100]} stroke="#94a3b8" fontSize={9} />
          <Radar name="Skills" dataKey="value" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.3} />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
};

const AnalyticsSummary = ({ analytics }) => {
  const trendLabel = analytics.trend.length > 1
    ? `${analytics.trendDelta >= 0 ? "+" : ""}${analytics.trendDelta} pts`
    : "Need 2+ interviews";
  const trendTone = analytics.trendDelta >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400";

  return (
    <section aria-label="Interview analytics" className="space-y-6">
      {/* Top Cards Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-2xl border border-border bg-white dark:bg-surface p-5 shadow-sm flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-text-muted">Average Score</p>
            <p className="mt-2 text-4xl font-black text-text-main">{analytics.averageScore}%</p>
            <p className="mt-2 text-xs text-text-muted">
              From {analytics.completedCount} finished {analytics.completedCount === 1 ? "interview" : "interviews"}.
            </p>
          </div>
          <div className="rounded-xl bg-indigo-50 dark:bg-indigo-500/10 p-3 text-indigo-600 dark:text-indigo-300">
            <BarChart3 size={24} />
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-white dark:bg-surface p-5 shadow-sm flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-text-muted">Improvement Delta</p>
            <p className={`mt-2 text-4xl font-black ${trendTone}`}>{trendLabel}</p>
            <p className="mt-2 text-xs text-text-muted">Overall progress variance.</p>
          </div>
          <div className="rounded-xl bg-emerald-50 dark:bg-emerald-500/10 p-3 text-emerald-600 dark:text-emerald-300">
            <TrendingUp size={24} />
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-white dark:bg-surface p-5 shadow-sm flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-text-muted">Gaps & Weaknesses</p>
            <p className="mt-2 text-4xl font-black text-amber-500">{(analytics.weakConcepts?.length || 0) + (analytics.weakTopics?.length || 0)}</p>
            <p className="mt-2 text-xs text-text-muted">Targeted concepts to review.</p>
          </div>
          <div className="rounded-xl bg-amber-50 dark:bg-amber-500/10 p-3 text-amber-600 dark:text-amber-300">
            <Target size={24} />
          </div>
        </div>
      </div>

      {/* Main Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Score Trend Chart */}
        <div className="lg:col-span-2 rounded-2xl border border-border bg-white dark:bg-surface p-5 shadow-sm flex flex-col justify-between">
          <div className="mb-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-text-main">Performance Over Time</h3>
            <p className="text-xs text-text-muted mt-1">Area chart showing interview score trend progression</p>
          </div>
          <TrendLine points={analytics.trend} />
        </div>

        {/* Competency Radar Chart */}
        <div className="rounded-2xl border border-border bg-white dark:bg-surface p-5 shadow-sm flex flex-col justify-between">
          <div className="mb-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-text-main">Competency Breakdown</h3>
            <p className="text-xs text-text-muted mt-1">Radar metrics mapping average technical, communication, and relevance scores</p>
          </div>
          <CompetencyRadar
            avgTechnical={analytics.avgTechnical}
            avgCommunication={analytics.avgCommunication}
            avgProblemSolving={analytics.avgProblemSolving}
          />
        </div>
      </div>

      {/* Weak Areas List */}
      {(analytics.weakConcepts.length > 0 || analytics.weakTopics.length > 0) && (
        <div className="rounded-2xl border border-border bg-white dark:bg-surface p-5 shadow-sm">
          <h3 className="text-sm font-bold uppercase tracking-wider text-text-main mb-4">Detailed Weak Concepts & Topics</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
            {[...analytics.weakConcepts, ...analytics.weakTopics.map((item) => ({ ...item, label: `Topic: ${item.label}` }))].slice(0, 12).map((item) => (
              <div key={item.label} className="flex flex-col justify-between gap-1 rounded-xl bg-gray-50 dark:bg-white/5 p-3 border border-border/40">
                <span className="text-xs font-bold text-text-main capitalize truncate" title={item.label}>{item.label}</span>
                <span className="text-[10px] font-black text-red-500 uppercase mt-1">{item.count} flagged</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
};

const InterviewHistory = () => {
  useDocumentTitle("Interview History");
  const navigate = useNavigate();
  const dispatch = useDispatch<any>();
  
  const { sessions, pagination, analytics: serverAnalytics, isLoading: loading, error } = useSelector((state: any) => state.interviews);
  
  const [exportingType, setExportingType] = useState(null);
  const [exportError, setExportError] = useState(null);
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const exportInProgressRef = useRef(false);

  const analytics = calculateInterviewAnalytics(sessions, serverAnalytics);

  const fetchHistory = (page = 1) => {
    // @ts-expect-error TODO: Fix pervasive types
    dispatch(fetchInterviewHistory({ page, limit: 10 }));
  };

  useEffect(() => {
    fetchHistory();
    return () => {
      dispatch(clearInterviewsError());
    };
  }, [dispatch]);

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getExportSessions = async () => {
    if (pagination.total > sessions.length) {
      const res = await getHistory(1, pagination.total);
      return res.data?.sessions || sessions;
    }

    return sessions;
  };

  const handleExport = async (type) => {
    if (exportInProgressRef.current) return;

    exportInProgressRef.current = true;
    setExportingType(type);
    setExportError(null);

    try {
      const exportSessions = await getExportSessions();

      if (type === "csv") {
        exportInterviewHistoryAsCSV(exportSessions);
      } else {
        exportInterviewHistoryAsJSON(exportSessions);
      }
    } catch (err: any) {
      setExportError("Export failed. Please try again.");
      logger.error("[InterviewHistory] Export error:", err);
    } finally {
      exportInProgressRef.current = false;
      setExportingType(null);
    }
  };

  const filteredSessions = filterInterviewSessions(sessions, filters);
  const filtersActive = Object.values(filters).some((value) => value !== "");

  const updateFilter = (key, value) => {
    setFilters((currentFilters) => ({ ...currentFilters, [key]: value }));
  };

  const resetFilters = () => {
    setFilters(DEFAULT_FILTERS);
  };

  if (loading) {
    return (
      <div className="max-w-[1200px] mx-auto px-8 pb-8 pt-24 flex flex-col gap-6 min-h-[calc(100vh-80px)] bg-bg-main">
        <Navbar />
        <div className="flex-1 flex flex-col items-center justify-center gap-4 text-text-muted min-h-[50vh]">
          <Loader2 className="animate-spin" size={48} />
          <p>Loading history...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50/50 dark:bg-[#09090b] text-gray-900 dark:text-text-main font-sans pt-20 flex flex-col overflow-hidden relative">
      <Navbar />

      <main className="flex-grow flex flex-col items-center justify-start px-4 sm:px-6 lg:px-8 pb-12 animate-fade-in relative overflow-hidden w-full">
        {/* Background glow effects */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
          <div className="absolute -top-[10%] -left-[5%] w-[40%] h-[40%] rounded-full bg-blue-100/40 dark:bg-blue-900/10 blur-[120px]" />
          <div className="absolute top-[20%] -right-[5%] w-[35%] h-[35%] rounded-full bg-purple-100/40 dark:bg-purple-900/10 blur-[100px]" />
          <div className="absolute top-[5%] right-[20%] w-[35%] h-[35%] rounded-full bg-teal-50/40 dark:bg-teal-900/10 blur-[100px]" />
        </div>

        <div className="w-full max-w-[1200px] relative z-10 flex flex-col gap-6">
          
          {/* Back to Dashboard Link */}
          <div className="py-6">
            <Link 
              to="/dashboard" 
              className="inline-flex items-center gap-2 text-sm font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors"
            >
              <ArrowLeft size={16} />
              Back to Dashboard
            </Link>
          </div>

          {/* Hero Section */}
          <div className="text-center space-y-4 mb-10 relative">
            <div className="hidden md:flex absolute top-4 left-4 xl:left-8 w-14 h-14 bg-purple-50 dark:bg-purple-500/10 border border-purple-100 dark:border-purple-500/20 rounded-2xl items-center justify-center shadow-sm transform -rotate-3 hover:rotate-0 transition-transform">
               <History className="w-6 h-6 text-purple-600" />
            </div>
            <div className="hidden md:flex absolute top-8 right-4 xl:right-8 w-14 h-14 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-100 dark:border-emerald-500/20 rounded-2xl items-center justify-center shadow-sm transform rotate-3 hover:rotate-0 transition-transform">
               <Brain className="w-6 h-6 text-emerald-600" />
            </div>

            <div className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-purple-50 dark:bg-purple-500/10 border border-purple-100 dark:border-purple-500/20 shadow-sm text-[11px] font-bold text-purple-600 dark:text-purple-400 mx-auto tracking-wide uppercase">
              <Sparkles size={12} className="text-purple-500" /> TRACK YOUR PROGRESS
            </div>
            
            <h1 className="text-4xl md:text-5xl font-black text-gray-900 dark:text-white tracking-tight">
              <span className="bg-gradient-to-r from-blue-600 via-purple-500 to-teal-400 bg-clip-text text-transparent">Interview</span> History
            </h1>
            
            <p className="text-gray-500 dark:text-gray-400 text-[15px] max-w-2xl mx-auto font-medium">
              Review your past mock interviews, export reports, and track your progression over time.
            </p>
          </div>

        <div className="flex justify-center items-center gap-4 flex-wrap mb-4">
          <div className="flex items-center gap-3 flex-wrap">
            {sessions.length > 0 && (
              <div className="flex items-center gap-2" aria-busy={Boolean(exportingType)}>
                <button
                  type="button"
                  className="bg-white dark:bg-surface text-indigo-600 dark:text-indigo-400 border border-border py-2 px-4 rounded-full font-semibold text-sm cursor-pointer flex items-center gap-2 hover:border-indigo-500/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                  onClick={() => handleExport("csv")}
                  disabled={Boolean(exportingType)}
                  aria-label="Export interview history as CSV"
                >
                  <Download size={16} />
                  {exportingType === "csv" ? "Exporting..." : "Export CSV"}
                </button>
                <button
                  type="button"
                  className="bg-white dark:bg-surface text-indigo-600 dark:text-indigo-400 border border-border py-2 px-4 rounded-full font-semibold text-sm cursor-pointer flex items-center gap-2 hover:border-indigo-500/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                  onClick={() => handleExport("json")}
                  disabled={Boolean(exportingType)}
                  aria-label="Export interview history as JSON"
                >
                  <FileJson size={16} />
                  {exportingType === "json" ? "Exporting..." : "Export JSON"}
                </button>
              </div>
            )}
            <button
              type="button"
              className="bg-white dark:bg-surface text-amber-700 dark:text-amber-300 border border-border py-2 px-5 rounded-full font-semibold text-sm cursor-pointer flex items-center gap-2 hover:border-amber-400/40 transition-colors shadow-sm"
              onClick={() => navigate("/mock-interview/bookmarks")}
            >
              <Bookmark size={16} /> Bookmarked Questions
            </button>
            <button
              className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white border-none py-2 px-5 rounded-full font-semibold text-sm cursor-pointer flex items-center gap-2 hover:shadow-[0_10px_20px_rgba(79,70,229,0.3)] hover:-translate-y-0.5 transition-all"
              onClick={() => navigate("/mock-interview")}
            >
              <Plus size={16} /> New Interview
            </button>
          </div>
        </div>

      {error && (
        <div className="w-full bg-white dark:bg-[#121214] rounded-3xl border border-red-200 dark:border-red-900/50 p-8 shadow-sm">
          <ErrorState
            title="Unable to load history"
            description={error}
            onRetry={() => {
              dispatch(clearInterviewsError());
              fetchHistory();
            }}
          />
        </div>
      )}
      {exportError && (
        <div role="alert" className="bg-red-500/10 border border-red-500/30 text-red-400 p-4 rounded-xl text-center">
          <AlertCircle size={16} className="inline-block mr-1.5" />
          {exportError}
        </div>
      )}

      {sessions.length === 0 && !error ? (
        <div className="text-center py-16 px-8 text-text-muted flex flex-col items-center bg-white dark:bg-surface border border-border rounded-3xl shadow-sm">
          <BookOpen size={48} className="mb-4 text-indigo-400" />
          <p className="mt-2 text-lg font-medium text-text-main">No interviews yet.</p>
          <p className="mb-6">Start your first mock interview to track your progress!</p>
          <button
            className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white border-none py-3 px-6 rounded-xl font-semibold cursor-pointer flex items-center gap-2 hover:shadow-[0_10px_20px_rgba(79,70,229,0.3)] hover:-translate-y-0.5 transition-all"
            onClick={() => navigate("/mock-interview")}
          >
            <Plus size={18} /> Start Interview
          </button>
        </div>
      ) : (
        <>
        <AnalyticsSummary analytics={analytics} />

        <section className="bg-white dark:bg-surface border border-border rounded-2xl p-4 sm:p-5 shadow-sm">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
            <label className="lg:col-span-2 flex flex-col gap-1.5 text-xs font-bold uppercase tracking-wide text-text-muted">
              Search
              <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                <input
                  type="search"
                  value={filters.search}
                  onChange={(event) => updateFilter("search", event.target.value)}
                  placeholder="Search topic or title"
                  className="w-full rounded-xl border border-border bg-gray-50 dark:bg-white/5 py-2.5 pl-9 pr-3 text-sm font-medium text-text-main outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/10"
                />
              </div>
            </label>

            <label className="flex flex-col gap-1.5 text-xs font-bold uppercase tracking-wide text-text-muted">
              Difficulty
              <select
                value={filters.difficulty}
                onChange={(event) => updateFilter("difficulty", event.target.value)}
                className="w-full rounded-xl border border-border bg-gray-50 dark:bg-white/5 py-2.5 px-3 text-sm font-medium text-text-main outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/10"
              >
                <option value="">All difficulties</option>
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>
            </label>

            <label className="flex flex-col gap-1.5 text-xs font-bold uppercase tracking-wide text-text-muted">
              Status
              <select
                value={filters.status}
                onChange={(event) => updateFilter("status", event.target.value)}
                className="w-full rounded-xl border border-border bg-gray-50 dark:bg-white/5 py-2.5 px-3 text-sm font-medium text-text-main outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/10"
              >
                <option value="">All statuses</option>
                <option value="completed">Completed</option>
                <option value="in-progress">In progress</option>
                <option value="failed">Failed</option>
              </select>
            </label>

            <div className="grid grid-cols-2 gap-2">
              <label className="flex flex-col gap-1.5 text-xs font-bold uppercase tracking-wide text-text-muted">
                Min Score
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={filters.minScore}
                  onChange={(event) => updateFilter("minScore", event.target.value)}
                  className="w-full rounded-xl border border-border bg-gray-50 dark:bg-white/5 py-2.5 px-3 text-sm font-medium text-text-main outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/10"
                />
              </label>
              <label className="flex flex-col gap-1.5 text-xs font-bold uppercase tracking-wide text-text-muted">
                Max Score
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={filters.maxScore}
                  onChange={(event) => updateFilter("maxScore", event.target.value)}
                  className="w-full rounded-xl border border-border bg-gray-50 dark:bg-white/5 py-2.5 px-3 text-sm font-medium text-text-main outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/10"
                />
              </label>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm font-medium text-text-muted">
              Showing {filteredSessions.length} of {sessions.length} interviews
            </p>
            <button
              type="button"
              onClick={resetFilters}
              disabled={!filtersActive}
              className="inline-flex items-center gap-2 rounded-full border border-border bg-gray-50 dark:bg-white/5 px-4 py-2 text-sm font-semibold text-indigo-600 dark:text-indigo-400 transition-colors hover:border-indigo-400 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <RotateCcw size={15} />
              Reset filters
            </button>
          </div>
        </section>

        {filteredSessions.length === 0 ? (
          <div className="text-center py-16 px-8 text-text-muted flex flex-col items-center bg-white dark:bg-surface border border-border rounded-2xl shadow-sm">
            <Search size={44} className="mb-4 text-indigo-400" />
            <p className="mt-2 text-lg font-medium text-text-main">No matching interviews found.</p>
            <p className="mb-6">Try adjusting your search or filters.</p>
            <button
              type="button"
              onClick={resetFilters}
              className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white border-none py-3 px-6 rounded-xl font-semibold cursor-pointer hover:shadow-[0_10px_20px_rgba(79,70,229,0.3)] hover:-translate-y-0.5 transition-all"
            >
              <RotateCcw size={18} /> Reset filters
            </button>
          </div>
        ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredSessions.map((session) => (
            <div
              key={session._id}
              className="bg-white dark:bg-surface border border-border shadow-[0_10px_20px_rgba(0,0,0,0.02)] dark:shadow-none rounded-2xl py-6 px-8 flex items-center justify-between cursor-pointer transition-all gap-4 flex-wrap hover:border-indigo-500/50 hover:shadow-[0_15px_30px_rgba(99,102,241,0.1)] hover:-translate-y-1"
              onClick={() =>
                navigate(`/mock-interview/${session._id}/results`)
              }
            >
              <div className="flex flex-col gap-1.5 flex-1">
                <span className="font-bold text-xl text-text-main capitalize">{getSessionTitle(session)}</span>
                <div className="flex flex-wrap gap-2.5 text-xs text-text-muted mt-2 font-medium">
                  <span className="bg-gray-100 dark:bg-white/5 px-2 py-0.5 rounded-md">{formatDate(session.createdAt)}</span>
                  <span className="bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 px-2 py-0.5 rounded-md capitalize">
                    {session.difficulty}
                  </span>
                  {session.duration && (
                    <span className="bg-gray-100 dark:bg-white/5 px-2 py-0.5 rounded-md flex items-center gap-1">
                      <Clock size={12} />
                      {session.duration}s
                    </span>
                  )}
                  <span className="bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded-md capitalize">
                    {getSessionStatus(session).replace("-", " ")}
                  </span>
                  <span className="bg-gray-100 dark:bg-white/5 px-2 py-0.5 rounded-md">{session.totalQuestions} questions</span>
                </div>
              </div>
              <div className="flex flex-col items-center justify-center p-4 bg-indigo-50 dark:bg-indigo-500/5 rounded-xl border border-indigo-100 dark:border-indigo-500/10 min-w-[100px]">
                <div className="text-3xl font-black bg-gradient-to-br from-indigo-600 to-purple-600 dark:from-indigo-400 dark:to-purple-400 bg-clip-text text-transparent">
                  {session.overallScore || 0}%
                </div>
                <div className="text-[10px] font-bold text-indigo-500 dark:text-indigo-400 uppercase tracking-widest mt-1">Score</div>
              </div>
            </div>
          ))}
        </div>
        )}

          {pagination.pages > 1 && !filtersActive && (
            <Pagination
              currentPage={pagination.page}
              totalPages={pagination.pages}
              onPageChange={(p) => fetchHistory(p)}
            />
          )}
        </>
      )}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default InterviewHistory;
