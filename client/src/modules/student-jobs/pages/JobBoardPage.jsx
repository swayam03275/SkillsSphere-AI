import React, { useState, useEffect, useCallback } from "react";
import { useSelector } from "react-redux";
import { Link } from "react-router-dom";
import { Briefcase, Info, ArrowLeft } from "lucide-react";
import Navbar from "../../../modules/landing/components/Navbar";
import Footer from "../../../modules/landing/components/Footer";

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
    <main className="min-h-screen bg-white dark:bg-[radial-gradient(circle_at_top_left,#0f172a,#020617)] text-gray-900 dark:text-slate-100 flex flex-col pt-24">
      <Navbar />
      

      
      <div className="container mx-auto px-4 pb-12 flex-1">
        {/* Header Section */}
        <div className="mb-16 text-center max-w-3xl mx-auto">
          <Link 
            to="/dashboard" 
            className="inline-flex items-center gap-2 text-sm text-blue-500 hover:text-blue-400 mb-6 transition-colors"
          >
            <ArrowLeft size={16} />
            Back to Dashboard
          </Link>
          <h1 className="text-5xl md:text-6xl font-black mb-6 tracking-tight leading-tight">
            <span className="text-gradient">Opportunities</span> Await
          </h1>
          <p className="text-gray-500 dark:text-slate-400 text-xl leading-relaxed font-medium">
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
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-800 dark:text-slate-200 flex items-center gap-2">
                Available Jobs
                <span className="text-sm font-normal text-slate-500 bg-slate-800/50 px-2 py-0.5 rounded-full border border-white/5">
                  {loading ? "..." : jobs.length}
                </span>
              </h2>
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
              <div className="mt-10 p-5 rounded-2xl bg-slate-900/50 border border-white/5 flex gap-4 items-start">
                <div className="p-2 bg-blue-500/10 text-blue-400 rounded-lg shrink-0">
                  <Info size={20} />
                </div>
                <p className="text-sm text-slate-400 leading-relaxed">
                  Showing all active job listings. Jobs are updated daily based on company availability and recruiter postings. 
                  Ensure your profile is complete to improve your chances of getting noticed!
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
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
    </main>
  );
};

export default JobBoardPage;
