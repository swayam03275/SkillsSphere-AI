
import React, { useState, useEffect } from "react";
import { useSelector } from "react-redux";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Plus, Briefcase, Search, ArrowLeft, Target, Sparkles } from "lucide-react";
import Navbar from "../../../shared/components/Navbar";
import Footer from "../../../shared/components/Footer";

import Button from "../../../shared/components/Button";
import Input from "../../../shared/components/Input";
import LoadingState from "../../../shared/components/LoadingState";
import ErrorState from "../../../shared/components/ErrorState";
import EmptyState from "../../../shared/components/EmptyState";
import JobCardSkeleton from "../../student-jobs/components/JobCardSkeleton";
import { Pagination, JobViewerCard } from "../../../shared/components";
import JobPostingCard from "../components/JobPostingCard";
import { useDocumentTitle } from "../../../hooks/useDocumentTitle";
import RecruiterInsightsPage from "./RecruiterInsightsPage";
import {
  getRecruiterJobs,
  deleteJobPosting,
} from "../services/jobPostingService";
import { useToast } from "../../../shared/components/toast/ToastProvider";

import logger from "../../../utils/logger";

const STATUS_FILTERS = [
  { value: "all", label: "All Jobs" },
  { value: "open", label: "Open" },
  { value: "closed", label: "Closed" },
  { value: "archived", label: "Archived" },
];

