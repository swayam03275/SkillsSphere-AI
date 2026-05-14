import React, { useState, useEffect } from "react";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import {
  Briefcase,
  Calendar,
  MapPin,
  ExternalLink,
  Clock,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  XCircle,
} from "lucide-react";
import Navbar from "../../../shared/landing/Navbar";
import LoadingState from "../../../shared/components/LoadingState";
import ConfirmDialog from "../../../shared/components/ConfirmDialog";
import {
  getMyApplicationsDetailed,
  withdrawApplication,
} from "../services/jobService";
import { StatusTimeline } from "../../../shared/components";

const statusConfig = {
  pending: { label: "Pending", bg: "bg-yellow-500/15", text: "text-yellow-300", border: "border-yellow-500/25" },
  reviewed: { label: "Reviewed", bg: "bg-blue-500/15", text: "text-blue-300", border: "border-blue-500/25" },
  shortlisted: { label: "Shortlisted", bg: "bg-emerald-500/15", text: "text-emerald-300", border: "border-emerald-500/25" },
  rejected: { label: "Rejected", bg: "bg-red-500/15", text: "text-red-300", border: "border-red-500/25" },
  withdrawn: { label: "Withdrawn", bg: "bg-slate-500/15", text: "text-slate-400", border: "border-slate-500/25" },
};

const ITEMS_PER_PAGE = 3;

