import { useState, useEffect, useMemo } from "react";
import { useSelector } from "react-redux";
import { useNavigate, Link } from "react-router-dom";
import {
  Briefcase,
  Calendar,
  MapPin,
  ExternalLink,
  Clock,
  AlertCircle,
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  XCircle,
  LayoutGrid,
  List,
  Target,
  Sparkles,
  Star,
  Search,
  ClipboardList,
  BarChart2,
} from "lucide-react";
import Navbar from "../../../shared/components/Navbar";
import Footer from "../../../shared/components/Footer";

import LoadingState from "../../../shared/components/LoadingState";
import ConfirmDialog from "../../../shared/components/ConfirmDialog";
import {
  getMyApplicationsDetailed,
  withdrawApplication,
  updateStudentApplicationStatus,
} from "../services/jobService";
import { StatusTimeline } from "../../../shared/components";
import { useToast } from "../../../shared/components/toast/ToastProvider";
import { useDocumentTitle } from "../../../hooks/useDocumentTitle";


const statusConfig = {
  pending: { label: "Pending", bg: "bg-yellow-500/15", text: "text-yellow-600 dark:text-yellow-300", border: "border-yellow-500/25" },
  reviewed: { label: "Reviewed", bg: "bg-blue-500/15", text: "text-blue-600 dark:text-blue-300", border: "border-blue-500/25" },
  shortlisted: { label: "Shortlisted", bg: "bg-emerald-500/15", text: "text-emerald-600 dark:text-emerald-300", border: "border-emerald-500/25" },
  rejected: { label: "Rejected", bg: "bg-red-500/15", text: "text-red-600 dark:text-red-300", border: "border-red-500/25" },
  withdrawn: { label: "Withdrawn", bg: "bg-slate-500/15", text: "text-slate-500 dark:text-slate-400", border: "border-slate-500/25" },
};

const BOARD_COLUMNS = ["pending", "reviewed", "shortlisted", "rejected", "withdrawn"];

