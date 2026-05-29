import { useState, useEffect } from "react";
import {
  useToast,
  LoadingState,
  ErrorState,
  PageHeader,
} from "../../../shared/components";
import Navbar from "../../../shared/landing/Navbar";
import AnalysisResult from "../components/AnalysisResult";
import DragDropUpload from "../components/DragDropUpload";
import JobDescriptionInput from "../components/JobDescriptionInput";
import ResumeSkeleton from "../components/ResumeSkeleton";
import { analyzeResume, getLatestResumeAnalysis } from "../services/resumeService";
import { syncRoadmap } from "../../roadmap/services/roadmapService";
import { FileText, Sparkles, RefreshCw, Clock } from "lucide-react";
import { useDocumentTitle } from "../../../hooks/useDocumentTitle";

const ResumeAnalyzerPage = () => {
  useDocumentTitle("Resume Analyzer");
  const { success, error: showError, warning } = useToast();
  const [loading, setLoading] = useState(false);
  const [jobProgress, setJobProgress] = useState({ percent: 0, stage: "queued" });
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [jobDescription, setJobDescription] = useState("");

  // Track whether we are showing a DB-loaded scan (not a fresh live analysis)
  const [isLoadingLatest, setIsLoadingLatest] = useState(true);
  const [isViewingLatest, setIsViewingLatest] = useState(false);
  const [latestScanDate, setLatestScanDate] = useState(null);

  // On mount, attempt to load the student's latest stored analysis
  useEffect(() => {
    let cancelled = false;

    const loadLatest = async () => {
      try {
        const data = await getLatestResumeAnalysis();
        if (cancelled) return;

        if (data) {
          setResult(data);
          setIsViewingLatest(true);
          setLatestScanDate(data.updatedAt || data.createdAt || null);
        }
      } catch {
        // Silently ignore — first-time users have no stored scan
      } finally {
        if (!cancelled) setIsLoadingLatest(false);
      }
    };

    loadLatest();
    return () => { cancelled = true; };
  }, []);

  const handleFileUpload = (file) => {
    setSelectedFile(file);
    setError(null);
  };

  const handleAnalyze = async () => {
    if (!selectedFile) {
      showError("Please upload a resume first.");
      return;
    }

    setLoading(true);
    setJobProgress({ percent: 0, stage: "queued" });
    setError(null);
    try {
      const result = await analyzeResume(selectedFile, jobDescription, {
        onProgress: setJobProgress,
      });
      setResult(result);
      setIsViewingLatest(false); // Fresh live result — hide the "latest scan" banner

      // Sync Roadmap if classification and suggestions exist
      if (result.classification?.level && result.gapAnalysis?.suggestions) {
        const topics = result.gapAnalysis.suggestions
          .map((s) => ({ text: s.text, type: s.type || "learning" }));
        await syncRoadmap(result.classification.level, topics);
      }

      success("Resume analyzed successfully.");
    } catch (err) {
      const msg = err.message || "Failed to analyze resume. Please try again.";
      setError(msg);
      showError(msg);
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const resetAnalyzer = () => {
    setResult(null);
    setSelectedFile(null);
    setError(null);
    setJobDescription("");
    setIsViewingLatest(false);
    warning("Resume analyzer has been reset.");
  };

  const formatScanDate = (dateStr) => {
    if (!dateStr) return "";
    try {
      return new Date(dateStr).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    } catch {
      return "";
    }
  };

  return (
    <div className="min-h-screen bg-white dark:bg-dark-bg text-gray-900 dark:text-text-main font-sans pt-24">
      <Navbar />

      <div className="max-w-4xl mx-auto pt-32 pb-12 px-4 sm:px-6 lg:px-8 space-y-8 animate-slide-up">
        <PageHeader
          title={
            <>
              <span className="text-gradient">Resume</span> Analyzer
            </>
          }
          subtitle="Upload your resume and get instant AI-powered insights to optimize your professional profile for top recruiters."
        />

        {/* Main Content Area */}
        <div className="mt-12 bg-gray-100 dark:bg-surface border border-gray-200 dark:border-border rounded-[2rem] p-8 md:p-12 shadow-2xl relative overflow-hidden">
          {/* Background Decorative Element */}
          <div className="absolute -top-24 -right-24 w-64 h-64 bg-primary/5 rounded-full blur-[100px] pointer-events-none"></div>

          <div className="relative z-10">
            {isLoadingLatest ? (
              <ResumeSkeleton />
            ) : loading ? (
              <div className="space-y-6">
                <ResumeSkeleton />
                <div className="rounded-2xl border border-primary/20 bg-primary/5 p-6">
                  <p className="text-sm font-semibold text-text-main mb-2">
                    Analyzing in background… {jobProgress.percent}%
                  </p>
                  <div className="h-2 w-full rounded-full bg-gray-200 dark:bg-gray-800 overflow-hidden">
                    <div
                      className="h-full bg-primary transition-all duration-500"
                      style={{ width: `${Math.min(jobProgress.percent, 100)}%` }}
                    />
                  </div>
                  <p className="text-xs text-text-muted mt-2 capitalize">
                    {String(jobProgress.stage || "queued").replace(/_/g, " ")}
                  </p>
                </div>
              </div>
            ) : error ? (
              <ErrorState description={error} onRetry={resetAnalyzer} />
            ) : result ? (
              <div className="space-y-6">
                {/* Latest Scan Banner — only shown for DB-loaded results */}
                {isViewingLatest && (
                  <div className="flex items-center justify-between gap-4 px-5 py-3 bg-primary/5 border border-primary/15 rounded-2xl animate-in fade-in slide-in-from-top-2 duration-300">
                    <div className="flex items-center gap-2.5 text-sm text-text-muted">
                      <Clock className="w-4 h-4 text-primary flex-shrink-0" />
                      <span>
                        Viewing your latest scan
                        {latestScanDate && (
                          <span className="font-semibold text-text-main">
                            {" "}· {formatScanDate(latestScanDate)}
                          </span>
                        )}
                      </span>
                    </div>
                    <button
                      id="upload-new-resume-btn"
                      onClick={resetAnalyzer}
                      className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-bold text-primary border border-primary/30 rounded-xl hover:bg-primary/10 hover:border-primary/60 transition-all active:scale-95"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      Upload New Resume
                    </button>
                  </div>
                )}

                <AnalysisResult
                  result={result}
                  file={selectedFile}
                  jobDescription={jobDescription || result.jobDescription || ""}
                  onReset={resetAnalyzer}
                />
              </div>
            ) : (
              <div className="space-y-10">
                {/* Job Description Input */}
                <JobDescriptionInput
                  value={jobDescription}
                  onChange={setJobDescription}
                />

                <div className="h-px bg-gradient-to-r from-transparent via-border to-transparent"></div>

                {/* Resume Upload Section */}
                <div className="space-y-6">
                  <div className="flex items-center gap-2 text-primary">
                    <FileText className="w-5 h-5" />
                    <h3 className="text-lg font-bold">Upload Resume</h3>
                  </div>
                  <DragDropUpload onFileUpload={handleFileUpload} />

                  {/* Post-Upload Actions */}
                  {selectedFile && (
                    <div className="flex flex-col items-center gap-4 py-6 px-8 bg-primary/5 border border-primary/20 rounded-2xl animate-in fade-in zoom-in duration-300">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-primary/10 rounded-lg">
                          <FileText className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-text-main">
                            {selectedFile.name}
                          </p>
                          <p className="text-xs text-text-muted">
                            {(selectedFile.size / 1024).toFixed(1)} KB • Ready
                            for analysis
                          </p>
                        </div>
                      </div>

                      <button
                        id="analyze-resume-btn"
                        onClick={handleAnalyze}
                        disabled={loading}
                        className="w-full sm:w-auto px-8 py-3 bg-primary hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-xl shadow-lg shadow-primary/20 transition-all transform hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-2"
                      >
                        <Sparkles className="w-5 h-5" />
                        Analyze Resume
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer Info */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-12">
          {[
            {
              title: "ATS Check",
              desc: "See how well you bypass Applicant Tracking Systems.",
            },
            {
              title: "Smart Suggestions",
              desc: "Actionable tips to improve your resume impact.",
            },
            {
              title: "Keyword Gap",
              desc: "Identify missing industry-standard technology tags.",
            },
          ].map((item, id) => (
            <div
              key={id}
              className="p-6 bg-gray-100 dark:bg-surface border border-gray-200 dark:border-border rounded-2xl hover:border-primary/30 transition-all group"
            >
              <h4 className="font-heading font-bold text-gray-900 dark:text-text-main mb-2 group-hover:text-primary transition-colors">
                {item.title}
              </h4>
              <p className="text-sm text-text-muted leading-relaxed">
                {item.desc}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ResumeAnalyzerPage;