const RecruiterJobsPage = () => {
  useDocumentTitle("Recruiter Jobs");
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { token } = useSelector((state: any) => state.auth);
  const toast = useToast();
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const insightsJobId = searchParams.get("insights");

  const fetchJobs = async (page = 1) => {
    setLoading(true);
    setError("");

    try {
      const response = await getRecruiterJobs(token, page, 6);
      setJobs(response.jobs || []);
      setCurrentPage(response.currentPage || 1);
      setTotalPages(response.totalPages || 1);
      setTotalCount(response.totalCount || 0);
    } catch (err: any) {
      setError(
        err.message || "Failed to load job postings. Please try again later.",
      );
      logger.error("Failed to fetch jobs:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let ignore = false;

    async function loadJobs() {
      setLoading(true);
      setError("");

      try {
        const response = await getRecruiterJobs(token, currentPage, 6);
        if (!ignore) {
          setJobs(response.jobs || []);
          setCurrentPage(response.currentPage || 1);
          setTotalPages(response.totalPages || 1);
          setTotalCount(response.totalCount || 0);
        }
      } catch (err: any) {
        if (!ignore) {
          setError(
            err.message ||
              "Failed to load job postings. Please try again later.",
          );
        }
        logger.error("Failed to fetch jobs:", err);
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    loadJobs();
    return () => {
      ignore = true;
    };
  }, [token]);

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
      fetchJobs(newPage);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const filteredJobs = jobs.filter((job) => {
    const locationString = job.location
      ? `${job.location.city}, ${job.location.state}, ${job.location.country}`
      : "";
    const matchesSearch =
      job.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      locationString.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus =
      statusFilter === "all" || job.status?.toLowerCase() === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const activeStatusLabel =
    STATUS_FILTERS.find((filter) => filter.value === statusFilter)?.label ||
    "All Jobs";
  const hasActiveFilters = Boolean(searchTerm) || statusFilter !== "all";
  const emptyTitle =
    statusFilter !== "all"
      ? `No ${activeStatusLabel.toLowerCase()} jobs found`
      : searchTerm
        ? "No matching jobs found"
        : "No job postings yet";
  const emptyDescription =
    hasActiveFilters
      ? "Try adjusting your search or status filter."
      : "Get started by creating your first job posting to find the best candidates.";

  const clearFilters = () => {
    setSearchTerm("");
    setStatusFilter("all");
  };

  const handleEditJob = (job) => {
    navigate(`/recruiter/jobs/edit/${job._id || job.id}`);
  };

  const handleDeleteJob = async (job) => {
    if (window.confirm(`Are you sure you want to delete "${job.title}"?`)) {
      try {
        await deleteJobPosting(job._id || job.id, token);
        // Refresh the jobs list
        setJobs(jobs.filter((j) => (j._id || j.id) !== (job._id || job.id)));
        toast.success("Job posting deleted successfully");
      } catch (err: any) {
        toast.error(err.message || "Failed to delete job posting.");
      }
    }
  };

  const handleViewRecommendations = (job) => {
    // navigate(`/recruiter/jobs/${job.id}/recommendations`);
    navigate(`?insights=${job._id || job.id}`);
  };

  const handleViewApplicants = (job) => {
    navigate(`/recruiter/jobs/${job._id || job.id}/applicants`);
  };

  return (
    <>
      {insightsJobId ? (
        <RecruiterInsightsPage jobId={insightsJobId} />
      ) : (
        <div className="min-h-screen bg-gray-50/50 dark:bg-[#09090b] text-gray-900 dark:text-text-main font-sans pt-20 flex flex-col">
      <Navbar />

      <main className="flex-grow flex flex-col items-center justify-start px-4 sm:px-6 lg:px-8 pb-12 animate-fade-in relative overflow-hidden w-full">
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
          <div className="absolute -top-[10%] -left-[5%] w-[40%] h-[40%] rounded-full bg-blue-100/40 dark:bg-blue-900/10 blur-[120px]" />
          <div className="absolute top-[20%] -right-[5%] w-[35%] h-[35%] rounded-full bg-purple-100/40 dark:bg-purple-900/10 blur-[100px]" />
          <div className="absolute top-[5%] right-[20%] w-[35%] h-[35%] rounded-full bg-teal-50/40 dark:bg-teal-900/10 blur-[100px]" />
        </div>

        <div className="w-full max-w-[1200px] relative z-10 flex flex-col gap-6">
          <div className="py-6 flex justify-between items-center">
            <Link 
              to="/dashboard" 
              className="inline-flex items-center gap-2 text-sm font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors"
            >
              <ArrowLeft size={16} />
              Back to Dashboard
            </Link>
            <Link to="/recruiter/jobs/new">
              {/* @ts-expect-error TODO: Fix pervasive types */}
              <Button
                variant="primary"
                leftIcon={<Plus size={18} />}
                className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 border-none shadow-[0_8px_20px_rgb(59,130,246,0.3)]"
              >
                Post New Job
              </Button>
            </Link>
          </div>

          <div className="text-center space-y-4 mb-6 relative">
            <div className="hidden md:flex absolute top-4 left-4 xl:left-8 w-14 h-14 bg-purple-50 dark:bg-purple-500/10 border border-purple-100 dark:border-purple-500/20 rounded-2xl items-center justify-center shadow-sm transform -rotate-3 hover:rotate-0 transition-transform">
               <Briefcase className="w-6 h-6 text-purple-600" />
            </div>
            <div className="hidden md:flex absolute top-8 right-4 xl:right-8 w-14 h-14 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-100 dark:border-emerald-500/20 rounded-2xl items-center justify-center shadow-sm transform rotate-3 hover:rotate-0 transition-transform">
               <Target className="w-6 h-6 text-emerald-600" />
            </div>

            <div className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-purple-50 dark:bg-purple-500/10 border border-purple-100 dark:border-purple-500/20 shadow-sm text-[11px] font-bold text-purple-600 dark:text-purple-400 mx-auto tracking-wide uppercase">
              <Sparkles size={12} className="text-purple-500" /> RECRUITMENT COMMAND CENTER
            </div>
            
            <h1 className="text-4xl md:text-5xl font-black text-gray-900 dark:text-white tracking-tight">
              <span className="bg-gradient-to-r from-blue-600 via-purple-500 to-teal-400 bg-clip-text text-transparent">Manage</span> Job Postings
            </h1>
            
            <p className="text-gray-500 dark:text-gray-400 text-[15px] max-w-2xl mx-auto font-medium">
              View and manage your active job listings and recommendations.
            </p>
          </div>

        <div className="flex flex-col gap-4 rounded-3xl border border-gray-100 dark:border-white/5 bg-white dark:bg-[#121214] p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full sm:max-w-md">
            {/* @ts-expect-error TODO: Fix pervasive types */}
            <Input
              id="search-jobs"
              placeholder="Search by title or location..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              leftIcon={<Search size={18} />}
            />
          </div>

          <div
            className="flex flex-wrap gap-2"
            role="group"
            aria-label="Filter jobs by status"
          >
            {STATUS_FILTERS.map((filter) => {
              const isActive = statusFilter === filter.value;

              return (
                <button
                  key={filter.value}
                  type="button"
                  aria-pressed={isActive}
                  onClick={() => setStatusFilter(filter.value)}
                  className={`rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                    isActive
                      ? "border-blue-400 bg-blue-50 dark:bg-blue-500/20 text-blue-600 dark:text-blue-100"
                      : "border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 hover:border-slate-400 dark:hover:border-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800"
                  }`}
                >
                  {filter.label}
                </button>
              );
            })}
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 gap-5">
            {Array.from({ length: 6 }).map((_, index) => (
              <JobCardSkeleton key={index} />
            ))}
          </div>
        ) : error ? (
          <ErrorState description={error} onRetry={fetchJobs} />
        ) : filteredJobs.length === 0 ? (
          <EmptyState
            icon={<Briefcase size={48} className="text-slate-600" />}
            title={emptyTitle}
            description={emptyDescription}
            action={
              hasActiveFilters ? (
                // @ts-expect-error TODO: Fix pervasive types
                <Button
                  variant="primary"
                  className="bg-blue-600 hover:bg-blue-500 mt-4"
                  onClick={clearFilters}
                >
                  Clear Filters
                </Button>
              ) : (
                <Link to="/recruiter/jobs/new">
                  {/* @ts-expect-error TODO: Fix pervasive types */}
                  <Button
                    variant="primary"
                    className="bg-blue-600 hover:bg-blue-500 mt-4"
                  >
                    Create First Posting
                  </Button>
                </Link>
              )
            }
          />
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {filteredJobs.map((job) => (
              <JobPostingCard
                key={job._id || job.id}
                job={job}
                onEdit={handleEditJob}
                onDelete={handleDeleteJob}
                onViewStats={handleViewRecommendations}
                onViewApplicants={handleViewApplicants}
              />
            ))}
          </div>
        )}

        {!loading && !error && filteredJobs.length > 0 && !hasActiveFilters && (
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={handlePageChange}
          />
        )}
      </div>
      </main>
          <Footer />
    </div>
      )}
    </>
  );
};

export default RecruiterJobsPage;
