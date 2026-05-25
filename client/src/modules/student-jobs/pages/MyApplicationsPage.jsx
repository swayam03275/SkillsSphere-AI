import React, { useState, useEffect, useMemo } from "react";
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
  LayoutGrid,
  List,
} from "lucide-react";
import Navbar from "../../../shared/landing/Navbar";
import LoadingState from "../../../shared/components/LoadingState";
import ConfirmDialog from "../../../shared/components/ConfirmDialog";
import {
  getMyApplicationsDetailed,
  withdrawApplication,
} from "../services/jobService";
import { StatusTimeline } from "../../../shared/components";
import { useToast } from "../../../shared/components/toast/ToastProvider";

const statusConfig = {
  pending: { label: "Pending", bg: "bg-yellow-500/15", text: "text-yellow-300", border: "border-yellow-500/25" },
  reviewed: { label: "Reviewed", bg: "bg-blue-500/15", text: "text-blue-300", border: "border-blue-500/25" },
  shortlisted: { label: "Shortlisted", bg: "bg-emerald-500/15", text: "text-emerald-300", border: "border-emerald-500/25" },
  rejected: { label: "Rejected", bg: "bg-red-500/15", text: "text-red-300", border: "border-red-500/25" },
  withdrawn: { label: "Withdrawn", bg: "bg-slate-500/15", text: "text-slate-400", border: "border-slate-500/25" },
};

const BOARD_COLUMNS = ["pending", "reviewed", "shortlisted", "rejected", "withdrawn"];

