import React, { useState, useEffect, useCallback } from "react";
import { useSelector } from "react-redux";
import { Link } from "react-router-dom";
import {
  Briefcase,
  Info,
  ArrowLeft,
  Sparkles,
  TrendingUp,
  Bookmark,
  ArrowUpDown,
} from "lucide-react";
import Navbar from "../../../shared/components/Navbar";
import Footer from "../../../shared/components/Footer";

import ErrorState from "../../../shared/components/ErrorState";
import EmptyState from "../../../shared/components/EmptyState";
import { JobViewerCard, Pagination } from "../../../shared/components";
import JobFilters from "../components/JobFilters";
import JobApplyForm from "../components/JobApplyForm";
import {
  getJobs,
  applyToJob,
  getMyAppliedJobIds,
  getSavedJobs,
  saveJob,
  unsaveJob,
  getRecommendations,
} from "../services/jobService";
import JobCardSkeleton from "../components/JobCardSkeleton";
import { useDocumentTitle } from "../../../hooks/useDocumentTitle";
import { useToast } from "../../../shared/components/toast/ToastProvider";

const JobBoardPage = () => {
  useDocumentTitle("Job Board");
  const { token, user } = useSelector((state) => state.auth);
  const toast = useToast();
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({});
  const [appliedJobIds, setAppliedJobIds] = useState(new Set());
  const [applyingJobId, setApplyingJobId] = useState(null);
  const [applyModalJob, setApplyModalJob] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [view, setView] = useState("all");
  const [savedJobIds, setSavedJobIds] = useState(new Set());
  const [savingJobIds, setSavingJobIds] = useState(new Set());
  const [recommendationSort, setRecommendationSort] = useState("score");
  const [recommendationMessage, setRecommendationMessage] = useState("");
  const [hasRecommendationResume, setHasRecommendationResume] = useState(true);

  const fetchJobs = useCallback(async (currentFilters, page = 1, currentView = view) => {
    setLoading(true);
    setError(null);
    try {
      const response = currentView === "saved"
        ? await getSavedJobs(token, page, 6)
        : currentView === "recommended"
          ? await getRecommendations(token, { sortBy: recommendationSort, limit: 20 })
          : await getJobs(currentFilters, token, page, 6);
      setJobs(response.jobs || []);
      setCurrentPage(response.currentPage || 1);
      setTotalPages(response.totalPages || 1);
      setTotalCount(response.totalCount ?? response.jobs?.length ?? 0);

      if (currentView === "recommended") {
        setRecommendationMessage(response.message || "");
        setHasRecommendationResume(response.hasResume !== false);
      } else {
        setRecommendationMessage("");
        setHasRecommendationResume(true);
      }

      if (currentView === "saved") {
        setSavedJobIds(new Set(response.savedJobIds || []));
      } else {
        try {
          const savedResponse = await getSavedJobs(token, 1, 1);
          setSavedJobIds(new Set(savedResponse.savedJobIds || []));
        } catch {
          // Keep job discovery usable if saved-state lookup fails.
        }
      }

      // Fetch applied status separately — don't block job loading if it fails
      try {
        const appliedResponse = await getMyAppliedJobIds(token);
        setAppliedJobIds(new Set(appliedResponse.appliedJobIds || []));
      } catch {
        // Silently ignore — applied status will update after next apply
      }
    } catch (err) {
      setError(err.message || "Failed to fetch jobs. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [token, view, recommendationSort]);

  useEffect(() => {
    fetchJobs(filters, 1, view);
  }, [fetchJobs, filters, view]);

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
      fetchJobs(filters, newPage, view);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const handleFilterChange = (newFilters) => {
    setFilters(newFilters);
  };

  const handleApply = (job) => {
    setApplyModalJob(job);
  };

  const handleToggleSave = async (job) => {
    const jobId = job._id || job.id;
    const wasSaved = savedJobIds.has(jobId);
    setSavingJobIds((prev) => new Set([...prev, jobId]));

    try {
      if (wasSaved) {
        await unsaveJob(jobId, token);
        setSavedJobIds((prev) => {
          const next = new Set(prev);
          next.delete(jobId);
          return next;
        });
        if (view === "saved") {
          const nextPage = jobs.length === 1 && currentPage > 1
            ? currentPage - 1
            : currentPage;
          await fetchJobs(filters, nextPage, "saved");
        }
        toast.success("Job removed from saved jobs.");
      } else {
        await saveJob(jobId, token);
        setSavedJobIds((prev) => new Set([...prev, jobId]));
        toast.success("Job saved for later.");
      }
    } catch (err) {
      toast.error(err.message || "Could not update saved job. Please try again.");
    } finally {
      setSavingJobIds((prev) => {
        const next = new Set(prev);
        next.delete(jobId);
        return next;
      });
    }
  };

  const handleApplySubmit = async ({ resumeLink, coverNote }) => {
    const jobId = applyModalJob._id || applyModalJob.id;
    setApplyingJobId(jobId);
    try {
      await applyToJob(jobId, token, { resumeLink, coverNote });
      setAppliedJobIds((prev) => new Set([...prev, jobId]));
      setApplyModalJob(null);
    } catch (err) {
      const msg = err.message || err.data?.message || "Failed to apply";
      if (msg.includes("already applied")) {
        setAppliedJobIds((prev) => new Set([...prev, jobId]));
        setApplyModalJob(null);
      } else {
        toast.error(msg);
      }
    } finally {
      setApplyingJobId(null);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#09090b] text-gray-900 dark:text-text-main font-sans pt-20 flex flex-col">
      <Navbar />

      <main className="flex-grow flex flex-col items-center justify-start px-4 sm:px-6 lg:px-8 pb-12 animate-fade-in relative overflow-hidden">
        {/* Background glow effects */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
          <div className="absolute -top-[10%] -left-[5%] w-[40%] h-[40%] rounded-full bg-blue-100/40 dark:bg-blue-900/10 blur-[120px]" />
          <div className="absolute top-[20%] -right-[5%] w-[35%] h-[35%] rounded-full bg-purple-100/40 dark:bg-purple-900/10 blur-[100px]" />
          <div className="absolute top-[5%] right-[20%] w-[35%] h-[35%] rounded-full bg-teal-50/40 dark:bg-teal-900/10 blur-[100px]" />
        </div>

        <div className="w-full max-w-[1200px] relative z-10">
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
               <TrendingUp className="w-6 h-6 text-emerald-600" />
            </div>

            <div className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-purple-50 dark:bg-purple-500/10 border border-purple-100 dark:border-purple-500/20 shadow-sm text-[11px] font-bold text-purple-600 dark:text-purple-400 mx-auto tracking-wide uppercase">
              <Sparkles size={12} className="text-purple-500" /> Premium Opportunities
            </div>
            
            <h1 className="text-4xl md:text-5xl font-black text-gray-900 dark:text-white tracking-tight">
              <span className="bg-gradient-to-r from-blue-600 via-purple-500 to-teal-400 bg-clip-text text-transparent">Job</span> Board
            </h1>
            
            <p className="text-gray-500 dark:text-gray-400 text-[15px] max-w-2xl mx-auto font-medium">
              Browse through curated job listings from top companies looking for talent like you.
            </p>
          </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Filters Sidebar */}
          <div className="lg:col-span-1">
            {view === "all" ? (
              <JobFilters onFilterChange={handleFilterChange} />
            ) : (
              <div className="sticky top-28 rounded-3xl border border-blue-200 bg-white p-6 shadow-sm dark:border-blue-500/20 dark:bg-slate-900/50">
                {view === "saved" ? (
                  <Bookmark className="mb-3 text-blue-600 dark:text-blue-400" size={28} />
                ) : (
                  <Sparkles className="mb-3 text-purple-600 dark:text-purple-400" size={28} />
                )}
                <h2 className="font-bold text-gray-900 dark:text-white">
                  {view === "saved" ? "Saved Jobs" : "Recommended for you"}
                </h2>
                <p className="mt-2 text-sm text-gray-500 dark:text-slate-400">
                  {view === "saved"
                    ? "Your bookmarked opportunities stay here until you remove them."
                    : "Personalized matches based on the skills and experience in your latest resume."}
                </p>
              </div>
            )}
          </div>

          {/* Job List Area */}
          <div className="lg:col-span-3">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-3">
                {view === "saved"
                  ? "Saved Jobs"
                  : view === "recommended"
                    ? "Recommended for you"
                    : "Available Jobs"}
                <span className="bg-gray-200 dark:bg-slate-800 text-gray-700 dark:text-gray-300 text-xs px-2.5 py-0.5 rounded-full">{totalCount}</span>
              </h3>
              <div className="flex rounded-xl border border-gray-200 bg-white p-1 dark:border-white/10 dark:bg-slate-900">
                {[
                  ["all", "All Jobs"],
                  ["recommended", "Recommended"],
                  ["saved", "Saved"],
                ].map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => {
                      setCurrentPage(1);
                      setView(value);
                    }}
                    className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition-colors ${
                      view === value
                        ? "bg-blue-600 text-white"
                        : "text-gray-500 hover:text-blue-600 dark:text-slate-400"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {view === "recommended" && (
              <div className="mb-5 flex flex-col gap-3 rounded-2xl border border-purple-200 bg-purple-50/70 p-4 dark:border-purple-500/20 dark:bg-purple-500/5 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="flex items-center gap-2 text-sm font-bold text-purple-800 dark:text-purple-300">
                    <Sparkles size={16} />
                    AI-ranked opportunities
                  </p>
                  <p className="mt-1 text-xs text-purple-700/80 dark:text-purple-300/70">
                    {recommendationMessage || "Choose how you want your personalized matches ranked."}
                  </p>
                </div>
                <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-slate-300">
                  <ArrowUpDown size={15} className="text-purple-500" />
                  Sort by
                  <select
                    aria-label="Sort recommendations"
                    value={recommendationSort}
                    onChange={(event) => {
                      setCurrentPage(1);
                      setRecommendationSort(event.target.value);
                    }}
                    className="rounded-xl border border-purple-200 bg-white px-3 py-2 text-sm font-semibold text-gray-800 outline-none focus:ring-2 focus:ring-purple-500/30 dark:border-purple-500/20 dark:bg-slate-900 dark:text-slate-200"
                  >
                    <option value="score">Match score</option>
                    <option value="salary">Salary</option>
                    <option value="date">Date</option>
                  </select>
                </label>
              </div>
            )}

            {/* Display skeleton cards while jobs are loading */}
            {loading ? (
              <div className="grid grid-cols-1 gap-5">
                {Array.from({ length: 5 }).map((_, index) => (
                  <JobCardSkeleton key={index} />
                ))}
              </div>
            ): error ? (
              <ErrorState message={error} onRetry={() => fetchJobs(filters)} />
            ) : jobs.length === 0 ? (
              <EmptyState
                icon={<Briefcase size={64} className="text-slate-700 mb-4" />}
                title="No Jobs Found"
                description={
                  view === "saved"
                    ? "You haven't saved any jobs yet. Bookmark an opportunity to find it here."
                    : view === "recommended" && !hasRecommendationResume
                      ? "Upload and analyze a resume to unlock personalized job recommendations."
                      : view === "recommended"
                        ? "No personalized matches are available yet. Try again after updating your resume."
                    : Object.values(filters).some(v => v)
                    ? "Try adjusting your filters to see more opportunities."
                    : "There are currently no open job postings. Check back later!"
                }
              />
            ) : (
              <div className="grid grid-cols-1 gap-5">
                {jobs.map((job) => (
                  <JobViewerCard
                    key={job._id}
                    job={job}
                    viewerRole="student"
                    onApply={handleApply}
                    isApplied={appliedJobIds.has(job._id || job.id)}
                    isSaved={savedJobIds.has(job._id || job.id)}
                    isSaving={savingJobIds.has(job._id || job.id)}
                    onToggleSave={handleToggleSave}
                  />
                ))}
              </div>
            )}

            {!loading && !error && jobs.length > 0 && (
              <Pagination 
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={handlePageChange}
              />
            )}

            {/* Quick Note */}
            {!loading && jobs.length > 0 && view !== "recommended" && (
              <div className="mt-10 p-5 rounded-2xl bg-[#898F9C] dark:bg-slate-900/50 border-none dark:border-white/5 flex gap-4 items-center shadow-sm">
                <div className="p-2 bg-white/20 dark:bg-blue-500/10 text-blue-100 dark:text-blue-400 rounded-lg shrink-0">
                  <Info size={20} />
                </div>
                <p className="text-sm text-gray-100 dark:text-slate-400 leading-relaxed font-medium">
                  Showing all active job listings. Jobs are updated daily based on company availability and recruiter postings. 
                  Ensure your profile is complete to improve your chances of getting noticed!
                </p>
              </div>
            )}
          </div>
        </div>
        </div>
      </main>

      {/* Apply Form Modal */}
      {applyModalJob && (
        <JobApplyForm
          job={applyModalJob}
          user={user}
          onSubmit={handleApplySubmit}
          onClose={() => setApplyModalJob(null)}
          isSubmitting={!!applyingJobId}
        />
      )}
      <Footer />
    </div>
  );
};

export default JobBoardPage;
