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
} from "lucide-react";
import Navbar from "../../../modules/landing/components/Navbar";
import Footer from "../../../modules/landing/components/Footer";

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
      <div className="max-w-[900px] mx-auto px-8 pb-8 pt-24 flex flex-col gap-6 min-h-[calc(100vh-80px)]">
        <Navbar />
        <div className="flex-1 flex flex-col items-center justify-center gap-4 text-slate-400 min-h-[50vh]">
          <Loader2 className="animate-spin" size={48} />
          <p>Loading history...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-[900px] mx-auto px-8 pb-8 pt-24 flex flex-col gap-6 min-h-[calc(100vh-80px)]">
      <div>
        <Link 
          to="/dashboard" 
          className="inline-flex items-center gap-2 text-sm text-blue-500 hover:text-blue-400 mb-2 transition-colors"
        >
          <ArrowLeft size={16} />
          Back to Dashboard
        </Link>
      </div>
      <div className="flex justify-between items-center gap-4 flex-wrap">
        <h1 className="text-3xl font-extrabold bg-gradient-to-br from-indigo-500 to-purple-500 bg-clip-text text-transparent">Interview History</h1>
        <div className="flex items-center gap-3 flex-wrap">
          {sessions.length > 0 && (
            <div className="flex items-center gap-2" aria-busy={Boolean(exportingType)}>
              <button
                type="button"
                className="bg-white/5 text-indigo-300 border border-indigo-500/30 py-2 px-4 rounded-full font-semibold text-sm cursor-pointer flex items-center gap-2 hover:bg-indigo-500/10 disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={() => handleExport("csv")}
                disabled={Boolean(exportingType)}
                aria-label="Export interview history as CSV"
              >
                <Download size={16} />
                {exportingType === "csv" ? "Exporting..." : "Export CSV"}
              </button>
              <button
                type="button"
                className="bg-white/5 text-indigo-300 border border-indigo-500/30 py-2 px-4 rounded-full font-semibold text-sm cursor-pointer flex items-center gap-2 hover:bg-indigo-500/10 disabled:opacity-50 disabled:cursor-not-allowed"
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
            className="bg-gradient-to-br from-indigo-500 to-purple-500 text-white border-none py-2 px-5 rounded-full font-semibold text-sm cursor-pointer flex items-center gap-2 hover:opacity-90"
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
        <div className="text-center py-16 px-8 text-slate-400 flex flex-col items-center">
          <BookOpen size={48} />
          <p className="mt-4">No interviews yet. Start your first one!</p>
          <button
            className="bg-gradient-to-br from-indigo-500 to-purple-500 text-white border-none py-2 px-5 rounded-full font-semibold text-sm cursor-pointer flex items-center gap-2 hover:opacity-90 mt-4"
            onClick={() => navigate("/mock-interview")}
          >
            <Plus size={16} /> Start Interview
          </button>
        </div>
      ) : (
        <>
          {sessions.map((session) => (
            <div
              key={session._id}
              className="bg-white/5 border border-white/10 rounded-2xl py-5 px-6 flex items-center justify-between cursor-pointer transition-all gap-4 flex-wrap hover:border-indigo-500 hover:-translate-y-0.5 dark:bg-gray-900/70"
              onClick={() =>
                navigate(`/mock-interview/${session._id}/results`)
              }
            >
              <div className="flex flex-col gap-1.5">
                <span className="font-bold text-lg text-slate-100 capitalize">{session.topic}</span>
                <div className="flex flex-wrap gap-3 text-xs text-slate-400">
                  <span>{formatDate(session.createdAt)}</span>
                  <span>•</span>
                  <span style={{ textTransform: "capitalize" }}>
                    {session.difficulty}
                  </span>
                  {session.duration && (
                    <>
                      <span>•</span>
                      <span>
                        <Clock size={12} style={{ display: "inline", marginRight: 2 }} />
                        {session.duration}s
                      </span>
                    </>
                  )}
                  <span>•</span>
                  <span>{session.totalQuestions} questions</span>
                </div>
              </div>
              <div className="text-3xl font-extrabold bg-gradient-to-br from-indigo-500 to-purple-500 bg-clip-text text-transparent">
                {session.overallScore || 0}%
              </div>
            </div>
          ))}

          {pagination.pages > 1 && (
            <Pagination
              currentPage={pagination.page}
              totalPages={pagination.pages}
              onPageChange={(p) => fetchHistory(p)}
            />
          )}
        </>
      )}
          <Footer />
    </div>
  );
};

export default InterviewHistory;
