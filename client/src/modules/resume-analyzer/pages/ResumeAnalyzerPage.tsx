// @ts-nocheck

import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useToast, ErrorState } from "../../../shared/components";
import Navbar from "../../../shared/components/Navbar";
import Footer from "../../../shared/components/Footer";
import AnalysisResultSkeleton from "../components/AnalysisResultSkeleton";


import AnalysisResult from "../components/AnalysisResult";
import DragDropUpload from "../components/DragDropUpload";
import JobDescriptionInput from "../components/JobDescriptionInput";
import ResumeSkeleton from "../components/ResumeSkeleton";
import {
  analyzeResume,
  getLatestResumeAnalysis,
} from "../services/resumeService";
import { syncRoadmap } from "../../roadmap/services/roadmapService";
import {
  AlertCircle,
  Clock,
  FileText,
  Loader2,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  ArrowLeft,
  CheckCircle,
  Target,
  Users,
  TrendingUp
} from "lucide-react";
import { useDocumentTitle } from "../../../hooks/useDocumentTitle";
import ConfirmDialog from "../../../shared/components/ConfirmDialog";
import logger from "../../../utils/logger";

const MAX_UPLOAD_RETRY_ATTEMPTS = 3;
const UPLOAD_TIMEOUT_MS = 30000;
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const isRecoverableUploadError = (err) => {
  const status = Number(err?.status || 0);
  return status === 0 || status >= 500 || /network|timeout/i.test(err?.message || "");
};

const getResumeUploadErrorMessage = (err) => {
  const rawMessage = err?.message || "";
  const status = Number(err?.status || 0);

  if (/timeout/i.test(rawMessage)) {
    return "Resume upload timed out. Your selected file is still available, and you can retry.";
  }

  if (status === 0 || /network/i.test(rawMessage)) {
    return "Network error while uploading your resume. Your selected file is still available, and you can retry.";
  }

  if (status >= 500) {
    return "The resume parser is temporarily unavailable. Your selected file is still available, and you can retry.";
  }

  if (/empty/i.test(rawMessage)) {
    return "The resume appears to be empty or unreadable. Please upload a text-readable PDF or DOCX file.";
  }

  if (/corrupt|invalid pdf|invalid docx|parse|parser|unreadable/i.test(rawMessage)) {
    return "We could not read this resume. It may be corrupted, scanned, or password-protected. Please upload a clean PDF or DOCX file.";
  }

  if (status >= 400) {
    return rawMessage || "The resume was rejected. Please check the file and upload a valid PDF or DOCX.";
  }

  return rawMessage || "Failed to analyze resume. Please try again.";
};

const retryRecoverableUpload = async (operation, onRetry) => {
  let lastError;

  for (let attempt = 1; attempt <= MAX_UPLOAD_RETRY_ATTEMPTS; attempt += 1) {
    let timeoutId;
    try {
      const timeoutPromise = new Promise((_, reject) => {
        timeoutId = window.setTimeout(() => {
          const error = new Error("Upload timeout");
          error.status = 0;
          reject(error);
        }, UPLOAD_TIMEOUT_MS);
      });
      const result = await Promise.race([operation(), timeoutPromise]);
      return result;
    } catch (err) {
      lastError = err;
      if (!isRecoverableUploadError(err) || attempt === MAX_UPLOAD_RETRY_ATTEMPTS) {
        throw err;
      }

      const delay = 600 * 2 ** (attempt - 1);
      onRetry?.(attempt + 1);
      await sleep(delay);
    } finally {
      window.clearTimeout(timeoutId);
    }
  }

  throw lastError;
};

