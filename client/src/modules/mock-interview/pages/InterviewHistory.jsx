import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getHistory } from "../services/interviewService";
import Pagination from "../../../shared/components/Pagination";
import {
  Plus,
  Clock,
  BarChart3,
  BookOpen,
  Loader2,
  AlertCircle,
} from "lucide-react";
import Navbar from "../../../shared/landing/Navbar";

const InterviewHistory = () => {
  const navigate = useNavigate();
  const [sessions, setSessions] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchHistory = async (page = 1) => {
    setLoading(true);
    try {
      const res = await getHistory(page, 10);
      setSessions(res.data?.sessions || []);
      setPagination(res.data?.pagination || { page: 1, pages: 1, total: 0 });
    } catch (err) {
      setError("Failed to load interview history.");
      console.error("[InterviewHistory] Error:", err);
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
      
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-extrabold bg-gradient-to-br from-indigo-500 to-purple-500 bg-clip-text text-transparent">Interview History</h1>
        <button
          className="bg-gradient-to-br from-indigo-500 to-purple-500 text-white border-none py-2 px-5 rounded-full font-semibold text-sm cursor-pointer flex items-center gap-2 hover:opacity-90"
          onClick={() => navigate("/mock-interview")}
        >
          <Plus size={16} /> New Interview
        </button>
      </div>

      {error && <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-4 rounded-xl text-center">{error}</div>}

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
    </div>
  );
};

export default InterviewHistory;