const MyApplicationsPage = () => {
  const { token } = useSelector((state) => state.auth);
  const navigate = useNavigate();
  const toast = useToast();
  
  const [viewMode, setViewMode] = useState("list"); // "list" | "board"
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  
  const [withdrawingId, setWithdrawingId] = useState(null);
  const [confirmJobId, setConfirmJobId] = useState(null);
  const [expandedId, setExpandedId] = useState(null);

  // For Drag and Drop visual feedback
  const [activeDragCol, setActiveDragCol] = useState(null);

  const fetchApplications = async (page = 1, currentView = viewMode) => {
    setLoading(true);
    setError(null);
    const limit = currentView === "board" ? 100 : 3;
    try {
      const data = await getMyApplicationsDetailed(token, page, limit);
      
      // Inject local CRM status overrides
      const enrichedApps = (data.applications || []).map(app => {
        let localStatus = app.status;
        if (app.status !== "withdrawn" && app.status !== "rejected") {
          const savedStatus = localStorage.getItem(`ss_custom_stage_${app._id}`);
          if (savedStatus && BOARD_COLUMNS.includes(savedStatus)) {
            localStatus = savedStatus;
          }
        }
        return { ...app, _localStatus: localStatus };
      });
      
      setApplications(enrichedApps);
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
    fetchApplications(viewMode === "list" ? currentPage : 1, viewMode);
  }, [token, viewMode, currentPage]);

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const handleWithdraw = async () => {
    if (!confirmJobId) return;

    setWithdrawingId(confirmJobId);
    try {
      await withdrawApplication(confirmJobId, token);
      setApplications((prev) =>
        prev.map((app) => {
          if ((app.job?._id || app.job) === confirmJobId) {
            localStorage.removeItem(`ss_custom_stage_${app._id}`);
            return { ...app, status: "withdrawn", _localStatus: "withdrawn" };
          }
          return app;
        })
      );
      toast.success("Application successfully withdrawn.");
    } catch (err) {
      toast.error(err.message || "Failed to withdraw application.");
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

  // Drag and Drop Handlers
  const handleDragStart = (e, appId) => {
    e.dataTransfer.setData("appId", appId);
    // Add a slight transparency to the dragged item
    e.target.style.opacity = "0.5";
  };

  const handleDragEnd = (e) => {
    e.target.style.opacity = "1";
    setActiveDragCol(null);
  };

  const handleDragOver = (e, columnStatus) => {
    e.preventDefault();
    if (activeDragCol !== columnStatus) {
      setActiveDragCol(columnStatus);
    }
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setActiveDragCol(null);
  };

  const handleDrop = (e, columnStatus) => {
    e.preventDefault();
    setActiveDragCol(null);
    const appId = e.dataTransfer.getData("appId");
    if (!appId) return;

    const app = applications.find(a => a._id === appId);
    if (!app) return;

    if (app.status === "withdrawn" || app.status === "rejected") {
      toast.warning("Cannot move finalized applications.");
      return;
    }

    if (app._localStatus === columnStatus) return; // No change

    if (columnStatus === "withdrawn") {
      setConfirmJobId(app.job?._id || app.job);
      return;
    }

    // Update local CRM state
    localStorage.setItem(`ss_custom_stage_${appId}`, columnStatus);
    setApplications(prev => 
      prev.map(a => a._id === appId ? { ...a, _localStatus: columnStatus } : a)
    );
    toast.success(`Stage updated on your local board! Note: The official status with the recruiter remains ${statusConfig[app.status]?.label || app.status}`, "Premium Personal CRM");
  };

  // Group applications for Board View
  const boardData = useMemo(() => {
    const data = { pending: [], reviewed: [], shortlisted: [], rejected: [], withdrawn: [] };
    applications.forEach(app => {
      const col = app._localStatus || app.status;
      if (data[col]) {
        data[col].push(app);
      } else {
        data.pending.push(app); // fallback
      }
    });
    return data;
  }, [applications]);

  // Reusable Application Card component
  const AppCard = ({ app, isBoardView }) => {
    const job = app.job;
    const officialStatus = statusConfig[app.status] || statusConfig.pending;
    const localStatus = app._localStatus;
    const jobId = job?._id || job;
    const isCustomStage = localStatus !== app.status && !["withdrawn", "rejected"].includes(app.status);

    return (
      <div
        draggable={isBoardView && !["withdrawn", "rejected"].includes(app.status)}
        onDragStart={(e) => handleDragStart(e, app._id)}
        onDragEnd={handleDragEnd}
        className={`bg-slate-900/50 rounded-2xl border transition-all duration-300 ${isBoardView ? 'p-4 cursor-grab active:cursor-grabbing hover:border-blue-500/30' : 'p-5'} ${
          expandedId === app._id 
            ? "border-blue-500/30 bg-slate-900/80 shadow-[0_0_15px_rgba(59,130,246,0.15)]" 
            : "border-white/5 hover:border-white/10 hover:shadow-lg"
        }`}
      >
        <div 
          className={`flex ${isBoardView ? 'flex-col gap-3' : 'flex-col sm:flex-row sm:items-start justify-between gap-4'} ${!isBoardView ? 'cursor-pointer' : ''}`}
          onClick={() => !isBoardView && setExpandedId(expandedId === app._id ? null : app._id)}
        >
          {/* Job info */}
          <div className="flex-1 min-w-0">
            <h3 className={`${isBoardView ? 'text-base' : 'text-lg'} font-bold text-white truncate`}>
              {job?.title || "Job no longer available"}
            </h3>

            <div className={`flex flex-wrap items-center gap-2 mt-2 text-xs text-slate-400`}>
              {job?.location && (
                <span className="flex items-center gap-1">
                  <MapPin size={12} />
                  {job.location.city}
                  {job.location.remote && ", Remote"}
                </span>
              )}
              {job?.jobLevel && (
                <span className="px-1.5 py-0.5 bg-slate-800 rounded">
                  {job.jobLevel}
                </span>
              )}
            </div>

            {/* Skills - hide mostly in board view to save space */}
            {!isBoardView && job?.skills?.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-3">
                {job.skills.slice(0, 5).map((skill) => (
                  <span
                    key={skill}
                    className="px-2 py-0.5 bg-blue-500/10 text-blue-300 text-xs rounded-md border border-blue-500/20"
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
          <div className={`flex flex-col ${isBoardView ? 'items-start' : 'items-end'} gap-2 shrink-0 mt-1`}>
            <div className="flex items-center gap-2 flex-wrap">
              <span
                className={`px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-full ${officialStatus.bg} ${officialStatus.text} border ${officialStatus.border}`}
                title="Official Recruiter Status"
              >
                {isCustomStage ? `Official: ${officialStatus.label}` : officialStatus.label}
              </span>
            </div>
            
            <span className="flex items-center gap-1 text-[10px] uppercase font-bold tracking-wider text-slate-500">
              <Calendar size={10} />
              {formatDate(app.createdAt)}
            </span>

            {/* Withdraw button - only in list view, board uses drag drop */}
            {!isBoardView && canWithdraw(app.status) && (
              <button
                onClick={(e) => { e.stopPropagation(); setConfirmJobId(jobId); }}
                disabled={withdrawingId === jobId}
                className="mt-1 flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg hover:bg-red-500/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <XCircle size={12} />
                {withdrawingId === jobId ? "Withdrawing..." : "Withdraw"}
              </button>
            )}
          </div>
        </div>

        {/* Links section */}
        {(!isBoardView || app.resumeLink || app.coverNote) && (
          <div className="mt-3 pt-3 border-t border-white/5 flex flex-wrap items-center gap-4 text-xs">
            {app.resumeLink && (
              <a
                href={app.resumeLink}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="flex items-center gap-1.5 text-blue-400 hover:text-blue-300 transition-colors"
              >
                <ExternalLink size={12} />
                Resume Link
              </a>
            )}
            {app.coverNote && (
              <span className="flex items-center gap-1 text-slate-500">
                <Clock size={12} />
                Cover note added
              </span>
            )}
            {isBoardView && (
              <button 
                onClick={() => setExpandedId(expandedId === app._id ? null : app._id)}
                className="ml-auto text-slate-400 hover:text-white"
              >
                {expandedId === app._id ? 'Hide Timeline' : 'View Timeline'}
              </button>
            )}
          </div>
        )}

        {/* Expanded Timeline Section */}
        {expandedId === app._id && (
          <div className="mt-4 pt-4 border-t border-white/5 animate-in slide-in-from-top-2 duration-300">
            <h4 className="text-xs font-bold text-blue-400 uppercase tracking-widest mb-4 flex items-center gap-2">
              <Clock size={14} /> Application Journey
            </h4>
            <div className="px-2">
              <StatusTimeline history={app.statusHistory} />
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,#0f172a,#020617)] text-slate-100 flex flex-col">
      <Navbar />

      <div className="h-24 md:h-32 shrink-0"></div>

      <div className={`container mx-auto px-4 pb-12 flex-1 ${viewMode === 'list' ? 'max-w-4xl' : 'max-w-7xl'}`}>
        
        {/* Header and Toggle */}
        <div className="mb-8 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="text-center md:text-left">
            <h1 className="text-3xl md:text-4xl font-black mb-2 tracking-tight">
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-emerald-400">My</span> Applications
            </h1>
            <p className="text-slate-400 text-sm font-medium">
              Track and manage all the jobs you&apos;ve applied to
            </p>
          </div>

          <div className="flex items-center p-1 bg-slate-900/50 border border-white/10 rounded-xl backdrop-blur-sm">
            <button
              onClick={() => { setViewMode("list"); setCurrentPage(1); }}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-bold rounded-lg transition-all ${
                viewMode === "list"
                  ? "bg-blue-600 text-white shadow-lg"
                  : "text-slate-400 hover:text-white hover:bg-white/5"
              }`}
            >
              <List size={16} /> List View
            </button>
            <button
              onClick={() => { setViewMode("board"); }}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-bold rounded-lg transition-all ${
                viewMode === "board"
                  ? "bg-blue-600 text-white shadow-lg"
                  : "text-slate-400 hover:text-white hover:bg-white/5"
              }`}
            >
              <LayoutGrid size={16} /> Board View
            </button>
          </div>
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
        ) : viewMode === "list" ? (
          /* List View */
          <div className="space-y-4">
            <p className="text-sm text-slate-500 mb-2 font-bold uppercase tracking-wider">
              {totalCount} application{totalCount !== 1 ? "s" : ""} Total
            </p>

            {applications.map((app) => (
              <AppCard key={app._id} app={app} isBoardView={false} />
            ))}

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
                <span className="text-sm font-bold text-slate-400">
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
        ) : (
          /* Kanban Board View */
          <div className="flex gap-4 overflow-x-auto pb-6 pt-2 snap-x kanban-scrollbar">
            {BOARD_COLUMNS.map((colStatus) => {
              const colApps = boardData[colStatus] || [];
              const config = statusConfig[colStatus];
              const isDragTarget = activeDragCol === colStatus;

              return (
                <div 
                  key={colStatus} 
                  className={`flex-shrink-0 w-80 flex flex-col gap-3 rounded-2xl bg-slate-900/30 border-2 transition-all duration-300 p-3 snap-start min-h-[500px] ${
                    isDragTarget ? `border-${config.bg.split('-')[1]}-500/50 bg-slate-900/60 shadow-[0_0_20px_rgba(0,0,0,0.3)]` : 'border-white/5'
                  }`}
                  onDragOver={(e) => handleDragOver(e, colStatus)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, colStatus)}
                >
                  {/* Column Header */}
                  <div className="flex items-center justify-between pb-2 border-b border-white/5">
                    <h3 className={`text-sm font-black uppercase tracking-widest ${config.text}`}>
                      {config.label}
                    </h3>
                    <span className="flex items-center justify-center w-6 h-6 rounded-full bg-slate-800 text-xs font-bold text-slate-300">
                      {colApps.length}
                    </span>
                  </div>
                  
                  {/* Column Content */}
                  <div className="flex flex-col gap-3 flex-1">
                    {colApps.length > 0 ? (
                      colApps.map(app => (
                        <AppCard key={app._id} app={app} isBoardView={true} />
                      ))
                    ) : (
                      <div className={`flex-1 flex items-center justify-center rounded-xl border-2 border-dashed ${isDragTarget ? 'border-slate-600 bg-slate-800/20' : 'border-white/5'} transition-colors`}>
                        <span className="text-xs font-bold text-slate-600 uppercase tracking-widest">Drop Here</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <ConfirmDialog
        isOpen={!!confirmJobId}
        title="Withdraw Application"
        message="Are you sure you want to withdraw this application? This action cannot be undone and will notify the recruiter."
        confirmText="Withdraw"
        cancelText="Keep Application"
        variant="danger"
        loading={!!withdrawingId}
        onConfirm={handleWithdraw}
        onCancel={() => setConfirmJobId(null)}
      />

      {/* Global styles for the custom scrollbar */}
      <style dangerouslySetInnerHTML={{__html: `
        .kanban-scrollbar::-webkit-scrollbar {
          height: 8px;
        }
        .kanban-scrollbar::-webkit-scrollbar-track {
          background: rgba(15, 23, 42, 0.5);
          border-radius: 10px;
        }
        .kanban-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(59, 130, 246, 0.3);
          border-radius: 10px;
        }
        .kanban-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(59, 130, 246, 0.5);
        }
      `}} />
    </main>
  );
};

export default MyApplicationsPage;
