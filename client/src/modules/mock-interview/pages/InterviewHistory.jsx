import React, { useRef, useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { getHistory } from "../services/interviewService";
import Pagination from "../../../shared/components/Pagination";
import {
  Plus,
  Clock,
  BookOpen,
  Loader2,
  AlertCircle,
  Download,
  FileJson,
  ArrowLeft,
  Trash2,
  History,
  Brain,
  Sparkles,
} from "lucide-react";
import Navbar from "../../../shared/components/Navbar";
import Footer from "../../../shared/components/Footer";

import { useDocumentTitle } from "../../../hooks/useDocumentTitle";
import logger from "../../../utils/logger";

const EXPORT_CSV_FILENAME = "interview-history.csv";
const EXPORT_JSON_FILENAME = "interview-history.json";

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
    title: firstAvailable(session?.title, session?.topic, session?.type, "Mock Interview"),
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

const InterviewHistory = () => {
  useDocumentTitle("Interview History");
  const navigate = useNavigate();
  const [sessions, setSessions] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [exportingType, setExportingType] = useState(null);
  const [exportError, setExportError] = useState(null);
  const exportInProgressRef = useRef(false);

  const fetchHistory = async (page = 1) => {
    setLoading(true);
    try {
      const res = await getHistory(page, 10);
      setSessions(res.data?.sessions || []);
      setPagination(res.data?.pagination || { page: 1, pages: 1, total: 0 });
    } catch (err) {
      setError("Failed to load interview history.");
      logger.error("[InterviewHistory] Error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

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
    } catch (err) {
      setExportError("Export failed. Please try again.");
      logger.error("[InterviewHistory] Export error:", err);
    } finally {
      exportInProgressRef.current = false;
      setExportingType(null);
    }
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
              className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white border-none py-2 px-5 rounded-full font-semibold text-sm cursor-pointer flex items-center gap-2 hover:shadow-[0_10px_20px_rgba(79,70,229,0.3)] hover:-translate-y-0.5 transition-all"
              onClick={() => navigate("/mock-interview")}
            >
              <Plus size={16} /> New Interview
            </button>
          </div>
        </div>

      {error && <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-4 rounded-xl text-center">{error}</div>}
      {exportError && (
        <div role="alert" className="bg-red-500/10 border border-red-500/30 text-red-400 p-4 rounded-xl text-center">
          <AlertCircle size={16} style={{ display: "inline", marginRight: 6 }} />
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {sessions.map((session) => (
            <div
              key={session._id}
              className="bg-white dark:bg-surface border border-border shadow-[0_10px_20px_rgba(0,0,0,0.02)] dark:shadow-none rounded-2xl py-6 px-8 flex items-center justify-between cursor-pointer transition-all gap-4 flex-wrap hover:border-indigo-500/50 hover:shadow-[0_15px_30px_rgba(99,102,241,0.1)] hover:-translate-y-1"
              onClick={() =>
                navigate(`/mock-interview/${session._id}/results`)
              }
            >
              <div className="flex flex-col gap-1.5 flex-1">
                <span className="font-bold text-xl text-text-main capitalize">{session.topic}</span>
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

          {pagination.pages > 1 && (
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
