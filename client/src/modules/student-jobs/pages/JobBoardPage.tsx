// @ts-nocheck

import React, { useState, useEffect, useCallback } from "react";
import { useSelector } from "react-redux";
import { Link } from "react-router-dom";
import { Briefcase, Info, ArrowLeft, Sparkles, TrendingUp } from "lucide-react";
import Navbar from "../../../shared/components/Navbar";
import Footer from "../../../shared/components/Footer";

import ErrorState from "../../../shared/components/ErrorState";
import EmptyState from "../../../shared/components/EmptyState";
import { JobViewerCard, Pagination } from "../../../shared/components";
import JobFilters from "../components/JobFilters";
import JobApplyForm from "../components/JobApplyForm";
import { getJobs, applyToJob, getMyAppliedJobIds } from "../services/jobService";
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

  const fetchJobs = useCallback(async (currentFilters, page = 1) => {
    setLoading(true);
    setError(null);
    try {
      const response = await getJobs(currentFilters, token, page, 6);
      setJobs(response.jobs || []);
      setCurrentPage(response.currentPage || 1);
      setTotalPages(response.totalPages || 1);
      setTotalCount(response.totalCount || 0);

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
  }, [token]);

  useEffect(() => {
    fetchJobs(filters, 1);
  }, [fetchJobs, filters]);

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
      fetchJobs(filters, newPage);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const handleFilterChange = (newFilters) => {
    setFilters(newFilters);
  };

  const handleApply = (job) => {
    setApplyModalJob(job);
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
            <JobFilters onFilterChange={handleFilterChange} />
          </div>

          {/* Job List Area */}
          <div className="lg:col-span-3">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-3">
                Available Jobs 
                <span className="bg-gray-200 dark:bg-slate-800 text-gray-700 dark:text-gray-300 text-xs px-2.5 py-0.5 rounded-full">{totalCount}</span>
              </h3>
            </div>


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
                  Object.values(filters).some(v => v)
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
            {!loading && jobs.length > 0 && (
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
