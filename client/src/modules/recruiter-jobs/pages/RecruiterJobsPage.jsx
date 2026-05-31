import React, { useState, useEffect } from "react";
import { useSelector } from "react-redux";
import { Link, useNavigate } from "react-router-dom";
import { Plus, Briefcase, Search, ArrowLeft } from "lucide-react";
import Navbar from "../../../modules/landing/components/Navbar";
import Footer from "../../../modules/landing/components/Footer";

import Button from "../../../shared/components/Button";
import Input from "../../../shared/components/Input";
import LoadingState from "../../../shared/components/LoadingState";
import ErrorState from "../../../shared/components/ErrorState";
import EmptyState from "../../../shared/components/EmptyState";
import JobCardSkeleton from "../../student-jobs/components/JobCardSkeleton";
import { Pagination, JobViewerCard } from "../../../shared/components";
import JobPostingCard from "../components/JobPostingCard";
import { useDocumentTitle } from "../../../hooks/useDocumentTitle";
import {
  getRecruiterJobs,
  deleteJobPosting,
} from "../services/jobPostingService";
import { useToast } from "../../../shared/components/toast/ToastProvider";

const STATUS_FILTERS = [
  { value: "all", label: "All Jobs" },
  { value: "open", label: "Open" },
  { value: "closed", label: "Closed" },
  { value: "archived", label: "Archived" },
];

const RecruiterJobsPage = () => {
  useDocumentTitle("Recruiter Jobs");
  const navigate = useNavigate();
  const { token } = useSelector((state) => state.auth);
  const toast = useToast();
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  const fetchJobs = async (page = 1) => {
    setLoading(true);
    setError("");

    try {
      const response = await getRecruiterJobs(token, page, 6);
      setJobs(response.jobs || []);
      setCurrentPage(response.currentPage || 1);
      setTotalPages(response.totalPages || 1);
      setTotalCount(response.totalCount || 0);
    } catch (err) {
      setError(
        err.message || "Failed to load job postings. Please try again later.",
      );
      console.error("Failed to fetch jobs:", err);
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
      } catch (err) {
        if (!ignore) {
          setError(
            err.message ||
              "Failed to load job postings. Please try again later.",
          );
        }
        console.error("Failed to fetch jobs:", err);
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
      } catch (err) {
        toast.error(err.message || "Failed to delete job posting.");
      }
    }
  };

  const handleViewRecommendations = (job) => {
    // navigate(`/recruiter/jobs/${job.id}/recommendations`);
    console.log("View recommendations", job);
  };

  const handleViewApplicants = (job) => {
    navigate(`/recruiter/jobs/${job._id || job.id}/applicants`);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#020617] text-slate-900 dark:text-white flex flex-col">
      <Navbar />

      <div className="flex-1 w-full mx-auto max-w-5xl flex flex-col gap-6 pt-24 pb-16 px-4 sm:px-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <Link 
              to="/dashboard" 
              className="inline-flex items-center gap-2 text-sm text-blue-500 hover:text-blue-400 mb-4 transition-colors"
            >
              <ArrowLeft size={16} />
              Back to Dashboard
            </Link>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
              Manage Job Postings
            </h1>
            <p className="text-slate-600 dark:text-slate-400 mt-1">
              View and manage your active job listings and recommendations.
            </p>
          </div>
          <Link to="/recruiter/jobs/new">
            <Button
              variant="primary"
              leftIcon={<Plus size={18} />}
              className="bg-blue-600 hover:bg-blue-500"
            >
              Post New Job
            </Button>
          </Link>
        </div>

        <div className="flex flex-col gap-4 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900/60 p-4 shadow-lg shadow-black/10 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full sm:max-w-md">
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
                      ? "border-blue-400 bg-blue-500/20 text-blue-100"
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
          <ErrorState message={error} onRetry={fetchJobs} />
        ) : filteredJobs.length === 0 ? (
          <EmptyState
            icon={<Briefcase size={48} className="text-slate-600" />}
            title={emptyTitle}
            description={emptyDescription}
            action={
              hasActiveFilters ? (
                <Button
                  variant="primary"
                  className="bg-blue-600 hover:bg-blue-500 mt-4"
                  onClick={clearFilters}
                >
                  Clear Filters
                </Button>
              ) : (
                <Link to="/recruiter/jobs/new">
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
          <Footer />
    </div>
  );
};

export default RecruiterJobsPage;
