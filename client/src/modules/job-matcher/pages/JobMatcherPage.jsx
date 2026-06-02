import { useState, useEffect, useRef } from "react";
import { useSelector } from "react-redux";
import { useNavigate, Link } from "react-router-dom";
import { Sparkles, FileUp, AlertCircle, Briefcase, ArrowLeft, Target, UserPlus, BarChart2, Star, Loader2 } from "lucide-react";
import Navbar from "../../../shared/components/Navbar";
import Footer from "../../../shared/components/Footer";

import LoadingState from "../../../shared/components/LoadingState";
import { JobViewerCard, Pagination } from "../../../shared/components";
import JobApplyForm from "../../student-jobs/components/JobApplyForm";
import { applyToJob, getMyAppliedJobIds } from "../../student-jobs/services/jobService";
import { getRecommendations } from "../services/matcherService";
import { analyzeResume } from "../../resume-analyzer/services/resumeService";
import { useDocumentTitle } from "../../../hooks/useDocumentTitle";
import { useToast } from "../../../shared/components/toast/ToastProvider";

export default function JobMatcherPage() {
  useDocumentTitle("Smart Job Matching");
  const { token, user } = useSelector((state) => state.auth);
  const navigate = useNavigate();
  const toast = useToast();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [jobs, setJobs] = useState([]);
  const [hasResume, setHasResume] = useState(false);
  const [message, setMessage] = useState("");
  const [appliedJobIds, setAppliedJobIds] = useState(new Set());
  const [applyingJobId, setApplyingJobId] = useState(null);
  const [applyModalJob, setApplyModalJob] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef(null);
  const ITEMS_PER_PAGE = 6;

  useEffect(() => {
    if (refreshTrigger === 0) return;

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
  }, [token, refreshTrigger]);

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== "application/pdf") {
      toast.error("Please upload a PDF file.");
      return;
    }

    try {
      setIsUploading(true);
      setLoading(true);
      await analyzeResume(file);
      toast.success("Resume uploaded and parsed successfully!");
      setRefreshTrigger(prev => prev + 1);
    } catch (err) {
      toast.error(err.message || "Failed to upload and parse resume.");
      setLoading(false);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
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
      const msg = err.message || "Failed to apply";
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
    <main className="min-h-screen bg-[var(--background)] dark:bg-[radial-gradient(circle_at_top_left,#0f172a,#020617)] text-gray-900 dark:text-slate-100 flex flex-col pt-24">
      <Navbar />


      <div className="container mx-auto px-4 pb-12 flex-1 relative">
        {/* Floating Icons Background (visible mostly on desktop) */}
        <div className="absolute top-24 left-[10%] hidden lg:flex items-center justify-center w-16 h-16 bg-white dark:bg-slate-800 rounded-full shadow-[0_8px_30px_rgb(0,0,0,0.08)] dark:shadow-white/5 opacity-80 pointer-events-none z-0 hover:opacity-100 transition-opacity">
          <Briefcase size={28} className="text-purple-500" />
        </div>
        <div className="absolute top-36 right-[10%] hidden lg:flex items-center justify-center w-16 h-16 bg-white dark:bg-slate-800 rounded-full shadow-[0_8px_30px_rgb(0,0,0,0.08)] dark:shadow-white/5 opacity-80 pointer-events-none z-0 hover:opacity-100 transition-opacity">
          <Target size={28} className="text-green-500" />
        </div>

        <div className="w-full max-w-[1200px] mx-auto relative z-10">
          {/* Back to Dashboard Link */}
          <div className="py-6">
            <Link 
              to="/dashboard" 
              className="inline-flex items-center gap-2 text-sm font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
            >
              <ArrowLeft size={16} />
              Back to Dashboard
            </Link>
          </div>

          {/* Header */}
          <div className="mb-16 text-center max-w-3xl mx-auto relative pt-4">
            <div className="relative flex flex-col items-center">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-xs font-bold tracking-wider uppercase mb-6 border border-blue-100 dark:border-blue-800/50">
                <Sparkles size={14} /> AI POWERED MATCHING
              </div>
            </div>

          <h1 className="text-5xl md:text-6xl font-black mb-6 tracking-tight leading-tight">
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-600 via-purple-500 to-teal-400">Smart Job</span> Matching
          </h1>
          <p className="text-gray-500 dark:text-slate-400 text-lg leading-relaxed font-medium">
            AI-powered job recommendations based on your resume skills 🚀
          </p>
        </div>

        {/* Content */}
        {/* Always display the Upload Prompt so users can update their resume */}
        <div className="max-w-3xl mx-auto text-center p-8 bg-white dark:bg-slate-900 rounded-[2rem] border border-gray-100 dark:border-slate-800 shadow-[0_20px_50px_-12px_rgba(0,0,0,0.1)] dark:shadow-none relative z-10 mb-16">
          <div className="border border-dashed border-gray-300 dark:border-slate-700 rounded-3xl p-10 relative">
            <div className="absolute -top-6 left-1/2 -translate-x-1/2 w-12 h-12 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center rounded-xl shadow-sm border border-blue-100 dark:border-blue-800/50">
              <FileUp size={24} />
            </div>
            
            <h2 className="text-2xl font-black text-gray-900 dark:text-white mt-4 mb-3">Upload Your Resume First</h2>
            <p className="text-gray-500 dark:text-slate-400 mb-10 text-sm font-medium">
              Please upload a resume to see personalized job matches and recommendations tailored for you.
            </p>

            <div className="relative mb-10">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200 dark:border-slate-700"></div>
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="px-4 bg-white dark:bg-slate-900 text-gray-400 font-medium">Why upload your resume?</span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-left mb-10">
              <div className="flex flex-col items-center md:items-start text-center md:text-left">
                <div className="w-10 h-10 rounded-full bg-purple-50 dark:bg-purple-900/30 flex items-center justify-center mb-4 text-purple-600 dark:text-purple-400">
                  <UserPlus size={20} />
                </div>
                <h3 className="font-bold text-gray-900 dark:text-white text-sm mb-2">Personalized Matches</h3>
                <p className="text-xs text-gray-500 dark:text-slate-400 leading-relaxed">Get job recommendations that truly fit your profile.</p>
              </div>
              <div className="flex flex-col items-center md:items-start text-center md:text-left">
                <div className="w-10 h-10 rounded-full bg-emerald-50 dark:bg-emerald-900/30 flex items-center justify-center mb-4 text-emerald-600 dark:text-emerald-400">
                  <BarChart2 size={20} />
                </div>
                <h3 className="font-bold text-gray-900 dark:text-white text-sm mb-2">Higher Relevance</h3>
                <p className="text-xs text-gray-500 dark:text-slate-400 leading-relaxed">AI analyzes your skills to find the best opportunities.</p>
              </div>
              <div className="flex flex-col items-center md:items-start text-center md:text-left">
                <div className="w-10 h-10 rounded-full bg-yellow-50 dark:bg-yellow-900/30 flex items-center justify-center mb-4 text-yellow-600 dark:text-yellow-400">
                  <Star size={20} />
                </div>
                <h3 className="font-bold text-gray-900 dark:text-white text-sm mb-2">Better Opportunities</h3>
                <p className="text-xs text-gray-500 dark:text-slate-400 leading-relaxed">Discover roles that align with your career goals.</p>
              </div>
            </div>

            <input 
              type="file" 
              accept="application/pdf"
              className="hidden" 
              ref={fileInputRef}
              onChange={handleFileUpload}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="w-full md:w-auto px-10 py-3.5 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-bold rounded-xl transition-all shadow-[0_8px_20px_rgb(59,130,246,0.3)] hover:shadow-[0_12px_25px_rgb(59,130,246,0.4)] flex items-center justify-center gap-2 mx-auto disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {isUploading ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  Uploading & Parsing...
                </>
              ) : (
                <>
                  <FileUp size={18} />
                  Upload Resume PDF
                </>
              )}
            </button>
          </div>
        </div>

        {/* Results Section */}
        {refreshTrigger === 0 && !loading && !error ? null : loading ? (
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
}