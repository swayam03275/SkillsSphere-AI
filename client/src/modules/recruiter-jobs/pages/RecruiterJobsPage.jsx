import React, { useState, useEffect } from "react";
import { useSelector } from "react-redux";
import { Link, useNavigate } from "react-router-dom";
import { Plus, Briefcase, Search } from "lucide-react";
import Navbar from "../../../shared/landing/Navbar";
import Button from "../../../shared/components/Button";
import Input from "../../../shared/components/Input";
import LoadingState from "../../../shared/components/LoadingState";
import ErrorState from "../../../shared/components/ErrorState";
import EmptyState from "../../../shared/components/EmptyState";
import { JobViewerCard, Pagination } from "../../../shared/components";
import { getRecruiterJobs, deleteJobPosting } from "../services/jobPostingService";

const RecruiterJobsPage = () => {
  const navigate = useNavigate();
  const { token } = useSelector((state) => state.auth);
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
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
      setError(err.message || "Failed to load job postings. Please try again later.");
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
          setError(err.message || "Failed to load job postings. Please try again later.");
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
    return (
      job.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      locationString.toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  const handleEditJob = (job) => {
    navigate(`/recruiter/jobs/edit/${job._id || job.id}`);
  };

  const handleDeleteJob = async (job) => {
    if (window.confirm(`Are you sure you want to delete "${job.title}"?`)) {
      try {
        await deleteJobPosting(job._id || job.id, token);
        // Refresh the jobs list
        setJobs(jobs.filter(j => (j._id || j.id) !== (job._id || job.id)));
      } catch (err) {
        alert(err.message || "Failed to delete job posting.");
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
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,#0f172a,#020617)] p-3 sm:p-5 pt-20 sm:pt-28 text-slate-100">
      <Navbar />

      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 py-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-white">Manage Job Postings</h1>
            <p className="text-slate-400 mt-1">View and manage your active job listings and recommendations.</p>
          </div>
          <Link to="/recruiter/jobs/new">
            <Button variant="primary" leftIcon={<Plus size={18} />} className="bg-blue-600 hover:bg-blue-500">
              Post New Job
            </Button>
          </Link>
        </div>

        <div className="relative">
          <Input
            id="search-jobs"
            placeholder="Search by title or location..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            leftIcon={<Search size={18} />}
            className="max-w-md"
          />
        </div>

        {loading ? (
          <div className="py-20">
            <LoadingState message="Fetching your job postings..." />
          </div>
        ) : error ? (
          <ErrorState message={error} onRetry={fetchJobs} />
        ) : filteredJobs.length === 0 ? (
          <EmptyState
            icon={<Briefcase size={48} className="text-slate-600" />}
            title={searchTerm ? "No matching jobs found" : "No job postings yet"}
            description={searchTerm ? "Try adjusting your search filters." : "Get started by creating your first job posting to find the best candidates."}
            action={!searchTerm && (
              <Link to="/recruiter/jobs/new">
                <Button variant="primary" className="bg-blue-600 hover:bg-blue-500 mt-4">
                  Create First Posting
                </Button>
              </Link>
            )}
          />
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {filteredJobs.map((job) => (
              <JobViewerCard
                key={job._id || job.id}
                job={job}
                viewerRole="recruiter"
                onEdit={handleEditJob}
                onDelete={handleDeleteJob}
                onViewStats={handleViewRecommendations}
                onViewApplicants={handleViewApplicants}
              />
            ))}
          </div>
        )}

        {!loading && !error && filteredJobs.length > 0 && !searchTerm && (
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={handlePageChange}
          />
        )}
      </div>
    </main>
  );
};

export default RecruiterJobsPage;
