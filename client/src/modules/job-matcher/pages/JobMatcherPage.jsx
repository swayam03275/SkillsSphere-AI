import { useState, useEffect } from "react";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { Sparkles, FileUp, AlertCircle, Briefcase } from "lucide-react";
import Navbar from "../../../shared/landing/Navbar";
import LoadingState from "../../../shared/components/LoadingState";
import { JobViewerCard, Pagination } from "../../../shared/components";
import JobApplyForm from "../../student-jobs/components/JobApplyForm";
import { applyToJob, getMyAppliedJobIds } from "../../student-jobs/services/jobService";
import { getRecommendations } from "../services/matcherService";

export default function JobMatcherPage() {
  const { token, user } = useSelector((state) => state.auth);
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [jobs, setJobs] = useState([]);
  const [hasResume, setHasResume] = useState(true);
  const [message, setMessage] = useState("");
  const [appliedJobIds, setAppliedJobIds] = useState(new Set());
  const [applyingJobId, setApplyingJobId] = useState(null);
  const [applyModalJob, setApplyModalJob] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 6;

  useEffect(() => {
    const fetchRecommendations = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await getRecommendations(token);
        setJobs(data.jobs || []);
        setHasResume(data.hasResume !== false);
        setMessage(data.message || "");

        // Fetch applied status
        try {
          const appliedResponse = await getMyAppliedJobIds(token);
          setAppliedJobIds(new Set(appliedResponse.appliedJobIds || []));
        } catch {
          // Silently ignore
        }
      } catch (err) {
        setError(err.message || "Failed to fetch recommendations.");
      } finally {
        setLoading(false);
      }
    };

    fetchRecommendations();
  }, [token]);

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
      const msg = err.message || "Failed to apply";
      if (msg.includes("already applied")) {
        setAppliedJobIds((prev) => new Set([...prev, jobId]));
        setApplyModalJob(null);
      } else {
        alert(msg);
      }
    } finally {
      setApplyingJobId(null);
    }
  };

  return (
    <main className="min-h-screen bg-[var(--background)] dark:bg-[radial-gradient(circle_at_top_left,#0f172a,#020617)] text-gray-900 dark:text-slate-100 flex flex-col">
      <Navbar />

      {/* Spacer for fixed navbar */}
      <div className="h-32 md:h-40 shrink-0"></div>

      <div className="container mx-auto px-4 pb-12 flex-1">
        {/* Header */}
        <div className="mb-16 text-center max-w-3xl mx-auto">
          <h1 className="text-5xl md:text-6xl font-black mb-6 tracking-tight leading-tight">
            <span className="text-gradient">Smart Job</span> Matching
          </h1>
          <p className="text-gray-500 dark:text-slate-400 text-xl leading-relaxed font-medium">
            AI-powered job recommendations based on your resume skills 🚀
          </p>
        </div>

        {/* Content */}
        {loading ? (
          <div className="min-h-[400px] flex items-center justify-center bg-gray-100 dark:bg-slate-900/30 rounded-2xl border border-gray-200 dark:border-white/5 backdrop-blur-sm">
            <LoadingState message="Analyzing your profile for the best matches..." />
          </div>
        ) : error ? (
          <div className="max-w-lg mx-auto text-center p-10 bg-gray-100 dark:bg-slate-900/50 rounded-2xl border border-red-500/20">
            <AlertCircle size={48} className="text-red-400 mx-auto mb-4" />
            <p className="text-red-600 dark:text-red-300 font-medium mb-6">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold rounded-xl transition-colors"
            >
              Try Again
            </button>
          </div>
        ) : !hasResume ? (
          /* No Resume — Upload Prompt */
          <div className="max-w-lg mx-auto text-center p-12 bg-gray-100 dark:bg-slate-900/50 rounded-2xl border border-white/5">
            <div className="inline-flex p-4 bg-blue-500/10 rounded-2xl mb-6">
              <FileUp size={48} className="text-blue-400" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">Upload Your Resume First</h2>
            <p className="text-slate-600 dark:text-slate-400 mb-8 leading-relaxed">
              {message || "To get personalized job recommendations, please upload and analyze your resume first."}
            </p>
            <button
              onClick={() => navigate("/resume-analyzer")}
              className="px-8 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-bold rounded-xl transition-all shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40"
            >
              Go to Resume Analyzer
            </button>
          </div>
        ) : jobs.length === 0 ? (
          /* Resume exists but no matching jobs */
          <div className="max-w-lg mx-auto text-center p-12 bg-gray-100 dark:bg-slate-900/50 rounded-2xl border border-white/5">
            <div className="inline-flex p-4 bg-slate-700/30 rounded-2xl mb-6">
              <Briefcase size={48} className="text-slate-500" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">No Matches Yet</h2>
            <p className="text-slate-600 dark:text-slate-400 mb-8 leading-relaxed">
              {message || "No suitable jobs found matching your profile yet. Check back as new positions are posted!"}
            </p>
            <button
              onClick={() => navigate("/jobs")}
              className="px-8 py-3 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl transition-colors border border-white/10"
            >
              Browse All Jobs
            </button>
          </div>
        ) : (
          /* Recommendations found */
          <div>
            <div className="mb-6 flex items-center gap-3">
              <div className="p-2 bg-blue-500/10 rounded-lg">
                <Sparkles size={20} className="text-blue-400" />
              </div>
              <h2 className="text-xl font-semibold text-gray-800 dark:text-slate-200">
                Recommended for You
                <span className="ml-2 text-sm font-normal text-slate-600 dark:text-slate-400 bg-slate-200 dark:bg-slate-800/50 px-2 py-0.5 rounded-full border border-gray-300 dark:border-white/5">
                  {jobs.length}
                </span>
              </h2>
            </div>

            <div className="grid grid-cols-1 gap-5">
              {jobs
                .slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE)
                .map((job) => (
                <div key={job._id || job.id} className="relative">
                  {/* Match Score Badge */}
                  {job.matchScore != null && (
                    <div className="absolute top-4 right-4 z-10 px-3 py-1 bg-emerald-500/15 border border-emerald-500/25 text-emerald-700 dark:text-emerald-300 text-xs font-bold rounded-full">
                      {Math.round(job.matchScore)}% Match
                    </div>
                  )}
                  <JobViewerCard
                    job={job}
                    viewerRole="student"
                    onApply={handleApply}
                    isApplied={appliedJobIds.has(job._id || job.id)}
                  />
                </div>
              ))}
            </div>

            <Pagination
              currentPage={currentPage}
              totalPages={Math.ceil(jobs.length / ITEMS_PER_PAGE)}
              onPageChange={(page) => {
                setCurrentPage(page);
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
            />

            {/* Browse all jobs link */}
            <div className="mt-10 text-center">
              <button
                onClick={() => navigate("/jobs")}
                className="text-sm text-slate-500 hover:text-blue-400 transition-colors font-medium"
              >
                ← Browse all job listings
              </button>
            </div>
          </div>
        )}
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
    </main>
  );
}