const ResumeAnalyzerPage = () => {
  useDocumentTitle("Resume Analyzer");
  const { success, error: showError, warning } = useToast();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  
  const [selectedFile, setSelectedFile] = useState(null);
  const [jobDescription, setJobDescription] = useState("");
  
  const [showScannedModal, setShowScannedModal] = useState(false);
  const [uploadStatus, setUploadStatus] = useState("idle");
  const [uploadProgressLabel, setUploadProgressLabel] = useState("");
  const [canRetryUpload, setCanRetryUpload] = useState(false);
  const [securityCheckStatus, setSecurityCheckStatus] = useState("not-supported");

  const [isLoadingLatest, setIsLoadingLatest] = useState(false);
  const [isViewingLatest, setIsViewingLatest] = useState(false);
  const [latestScanDate, setLatestScanDate] = useState(null);

  // Removed auto-loading latest on mount so user always starts on the upload dashboard.

  const handleFileUpload = (file) => {
    setSelectedFile(file);
    setError(null);
    setCanRetryUpload(false);
    setUploadStatus("selected");
    setUploadProgressLabel("");
    setSecurityCheckStatus("not-supported");
    
    // Do not automatically submit in this dashboard layout, as they might want to paste a JD.
    success("Resume attached! Click 'Analyze Resume' when ready.");
  };

  const handleAnalyze = async (fileToAnalyze = selectedFile, { isRetry = false } = {}) => {
    if (!fileToAnalyze) {
      showError("Please upload a resume first.");
      return;
    }

    if (loading) return;

    setLoading(true);
    setError(null);
    setCanRetryUpload(false);
    setUploadStatus(isRetry ? "retrying" : "uploading");
    setUploadProgressLabel(isRetry ? "Retrying upload..." : "Uploading resume...");
    try {
      const result = await retryRecoverableUpload(
        () => analyzeResume(fileToAnalyze, jobDescription),
        (attempt) => {
          setUploadStatus("retrying");
          setUploadProgressLabel(
            `Retrying upload (${attempt}/${MAX_UPLOAD_RETRY_ATTEMPTS})...`,
          );
        },
      );
      setUploadStatus("processing");
      setUploadProgressLabel("Processing resume...");
      setResult(result);
      setSecurityCheckStatus(
        result.securityScan?.status ||
          result.securityCheck?.status ||
          "not-supported",
      );
      setIsViewingLatest(false);

      if (result.isScannedPdf) {
        setShowScannedModal(true);
      }

      if (result.classification?.level && result.gapAnalysis?.suggestions) {
        const topics = result.gapAnalysis.suggestions
          .map((s) => ({ text: s.text, type: s.type || "learning" }));
        await syncRoadmap(result.classification.level, topics);
      }

      success("Resume analyzed successfully.");
      setUploadStatus("complete");
      setUploadProgressLabel("");
    } catch (err) {
      const msg = getResumeUploadErrorMessage(err);
      setError(msg);
      setUploadStatus("failed");
      setUploadProgressLabel("");
      setCanRetryUpload(isRecoverableUploadError(err));
      showError(msg);
      logger.error(err);
    } finally {
      setLoading(false);
    }
  };

  const resetAnalyzer = () => {
    setResult(null);
    setSelectedFile(null);
    setJobDescription("");
    setError(null);
    setIsViewingLatest(false);
    setUploadStatus("idle");
    setUploadProgressLabel("");
    setCanRetryUpload(false);
    setSecurityCheckStatus("not-supported");
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
    <div className="min-h-screen bg-gray-50/50 dark:bg-[#09090b] text-gray-900 dark:text-text-main font-sans pt-20 flex flex-col">
      <Navbar />

      <main className="flex-grow flex flex-col items-center justify-start px-4 sm:px-6 lg:px-8 pb-12 animate-fade-in relative overflow-hidden">
        
        {/* Background glow effects matching the image (light blue/purple tint) */}
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

          {/* Hero Section (Globally Visible) */}
          <div className="text-center space-y-4 mb-10 relative">
            {/* Floating Icons (Visible mainly on md+ screens) */}
            <div className="hidden md:flex absolute top-4 left-4 xl:left-8 w-14 h-14 bg-purple-50 dark:bg-purple-500/10 border border-purple-100 dark:border-purple-500/20 rounded-2xl items-center justify-center shadow-sm transform -rotate-3 hover:rotate-0 transition-transform">
               <FileText className="w-6 h-6 text-purple-600" />
            </div>
            <div className="hidden md:flex absolute top-8 right-4 xl:right-8 w-14 h-14 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-100 dark:border-emerald-500/20 rounded-2xl items-center justify-center shadow-sm transform rotate-3 hover:rotate-0 transition-transform">
               <TrendingUp className="w-6 h-6 text-emerald-600" />
            </div>

            <div className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-purple-50 dark:bg-purple-500/10 border border-purple-100 dark:border-purple-500/20 shadow-sm text-[11px] font-bold text-purple-600 dark:text-purple-400 mx-auto tracking-wide uppercase">
              <Sparkles size={12} className="text-purple-500" /> Advanced AI Intelligence Active
            </div>
            
            <h1 className="text-4xl md:text-5xl font-black text-gray-900 dark:text-white tracking-tight">
              <span className="bg-gradient-to-r from-blue-600 via-purple-500 to-teal-400 bg-clip-text text-transparent">Resume</span> Analyzer
            </h1>
            
            <p className="text-gray-500 dark:text-gray-400 text-[15px] max-w-2xl mx-auto font-medium">
              AI-Powered insights to improve your resume, match score,
              <br className="hidden sm:block" /> and stand out to recruiters.
            </p>
          </div>

          {isLoadingLatest ? (
            <ResumeSkeleton />
          ) : loading && !result && !error ? (
            <AnalysisResultSkeleton />
          ) : error && !result ? (
            <div className="w-full max-w-4xl mx-auto space-y-6 mt-12 bg-white dark:bg-[#121214] p-8 md:p-12 rounded-3xl shadow-sm border border-gray-100 dark:border-white/5">
              <div className="flex items-center gap-3 text-red-600 mb-8">
                <AlertCircle className="w-6 h-6" />
                <h2 className="text-xl font-bold">Analysis Failed</h2>
              </div>
              <ErrorState
                description={error}
                onRetry={canRetryUpload ? () => handleAnalyze(selectedFile, { isRetry: true }) : resetAnalyzer}
              />
              {canRetryUpload && selectedFile && (
                <div className="flex flex-col items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-5 text-center dark:border-amber-500/30 dark:bg-amber-500/10">
                  <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
                    Your selected file is still ready: {selectedFile.name}
                  </p>
                  <button
                    type="button"
                    onClick={() => handleAnalyze(selectedFile, { isRetry: true })}
                    disabled={loading}
                    className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-bold text-white transition-all hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <RefreshCw className="h-4 w-4" />
                    Retry upload
                  </button>
                </div>
              )}
            </div>
          ) : result ? (
            <div className="w-full max-w-5xl mx-auto space-y-6 animate-slide-up mt-8 bg-white dark:bg-[#121214] p-8 md:p-12 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgba(0,0,0,0.2)] border border-gray-100 dark:border-white/5">
              {/* Latest Scan Banner */}
              {isViewingLatest && (
                <div className="flex items-center justify-between gap-4 px-5 py-4 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl mb-6">
                  <div className="flex items-center gap-3 text-sm text-text-muted">
                    <div className="p-2 bg-blue-100 dark:bg-blue-500/10 rounded-full">
                      <Clock className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    </div>
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
                    className="flex items-center gap-2 px-5 py-2 text-sm font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-500/10 hover:bg-blue-100 dark:hover:bg-blue-500/20 rounded-xl transition-all active:scale-95"
                  >
                    <RefreshCw className="w-4 h-4" />
                    Upload New
                  </button>
                </div>
              )}

              <AnalysisResult
                result={result}
                file={selectedFile}
                jobDescription={result.jobDescription || ""}
                onReset={resetAnalyzer}
              />
              {securityCheckStatus !== "not-supported" && (
                <div
                  className={`flex items-start gap-3 rounded-2xl border p-4 ${
                    securityCheckStatus === "failed"
                      ? "border-red-200 bg-red-50 text-red-700 dark:border-red-500/30 dark:bg-red-950/20 dark:text-red-300"
                      : "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-950/20 dark:text-emerald-300"
                  }`}
                  role={securityCheckStatus === "failed" ? "alert" : "status"}
                >
                  {securityCheckStatus === "failed" ? (
                    <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0" />
                  ) : (
                    <ShieldCheck className="mt-0.5 h-5 w-5 flex-shrink-0" />
                  )}
                  <div>
                    <p className="text-sm font-bold">
                      Security check {securityCheckStatus}
                    </p>
                    <p className="text-xs opacity-80 mt-1">
                      This status comes from the backend response. Frontend-only virus scanning is not performed.
                    </p>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="w-full flex flex-col items-center animate-fade-in mt-4">
              
              {/* Two Column Layout for Upload & JD */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 w-full mb-10">
                
                {/* Left Card: Upload Resume */}
                <div className="bg-white dark:bg-[#121214] p-6 sm:p-8 rounded-3xl border border-gray-100 dark:border-white/5 shadow-sm flex flex-col">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 bg-indigo-50 dark:bg-indigo-500/10 rounded-xl">
                      <FileText className="w-5 h-5 text-indigo-500" />
                    </div>
                    <div>
                      <h3 className="text-[15px] font-bold text-gray-900 dark:text-white">
                        Upload Resume
                      </h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                        Upload your latest resume (PDF, DOC, DOCX)
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex-grow">
                    <DragDropUpload
                      onFileUpload={handleFileUpload}
                      disabled={loading}
                      isUploading={loading}
                      uploadProgressLabel={uploadProgressLabel}
                    />
                  </div>
                  
                  {selectedFile && !loading && (
                    <div className="mt-4 p-3 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-100 dark:border-emerald-500/20 rounded-xl flex justify-between items-center text-sm font-semibold text-emerald-700 dark:text-emerald-400">
                      <span className="truncate">{selectedFile.name}</span>
                      <button 
                        onClick={() => setSelectedFile(null)}
                        className="text-emerald-600 hover:text-emerald-800 dark:hover:text-emerald-300 underline"
                      >
                        Change
                      </button>
                    </div>
                  )}
                </div>

                {/* Right Card: Job Description */}
                <div className="bg-white dark:bg-[#121214] p-6 sm:p-8 rounded-3xl border border-gray-100 dark:border-white/5 shadow-sm flex flex-col">
                  <JobDescriptionInput 
                    value={jobDescription} 
                    onChange={setJobDescription} 
                  />
                </div>
                
              </div>

              {/* Action Button */}
              <div className="w-full max-w-lg mx-auto flex flex-col items-center">
                <button
                  onClick={() => handleAnalyze(selectedFile)}
                  disabled={loading || !selectedFile}
                  className="w-full flex items-center justify-center gap-2 py-4 rounded-xl font-bold text-white shadow-lg transition-all duration-300 disabled:opacity-60 disabled:cursor-not-allowed
                  bg-gradient-to-r from-indigo-600 to-teal-500 hover:from-indigo-500 hover:to-teal-400 hover:shadow-indigo-500/25 active:scale-[0.98]"
                >
                  {loading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      <Sparkles className="w-5 h-5" />
                      Analyze Resume
                      <ArrowLeft className="w-5 h-5 rotate-180" />
                    </>
                  )}
                </button>
                <div className="flex items-center gap-1.5 mt-3 text-xs font-semibold text-gray-500 dark:text-gray-400">
                  <ShieldCheck size={14} /> Your data is secure and never shared.
                </div>
              </div>

              {/* Bottom Features Highlights Bar */}
              <div className="w-full bg-white dark:bg-[#121214] mt-16 p-6 rounded-3xl border border-gray-100 dark:border-white/5 shadow-sm">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-0 lg:divide-x divide-gray-100 dark:divide-gray-800">
                  
                  <div className="flex items-start gap-4 lg:px-6">
                    <div className="p-3 bg-indigo-50 dark:bg-indigo-500/10 rounded-2xl shrink-0">
                      <Target className="w-6 h-6 text-indigo-500" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-gray-900 dark:text-white">ATS Score</h4>
                      <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mt-1">Check how well your resume passes ATS systems.</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4 lg:px-6">
                    <div className="p-3 bg-emerald-50 dark:bg-emerald-500/10 rounded-2xl shrink-0">
                      <CheckCircle className="w-6 h-6 text-emerald-500" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-gray-900 dark:text-white">Smart Suggestions</h4>
                      <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mt-1">Get AI-powered tips to improve your resume.</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4 lg:px-6">
                    <div className="p-3 bg-pink-50 dark:bg-pink-500/10 rounded-2xl shrink-0">
                      <FileText className="w-6 h-6 text-pink-500" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-gray-900 dark:text-white">Skill Gap Analysis</h4>
                      <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mt-1">Identify missing skills and strengthen your profile.</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4 lg:px-6">
                    <div className="p-3 bg-amber-50 dark:bg-amber-500/10 rounded-2xl shrink-0">
                      <Users className="w-6 h-6 text-amber-500" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-gray-900 dark:text-white">Recruiter Insights</h4>
                      <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mt-1">See your resume through a recruiter's eyes.</p>
                    </div>
                  </div>

                </div>
              </div>

            </div>
          )}
        </div>
      </main>

      <ConfirmDialog
        isOpen={showScannedModal}
        title="Scanned Resume Detected"
        message="We detected very little readable text in your resume. It appears to be a scanned document or an image. For the best AI matching and feedback, please upload a text-selectable PDF, DOCX, or TXT file."
        confirmText="Upload Another"
        cancelText="View Results Anyway"
        variant="warning"
        onConfirm={() => {
          setShowScannedModal(false);
          resetAnalyzer();
        }}
        onCancel={() => {
          setShowScannedModal(false);
        }}
      />
      <Footer />
    </div>
  );
};

export default ResumeAnalyzerPage;