const MyApplicationsPage = () => {
  useDocumentTitle("My Applications");
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
      
      // Use backend studentStatus, fallback to official recruiter status
      const enrichedApps = (data.applications || []).map(app => {
        let localStatus = app.studentStatus || app.status;
        return { ...app, _localStatus: localStatus };
      });
      
      setApplications(enrichedApps);
      setCurrentPage(data.currentPage || 1);
      setTotalPages(data.totalPages || 1);
      setTotalCount(data.totalCount || 0);
    } catch (err) {
      setError(err.message || "Failed to load applications.");
      toast.error(err.message || "Failed to load applications.");
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

  const handleDrop = async (e, columnStatus) => {
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

    // Optimistic UI Update
    const previousApplications = [...applications];
    setApplications(prev => 
      prev.map(a => a._id === appId ? { ...a, _localStatus: columnStatus } : a)
    );

    try {
      // Sync to database
      await updateStudentApplicationStatus(appId, columnStatus, token);
      toast.success(`Stage updated in your CRM! Note: The official status with the recruiter remains ${statusConfig[app.status]?.label || app.status}`, "Premium Personal CRM");
    } catch (error) {
      // Revert on failure
      setApplications(previousApplications);
      toast.error(error.message || "Failed to update status. Please try again.");
    }
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
        className={`bg-white dark:bg-surface/50 backdrop-blur-md rounded-2xl border transition-all duration-300 animate-in fade-in slide-in-from-bottom-2 ${isBoardView ? 'p-4 cursor-grab active:cursor-grabbing hover:border-brand-500/50' : 'p-5'} ${
          expandedId === app._id 
            ? "border-brand-500/50 bg-blue-50 dark:bg-surface/80 shadow-[0_0_20px_rgba(99,102,241,0.15)]" 
            : "border-border hover:border-white/20 hover:shadow-lg hover:shadow-brand-500/5"
        }`}
      >
        <div 
          className={`flex ${isBoardView ? 'flex-col gap-3' : 'flex-col sm:flex-row sm:items-start justify-between gap-4'} ${!isBoardView ? 'cursor-pointer' : ''}`}
          onClick={() => !isBoardView && setExpandedId(expandedId === app._id ? null : app._id)}
        >
          {/* Job info */}
          <div className="flex-1 min-w-0">
            <h3 className={`${isBoardView ? 'text-base' : 'text-lg'} font-heading font-semibold text-text-main truncate`}>
              {job?.title || "Job no longer available"}
            </h3>

            <div className={`flex flex-wrap items-center gap-2 mt-2 text-xs text-text-muted`}>
              {job?.location && (
                <span className="flex items-center gap-1">
                  <MapPin size={12} />
                  {job.location.city}
                  {job.location.remote && ", Remote"}
                </span>
              )}
              {job?.jobLevel && (
                <span className="px-1.5 py-0.5 bg-surface-hover rounded text-text-main">
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
                    className="px-2 py-0.5 bg-blue-500/10 text-blue-600 dark:text-blue-300 text-xs rounded-md border border-blue-500/20"
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
          <div className="mt-3 pt-3 border-t border-border flex flex-wrap items-center gap-4 text-xs">
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
                className="ml-auto text-text-muted hover:text-brand-400 transition-colors"
              >
                {expandedId === app._id ? 'Hide Timeline' : 'View Timeline'}
              </button>
            )}
          </div>
        )}

        {/* Expanded Timeline Section */}
        {expandedId === app._id && (
          <div className="mt-4 pt-4 border-t border-border animate-in slide-in-from-top-2 duration-300">
            <h4 className="text-xs font-bold text-brand-400 uppercase tracking-widest mb-4 flex items-center gap-2">
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
    <main className="min-h-screen bg-[var(--background)] dark:bg-[radial-gradient(circle_at_top_left,#0f172a,#020617)] text-gray-900 dark:text-slate-100 flex flex-col pt-24">
      <Navbar />



      <div className="container mx-auto px-4 pb-12 flex-1 relative">
        {/* Floating Icons Background */}
        <div className="absolute top-24 left-[10%] hidden lg:flex items-center justify-center w-16 h-16 bg-white dark:bg-surface rounded-full shadow-[0_8px_30px_rgb(0,0,0,0.08)] dark:shadow-white/5 opacity-80 pointer-events-none z-0 hover:opacity-100 transition-opacity">
          <Briefcase size={28} className="text-purple-500" />
        </div>
        <div className="absolute top-36 right-[10%] hidden lg:flex items-center justify-center w-16 h-16 bg-white dark:bg-surface rounded-full shadow-[0_8px_30px_rgb(0,0,0,0.08)] dark:shadow-white/5 opacity-80 pointer-events-none z-0 hover:opacity-100 transition-opacity">
          <Target size={28} className="text-green-500" />
        </div>

        <div className={`w-full mx-auto relative z-10 ${viewMode === 'list' ? 'max-w-[1200px]' : 'max-w-[1400px]'}`}>
          
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
               <Briefcase className="w-6 h-6 text-purple-600" />
            </div>
            <div className="hidden md:flex absolute top-8 right-4 xl:right-8 w-14 h-14 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-100 dark:border-emerald-500/20 rounded-2xl items-center justify-center shadow-sm transform rotate-3 hover:rotate-0 transition-transform">
               <Target className="w-6 h-6 text-emerald-600" />
            </div>

            <div className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-purple-50 dark:bg-purple-500/10 border border-purple-100 dark:border-purple-500/20 shadow-sm text-[11px] font-bold text-purple-600 dark:text-purple-400 mx-auto tracking-wide uppercase">
              <Sparkles size={12} className="text-purple-500" /> TRACK YOUR PROGRESS
            </div>
            
            <h1 className="text-4xl md:text-5xl font-black text-gray-900 dark:text-white tracking-tight">
              <span className="bg-gradient-to-r from-blue-600 via-purple-500 to-teal-400 bg-clip-text text-transparent">My</span> Applications
            </h1>
            
            <p className="text-gray-500 dark:text-gray-400 text-[15px] max-w-2xl mx-auto font-medium">
              Track and manage all the jobs you&apos;ve applied to
            </p>
          </div>

          {/* View Toggle */}
          <div className="flex justify-center mb-12">
            <div className="flex items-center p-1 bg-white dark:bg-surface/50 border border-border rounded-xl backdrop-blur-sm shadow-sm">
              <button
                onClick={() => { setViewMode("list"); setCurrentPage(1); }}
                className={`flex items-center gap-2 px-6 py-2 text-sm font-bold rounded-lg transition-all ${
                  viewMode === "list"
                    ? "bg-brand-600 text-white shadow-lg"
                    : "text-text-muted hover:text-text-main hover:bg-surface-hover"
                }`}
              >
                <List size={16} /> List View
              </button>
              <button
                onClick={() => { setViewMode("board"); }}
                className={`flex items-center gap-2 px-6 py-2 text-sm font-bold rounded-lg transition-all ${
                  viewMode === "board"
                    ? "bg-brand-600 text-white shadow-lg"
                    : "text-text-muted hover:text-text-main hover:bg-surface-hover"
                }`}
              >
                <LayoutGrid size={16} /> Board View
              </button>
            </div>
          </div>

        {/* Content */}
        {loading ? (
          <div className="min-h-[400px] flex items-center justify-center bg-white/50 dark:bg-slate-900/30 rounded-2xl border border-gray-200 dark:border-white/5">
            <LoadingState message="Loading your applications..." />
          </div>
        ) : error ? (
          <div className="text-center p-10 bg-red-50 dark:bg-slate-900/50 rounded-2xl border border-red-500/20">
            <AlertCircle size={48} className="text-red-400 mx-auto mb-4" />
            <p className="text-red-600 dark:text-red-300 font-medium mb-6">{error}</p>
            <button
              onClick={() => fetchApplications(currentPage)}
              className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold rounded-xl transition-colors"
            >
              Try Again
            </button>
          </div>
        ) : applications.length === 0 && currentPage === 1 ? (
          <div className="max-w-4xl mx-auto p-8 md:p-12 bg-white dark:bg-surface rounded-[2rem] border border-border shadow-[0_20px_50px_-12px_rgba(0,0,0,0.1)] dark:shadow-none flex flex-col md:flex-row items-center gap-12 relative overflow-hidden mt-8">
            
            {/* Left Graphic */}
            <div className="relative w-64 h-64 flex-shrink-0 flex items-center justify-center">
              <div className="absolute inset-0 bg-blue-50 dark:bg-blue-900/20 rounded-full blur-3xl opacity-50"></div>
              <div className="absolute inset-4 bg-gradient-to-tr from-purple-100 to-blue-50 dark:from-purple-900/30 dark:to-blue-900/30 rounded-full flex items-center justify-center border border-white/50 dark:border-white/5">
                <Briefcase size={80} className="text-purple-500 drop-shadow-xl" />
              </div>
              {/* Decorative elements */}
              <div className="absolute top-8 right-8 text-blue-500 animate-pulse"><Sparkles size={24} /></div>
              <div className="absolute bottom-12 left-8 text-purple-400 animate-bounce"><Star size={16} /></div>
            </div>

            {/* Right Content */}
            <div className="flex-1 text-center md:text-left z-10">
              <h2 className="text-3xl font-heading font-black text-gray-900 dark:text-white mb-4">
                No Applications Yet
              </h2>
              <p className="text-gray-500 dark:text-slate-400 text-lg mb-8 leading-relaxed max-w-lg">
                You haven&apos;t applied to any jobs yet. Start exploring opportunities and track your applications in one place.
              </p>
              
              <button
                onClick={() => navigate("/jobs")}
                className="inline-flex items-center gap-2 px-8 py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-all shadow-[0_8px_20px_rgb(37,99,235,0.3)] hover:shadow-[0_12px_25px_rgb(37,99,235,0.4)] hover:-translate-y-0.5"
              >
                <Search size={18} />
                Explore Job Opportunities
              </button>

              {/* Bottom Tags */}
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 mt-10">
                <div className="flex items-center gap-2 px-4 py-2 bg-gray-50 dark:bg-slate-800 rounded-full text-sm font-medium text-gray-700 dark:text-slate-300 border border-gray-200 dark:border-slate-700">
                  <Sparkles size={16} className="text-purple-500" />
                  AI Matching
                </div>
                <div className="flex items-center gap-2 px-4 py-2 bg-gray-50 dark:bg-slate-800 rounded-full text-sm font-medium text-gray-700 dark:text-slate-300 border border-gray-200 dark:border-slate-700">
                  <ClipboardList size={16} className="text-emerald-500" />
                  Application Tracking
                </div>
                <div className="flex items-center gap-2 px-4 py-2 bg-gray-50 dark:bg-slate-800 rounded-full text-sm font-medium text-gray-700 dark:text-slate-300 border border-gray-200 dark:border-slate-700">
                  <BarChart2 size={16} className="text-indigo-500" />
                  Smart Insights
                </div>
              </div>
            </div>
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
                  className="flex items-center gap-1 px-4 py-2 text-sm font-medium text-gray-600 dark:text-slate-300 bg-white dark:bg-slate-800/50 border border-gray-200 dark:border-white/10 rounded-xl hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
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
                  className="flex items-center gap-1 px-4 py-2 text-sm font-medium text-gray-600 dark:text-slate-300 bg-white dark:bg-slate-800/50 border border-gray-200 dark:border-white/10 rounded-xl hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
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
                  className={`flex-shrink-0 w-80 flex flex-col gap-3 rounded-2xl bg-gray-50 dark:bg-slate-900/30 border-2 transition-all duration-300 p-3 snap-start min-h-[500px] ${
                    isDragTarget ? `border-${config.bg.split('-')[1]}-500/50 bg-gray-100 dark:bg-slate-900/60 shadow-[0_0_20px_rgba(0,0,0,0.3)]` : 'border-gray-200 dark:border-white/5'
                  }`}
                  onDragOver={(e) => handleDragOver(e, colStatus)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, colStatus)}
                >
                  {/* Column Header */}
                  <div className="flex items-center justify-between pb-2 border-b border-gray-200 dark:border-white/5">
                    <h3 className={`text-sm font-black uppercase tracking-widest ${config.text}`}>
                      {config.label}
                    </h3>
                    <span className="flex items-center justify-center w-6 h-6 rounded-full bg-gray-200 dark:bg-slate-800 text-xs font-bold text-gray-600 dark:text-slate-300">
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
                      <div className={`flex-1 flex items-center justify-center rounded-xl border-2 border-dashed ${isDragTarget ? 'border-gray-400 dark:border-slate-600 bg-gray-100 dark:bg-slate-800/20' : 'border-gray-200 dark:border-white/5'} transition-colors`}>
                        <span className="text-xs font-bold text-gray-400 dark:text-slate-600 uppercase tracking-widest">Drop Here</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
        </div>
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
          background: rgba(229, 231, 235, 0.5);
          border-radius: 10px;
        }
        .dark .kanban-scrollbar::-webkit-scrollbar-track {
          background: rgba(15, 23, 42, 0.5);
        }
        .kanban-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(59, 130, 246, 0.3);
          border-radius: 10px;
        }
        .kanban-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(59, 130, 246, 0.5);
        }
      `}} />
          <Footer />
    </main>
  );
};

export default MyApplicationsPage;