const MyApplicationsPage = () => {
  const { token } = useSelector((state) => state.auth);
  const navigate = useNavigate();
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [withdrawingId, setWithdrawingId] = useState(null);
  const [confirmJobId, setConfirmJobId] = useState(null);
  const [expandedId, setExpandedId] = useState(null);

  const fetchApplications = async (page = 1) => {
    setLoading(true);
    setError(null);
    try {
      const data = await getMyApplicationsDetailed(token, page, ITEMS_PER_PAGE);
      setApplications(data.applications || []);
      setCurrentPage(data.currentPage || 1);
      setTotalPages(data.totalPages || 1);
      setTotalCount(data.totalCount || 0);
    } catch (err) {
      setError(err.message || "Failed to load applications.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApplications(currentPage);
  }, [token]);

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
      fetchApplications(newPage);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const handleWithdraw = async () => {
    if (!confirmJobId) return;

    setWithdrawingId(confirmJobId);
    try {
      await withdrawApplication(confirmJobId, token);
      setApplications((prev) =>
        prev.map((app) =>
          (app.job?._id || app.job) === confirmJobId
            ? { ...app, status: "withdrawn" }
            : app
        )
      );
    } catch (err) {
      alert(err.message || "Failed to withdraw application.");
    } finally {
      setWithdrawingId(null);
      setConfirmJobId(null);
    }
  };

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const canWithdraw = (status) => ["pending", "reviewed"].includes(status);

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,#0f172a,#020617)] text-slate-100 flex flex-col">
      <Navbar />

      {/* Spacer for fixed navbar */}
      <div className="h-32 md:h-40 shrink-0"></div>

      <div className="container mx-auto px-4 pb-12 flex-1 max-w-4xl">
        {/* Header */}
        <div className="mb-10 text-center">
          <h1 className="text-4xl md:text-5xl font-black mb-4 tracking-tight">
            <span className="text-gradient">My</span> Applications
          </h1>
          <p className="text-slate-400 text-lg">
            Track all the jobs you&apos;ve applied to
          </p>
        </div>

        {/* Content */}
        {loading ? (
          <div className="min-h-[400px] flex items-center justify-center bg-slate-900/30 rounded-2xl border border-white/5">
            <LoadingState message="Loading your applications..." />
          </div>
        ) : error ? (
          <div className="text-center p-10 bg-slate-900/50 rounded-2xl border border-red-500/20">
            <AlertCircle size={48} className="text-red-400 mx-auto mb-4" />
            <p className="text-red-300 font-medium mb-6">{error}</p>
            <button
              onClick={() => fetchApplications(currentPage)}
              className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold rounded-xl transition-colors"
            >
              Try Again
            </button>
          </div>
        ) : applications.length === 0 && currentPage === 1 ? (
          /* Empty state */
          <div className="text-center p-12 bg-slate-900/50 rounded-2xl border border-white/5">
            <div className="inline-flex p-4 bg-slate-700/30 rounded-2xl mb-6">
              <Briefcase size={48} className="text-slate-500" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-3">
              No Applications Yet
            </h2>
            <p className="text-slate-400 mb-8">
              You haven&apos;t applied to any jobs yet. Head to the Job Board to find opportunities!
            </p>
            <button
              onClick={() => navigate("/jobs")}
              className="px-8 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition-colors"
            >
              Browse Job Board
            </button>
          </div>
        ) : (
          /* Applications list */
          <div className="space-y-4">
            <p className="text-sm text-slate-500 mb-2">
              {totalCount} application{totalCount !== 1 ? "s" : ""}
            </p>

            {applications.map((app) => {
              const job = app.job;
              const status = statusConfig[app.status] || statusConfig.pending;
              const jobId = job?._id || job;

              return (
                <div
                  key={app._id}
                  className={`p-5 bg-slate-900/50 rounded-2xl border transition-all duration-300 ${
                    expandedId === app._id 
                      ? "border-blue-500/30 bg-slate-900/80 shadow-lg" 
                      : "border-white/5 hover:border-white/10"
                  }`}
                >
                  <div 
                    className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 cursor-pointer"
                    onClick={() => setExpandedId(expandedId === app._id ? null : app._id)}
                  >
                    {/* Job info */}
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-bold text-white truncate">
                        {job?.title || "Job no longer available"}
                      </h3>

                      <div className="flex flex-wrap items-center gap-3 mt-2 text-sm text-slate-400">
                        {job?.location && (
                          <span className="flex items-center gap-1">
                            <MapPin size={14} />
                            {job.location.city}
                            {job.location.remote && ", Remote"}
                          </span>
                        )}
                        {job?.jobLevel && (
                          <span className="px-2 py-0.5 bg-slate-800 rounded text-xs">
                            {job.jobLevel}
                          </span>
                        )}
                      </div>

                      {/* Skills */}
                      {job?.skills?.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-3">
                          {job.skills.slice(0, 5).map((skill) => (
                            <span
                              key={skill}
                              className="px-2 py-0.5 bg-blue-100 text-blue-900 dark:bg-blue-500/10 dark:text-blue-300 text-xs rounded-md border border-blue-300 dark:border-blue-500/20"
                            >
                              {skill}
                            </span>
                          ))}
                          {job.skills.length > 5 && (
                            <span className="text-xs text-slate-500">
                              +{job.skills.length - 5} more
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Status + Date + Withdraw */}
                    <div className="flex flex-col items-end gap-2 shrink-0">
                      <span
                        className={`px-3 py-1 text-xs font-bold rounded-full ${status.bg} ${status.text} border ${status.border}`}
                      >
                        {status.label}
                      </span>
                      <span className="flex items-center gap-1 text-xs text-slate-500">
                        <Calendar size={12} />
                        {formatDate(app.createdAt)}
                      </span>

                      {/* Withdraw button */}
                      {canWithdraw(app.status) && (
                        <button
                          onClick={() => setConfirmJobId(jobId)}
                          disabled={withdrawingId === jobId}
                          className="mt-1 flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg hover:bg-red-500/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <XCircle size={12} />
                          {withdrawingId === jobId ? "Withdrawing..." : "Withdraw"}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Resume link + Cover note */}
                  <div className="mt-4 pt-3 border-t border-white/5 flex flex-wrap items-center gap-4 text-sm">
                    {app.resumeLink && (
                      <a
                        href={app.resumeLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 text-blue-400 hover:text-blue-300 transition-colors"
                      >
                        <ExternalLink size={14} />
                        Resume Link
                      </a>
                    )}
                    {app.coverNote && (
                      <span className="flex items-center gap-1.5 text-slate-500">
                        <Clock size={14} />
                        Cover note submitted
                      </span>
                    )}
                  </div>

                  {/* Expanded Timeline Section */}
                  {expandedId === app._id && (
                    <div className="mt-8 pt-8 border-t border-white/5 animate-in slide-in-from-top-2 duration-300">
                      <h4 className="text-sm font-bold text-blue-400 uppercase tracking-widest mb-6 flex items-center gap-2">
                        <Clock size={16} /> Application Journey
                      </h4>
                      <div className="px-2">
                        <StatusTimeline history={app.statusHistory} />
                      </div>
                    </div>
                  )}
                </div>
              );
            })}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-3 pt-6">
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage <= 1}
                  className="flex items-center gap-1 px-4 py-2 text-sm font-medium text-slate-300 bg-slate-800/50 border border-white/10 rounded-xl hover:bg-slate-700/50 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <ChevronLeft size={16} />
                  Previous
                </button>

                <span className="text-sm text-slate-400">
                  Page {currentPage} of {totalPages}
                </span>

                <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage >= totalPages}
                  className="flex items-center gap-1 px-4 py-2 text-sm font-medium text-slate-300 bg-slate-800/50 border border-white/10 rounded-xl hover:bg-slate-700/50 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  Next
                  <ChevronRight size={16} />
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Confirm Withdraw Dialog */}
      <ConfirmDialog
        isOpen={!!confirmJobId}
        title="Withdraw Application"
        message="Are you sure you want to withdraw this application? This action cannot be undone."
        confirmText="Withdraw"
        cancelText="Keep Application"
        variant="danger"
        loading={!!withdrawingId}
        onConfirm={handleWithdraw}
        onCancel={() => setConfirmJobId(null)}
      />
    </main>
  );
};

export default MyApplicationsPage;
