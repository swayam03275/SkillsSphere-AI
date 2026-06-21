import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Bookmark, Clock, Loader2, RefreshCw } from "lucide-react";
import Navbar from "../../../shared/components/Navbar";
import Footer from "../../../shared/components/Footer";
import { useDocumentTitle } from "../../../hooks/useDocumentTitle";
import logger from "../../../utils/logger";
import { getBookmarkedQuestions, toggleQuestionBookmark } from "../services/interviewService";

const BookmarkedQuestions = () => {
  useDocumentTitle("Bookmarked Interview Questions");
  const navigate = useNavigate();
  const [bookmarks, setBookmarks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [updatingId, setUpdatingId] = useState(null);

  const loadBookmarks = async () => {
    setLoading(true);
    setError("");

    try {
      const response = await getBookmarkedQuestions();
      setBookmarks(response.data || []);
    } catch (err: any) {
      setError("Failed to load bookmarked questions.");
      logger.error("[BookmarkedQuestions] Load error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBookmarks();
  }, []);

  const removeBookmark = async (bookmark) => {
    const bookmarkKey = `${bookmark.sessionId}-${bookmark.questionId}`;
    setUpdatingId(bookmarkKey);
    setError("");

    try {
      await toggleQuestionBookmark(bookmark.sessionId, bookmark.questionId, false);
      setBookmarks((current) =>
        current.filter(
          (item) =>
            item.sessionId !== bookmark.sessionId ||
            item.questionId !== bookmark.questionId,
        ),
      );
    } catch (err: any) {
      setError("Could not remove bookmark. Please try again.");
      logger.error("[BookmarkedQuestions] Remove error:", err);
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50/50 dark:bg-[#09090b] text-gray-900 dark:text-text-main font-sans pt-20 flex flex-col overflow-hidden relative">
      <Navbar />
      <main className="flex-grow flex flex-col items-center px-4 sm:px-6 lg:px-8 pb-12 w-full">
        <div className="w-full max-w-[1000px] flex flex-col gap-6">
          <div className="py-6 flex flex-wrap items-center justify-between gap-4">
            <Link
              to="/mock-interview/history"
              className="inline-flex items-center gap-2 text-sm font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors"
            >
              <ArrowLeft size={16} />
              Back to History
            </Link>
            <button
              type="button"
              onClick={loadBookmarks}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-full border border-border bg-white dark:bg-surface px-4 py-2 text-sm font-semibold text-indigo-600 dark:text-indigo-400 disabled:opacity-60"
            >
              <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
              Refresh
            </button>
          </div>

          <div className="text-center space-y-3 mb-4">
            <div className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-amber-50 dark:bg-amber-500/10 border border-amber-100 dark:border-amber-500/20 shadow-sm text-[11px] font-bold text-amber-700 dark:text-amber-300 mx-auto tracking-wide uppercase">
              <Bookmark size={12} fill="currentColor" /> Saved for review
            </div>
            <h1 className="text-4xl md:text-5xl font-black text-gray-900 dark:text-white tracking-tight">
              Bookmarked Questions
            </h1>
            <p className="text-gray-500 dark:text-gray-400 text-[15px] max-w-2xl mx-auto font-medium">
              Revisit the prompts you marked during mock interviews.
            </p>
          </div>

          {error && (
            <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
              {error}
            </div>
          )}

          {loading ? (
            <div className="flex min-h-[240px] items-center justify-center rounded-2xl border border-border bg-white dark:bg-surface text-text-muted">
              <Loader2 className="mr-2 animate-spin" size={22} />
              Loading bookmarks...
            </div>
          ) : bookmarks.length === 0 ? (
            <div className="text-center py-16 px-8 text-text-muted flex flex-col items-center bg-white dark:bg-surface border border-border rounded-2xl shadow-sm">
              <Bookmark size={44} className="mb-4 text-amber-400" />
              <p className="mt-2 text-lg font-medium text-text-main">No bookmarked questions yet.</p>
              <p className="mb-6">Bookmark questions during an interview or from your results page.</p>
              <button
                type="button"
                onClick={() => navigate("/mock-interview")}
                className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white border-none py-3 px-6 rounded-xl font-semibold cursor-pointer"
              >
                Start Interview
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {bookmarks.map((bookmark) => {
                const bookmarkKey = `${bookmark.sessionId}-${bookmark.questionId}`;
                return (
                  <article
                    key={bookmarkKey}
                    className="bg-white dark:bg-surface border border-border rounded-2xl p-6 shadow-sm"
                  >
                    <div className="mb-4 flex flex-wrap items-center gap-2 text-xs font-bold uppercase tracking-wide text-text-muted">
                      <span className="rounded-md bg-indigo-50 dark:bg-indigo-500/10 px-2 py-1 text-indigo-600 dark:text-indigo-300">
                        {bookmark.topic}
                      </span>
                      <span className="rounded-md bg-gray-100 dark:bg-white/5 px-2 py-1 capitalize">
                        {bookmark.difficulty}
                      </span>
                      {bookmark.completedAt && (
                        <span className="inline-flex items-center gap-1 rounded-md bg-gray-100 dark:bg-white/5 px-2 py-1">
                          <Clock size={12} />
                          {new Date(bookmark.completedAt).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                    <h2 className="text-lg font-bold leading-relaxed text-text-main">
                      {bookmark.questionText}
                    </h2>
                    {bookmark.transcript && (
                      <p className="mt-4 rounded-xl bg-gray-50 dark:bg-slate-900 p-4 text-sm leading-relaxed text-text-muted">
                        <strong className="block text-text-main mb-1">Your answer:</strong>
                        {bookmark.transcript}
                      </p>
                    )}
                    <div className="mt-5 flex flex-wrap gap-3">
                      <button
                        type="button"
                        onClick={() => navigate(`/mock-interview/${bookmark.sessionId}/results`)}
                        className="rounded-full bg-indigo-50 dark:bg-indigo-500/10 px-4 py-2 text-sm font-bold text-indigo-600 dark:text-indigo-300"
                      >
                        View results
                      </button>
                      <button
                        type="button"
                        onClick={() => removeBookmark(bookmark)}
                        disabled={updatingId === bookmarkKey}
                        className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-4 py-2 text-sm font-bold text-amber-700 disabled:opacity-60 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300"
                      >
                        <Bookmark size={15} fill="currentColor" />
                        Remove bookmark
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default BookmarkedQuestions;
