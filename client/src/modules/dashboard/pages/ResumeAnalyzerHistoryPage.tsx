
import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import Navbar from "../../../shared/components/Navbar";
import Footer from "../../../shared/components/Footer";

import { getCoverLetterHistory, getAnalysisHistory } from "../services/dashboardService";
import { 
  FileText, 
  Clock, 
  Briefcase, 
  ChevronRight, 
  ArrowLeft,
  Loader2,
  Sparkles,
  TrendingUp,
  Award,
  FileCheck,
  Search
} from "lucide-react";
import CoverLetterModal from "../../../shared/components/CoverLetterModal";
import { generateCoverLetter } from "../../resume-analyzer/services/resumeService";
import { useDocumentTitle } from "../../../hooks/useDocumentTitle";
import { useToast } from "../../../shared/components/toast/ToastProvider";
import { Pagination } from "../../../shared/components";

import logger from "../../../utils/logger";

const ResumeAnalyzerHistoryPage = () => {
  useDocumentTitle("Resume Analyzer History");
  const toast = useToast();
  const navigate = useNavigate();

  // Tabs
  const [activeTab, setActiveTab] = useState("analyses"); // "analyses" | "coverLetters"

  // Cover Letters State
  const [clHistory, setClHistory] = useState([]);
  const [clLoading, setClLoading] = useState(true);
  const [clError, setClError] = useState(null);
  const [clPage, setClPage] = useState(1);
  const [clTotalPages, setClTotalPages] = useState(1);

  // Resume Analyses State
  const [raHistory, setRaHistory] = useState([]);
  const [raLoading, setRaLoading] = useState(true);
  const [raError, setRaError] = useState(null);
  const [raPage, setRaPage] = useState(1);
  const [raTotalPages, setRaTotalPages] = useState(1);
  
  // Modal state
  const [selectedCl, setSelectedCl] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const fetchCoverLetters = async (page = 1) => {
    setClLoading(true);
    try {
      const response = await getCoverLetterHistory(null, page, 10);
      if (response.success) {
        setClHistory(response.data || []);
        if (response.pagination) {
          setClTotalPages(response.pagination.totalPages || 1);
        }
      } else {
        setClError("Failed to load cover letter history.");
      }
    } catch (err: any) {
      logger.error(err);
      setClError("An error occurred while fetching cover letters.");
    } finally {
      setClLoading(false);
    }
  };

  const fetchAnalyses = async (page = 1) => {
    setRaLoading(true);
    try {
      const response = await getAnalysisHistory(null, page, 10);
      if (response.success) {
        setRaHistory(response.data || []);
        if (response.pagination) {
          setRaTotalPages(response.pagination.totalPages || 1);
        }
      } else {
        setRaError("Failed to load resume analysis history.");
      }
    } catch (err: any) {
      logger.error(err);
      setRaError("An error occurred while fetching analyses.");
    } finally {
      setRaLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalyses(raPage);
  }, [raPage]);

  useEffect(() => {
    fetchCoverLetters(clPage);
  }, [clPage]);

  const openModal = (cl) => {
    setSelectedCl(cl);
    setIsModalOpen(true);
  };

  const handleRegenerate = async (tone, language) => {
    if (!selectedCl) return null;
    try {
      const resumeId = typeof selectedCl.resume === 'object' ? selectedCl.resume._id : selectedCl.resume;
      const response = await generateCoverLetter(resumeId, selectedCl.jobDescription, tone, language);
      if (response && response.coverLetter && response.coverLetter.generatedText) {
        // Refresh history to show the newly generated version
        fetchCoverLetters(clPage);
        return response.coverLetter.generatedText;
      }
      throw new Error("Invalid response format from server.");
    } catch (err: any) {
      toast.error("Failed to regenerate: " + err.message);
      return null;
    }
  };

  const getJobPreview = (jd) => {
    if (!jd) return "Targeted Cover Letter";
    const clean = jd.trim();
    return clean.length > 60 ? clean.substring(0, 60) + "..." : clean;
  };

  const renderAnalysesTab = () => {
    if (raLoading) {
      return (
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-blue-500 animate-spin mb-4" />
          <p className="text-slate-400 animate-pulse">Loading resume analyses...</p>
        </div>
      );
    }

    if (raError) {
      return (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-6 rounded-2xl text-center">
          {raError}
        </div>
      );
    }

    if (raHistory.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-20 text-center bg-gray-50 dark:bg-slate-900/30 rounded-3xl border border-gray-200 dark:border-white/5 shadow-xl">
          <div className="w-20 h-20 bg-blue-500/10 rounded-full flex items-center justify-center mb-6">
            <FileCheck className="w-10 h-10 text-blue-400" />
          </div>
          <h3 className="text-2xl font-bold mb-2">No resume analyses yet</h3>
          <p className="text-slate-500 max-w-md mx-auto mb-8">
            Upload and analyze your resume to get insights on your skills and match scores.
          </p>
          <Link 
            to="/resume-analyzer"
            className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl shadow-lg shadow-blue-500/20 transition-all flex items-center gap-2"
          >
            <TrendingUp size={18} />
            Analyze Resume
          </Link>
        </div>
      );
    }

    return (
      <div className="flex flex-col gap-6">
        <div className="grid gap-4 sm:gap-6 animate-in slide-in-from-bottom-8 duration-700">
          {raHistory.map((analysis) => (
            <div 
              key={analysis._id} 
              className="group p-6 bg-white dark:bg-slate-900/50 border border-gray-200 dark:border-white/10 hover:border-blue-500/30 rounded-2xl shadow-sm hover:shadow-xl transition-all flex flex-col sm:flex-row gap-6 sm:items-center justify-between"
            >
              <div className="flex items-start gap-4 flex-1">
                <div className="p-3 bg-purple-500/10 text-purple-500 rounded-xl flex items-center justify-center flex-col">
                  <span className="text-sm font-black">{Math.round(analysis.score)}</span>
                  <span className="text-[10px] uppercase font-bold tracking-wider">Score</span>
                </div>
                <div>
                  <h3 className="font-bold text-lg mb-1 text-gray-900 dark:text-white group-hover:text-blue-400 transition-colors flex items-center gap-2">
                    {analysis.classification || "General Resume"}
                    {analysis.score >= 80 && (
                      <span className="bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400 px-2 py-0.5 rounded-full text-xs font-bold flex items-center gap-1">
                        <Award size={12} /> Top Tier
                      </span>
                    )}
                  </h3>
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-xs font-medium text-gray-500 dark:text-slate-400 mt-1">
                    <span className="flex items-center gap-1.5">
                      <Clock size={14} />
                      {new Date(analysis.createdAt).toLocaleDateString(undefined, {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </span>
                    <span className="hidden sm:inline-block w-1 h-1 rounded-full bg-gray-300 dark:bg-gray-600"></span>
                    <span className="flex items-center gap-1.5">
                      <FileCheck size={14} />
                      {analysis.skills?.length || 0} Skills Detected
                    </span>
                  </div>
                </div>
              </div>
              
              <button
                onClick={() => navigate(`/resume-analyzer/results/${analysis._id}`)}
                className="w-full sm:w-auto px-6 py-2.5 bg-gray-100 dark:bg-white/5 hover:bg-blue-50 dark:hover:bg-blue-500/10 text-gray-700 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 font-bold rounded-xl border border-gray-200 dark:border-white/5 hover:border-blue-500/20 transition-all flex items-center justify-center gap-2 whitespace-nowrap"
              >
                View Report
                <ChevronRight size={16} />
              </button>
            </div>
          ))}
        </div>
        
        {raTotalPages > 1 && (
          <div className="mt-8">
            <Pagination 
              currentPage={raPage} 
              totalPages={raTotalPages} 
              onPageChange={(page) => {
                setRaPage(page);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }} 
            />
          </div>
        )}
      </div>
    );
  };

  const renderCoverLettersTab = () => {
    if (clLoading) {
      return (
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-blue-500 animate-spin mb-4" />
          <p className="text-slate-400 animate-pulse">Loading cover letters...</p>
        </div>
      );
    }

    if (clError) {
      return (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-6 rounded-2xl text-center">
          {clError}
        </div>
      );
    }

    if (clHistory.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-20 text-center bg-gray-50 dark:bg-slate-900/30 rounded-3xl border border-gray-200 dark:border-white/5 shadow-xl">
          <div className="w-20 h-20 bg-blue-500/10 rounded-full flex items-center justify-center mb-6">
            <FileText className="w-10 h-10 text-blue-400" />
          </div>
          <h3 className="text-2xl font-bold mb-2">No cover letters yet</h3>
          <p className="text-slate-500 max-w-md mx-auto mb-8">
            Analyze your resume and provide a target job description to generate your first AI-powered cover letter.
          </p>
          <Link 
            to="/resume-analyzer"
            className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl shadow-lg shadow-blue-500/20 transition-all flex items-center gap-2"
          >
            <FileText size={18} />
            Go to Resume Analyzer
          </Link>
        </div>
      );
    }

    return (
      <div className="flex flex-col gap-6">
        <div className="grid gap-4 sm:gap-6 animate-in slide-in-from-bottom-8 duration-700">
          {clHistory.map((cl) => (
            <div 
              key={cl._id} 
              className="group p-6 bg-white dark:bg-slate-900/50 border border-gray-200 dark:border-white/10 hover:border-blue-500/30 rounded-2xl shadow-sm hover:shadow-xl transition-all flex flex-col sm:flex-row gap-6 sm:items-center justify-between"
            >
              <div className="flex items-start gap-4 flex-1">
                <div className="p-3 bg-blue-500/10 text-blue-500 rounded-xl">
                  <Briefcase size={24} />
                </div>
                <div>
                  <h3 className="font-bold text-lg mb-1 text-gray-900 dark:text-white group-hover:text-blue-400 transition-colors">
                    {getJobPreview(cl.jobDescription)}
                  </h3>
                  <div className="flex items-center gap-4 text-xs font-medium text-gray-500 dark:text-slate-400 mt-1">
                    <span className="flex items-center gap-1.5">
                      <Clock size={14} />
                      {new Date(cl.createdAt).toLocaleDateString(undefined, {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </span>
                  </div>
                </div>
              </div>
              
              <button
                onClick={() => openModal(cl)}
                className="w-full sm:w-auto px-6 py-2.5 bg-gray-100 dark:bg-white/5 hover:bg-blue-50 dark:hover:bg-blue-500/10 text-gray-700 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 font-bold rounded-xl border border-gray-200 dark:border-white/5 hover:border-blue-500/20 transition-all flex items-center justify-center gap-2 whitespace-nowrap"
              >
                View & Reuse
                <ChevronRight size={16} />
              </button>
            </div>
          ))}
        </div>
        
        {clTotalPages > 1 && (
          <div className="mt-8">
            <Pagination 
              currentPage={clPage} 
              totalPages={clTotalPages} 
              onPageChange={(page) => {
                setClPage(page);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }} 
            />
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50/50 dark:bg-[#09090b] text-gray-900 dark:text-text-main font-sans pt-20 flex flex-col overflow-hidden relative">
      <Navbar />

      {/* Background glowing elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute -top-[20%] -left-[10%] w-[50%] h-[50%] rounded-full bg-blue-400/20 dark:bg-blue-900/20 blur-[120px] mix-blend-normal" />
        <div className="absolute top-[20%] -right-[10%] w-[40%] h-[40%] rounded-full bg-purple-400/20 dark:bg-purple-900/20 blur-[120px] mix-blend-normal" />
      </div>

      <main className="container mx-auto px-4 max-w-5xl z-10 flex-grow py-8 relative">
        <div className="w-full relative z-10">
          
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
               <FileText className="w-6 h-6 text-purple-600" />
            </div>
            <div className="hidden md:flex absolute top-8 right-4 xl:right-8 w-14 h-14 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-100 dark:border-emerald-500/20 rounded-2xl items-center justify-center shadow-sm transform rotate-3 hover:rotate-0 transition-transform">
               <TrendingUp className="w-6 h-6 text-emerald-600" />
            </div>

            <div className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-purple-50 dark:bg-purple-500/10 border border-purple-100 dark:border-purple-500/20 shadow-sm text-[11px] font-bold text-purple-600 dark:text-purple-400 mx-auto tracking-wide uppercase">
              <Sparkles size={12} className="text-purple-500" /> ADVANCED AI INTELLIGENCE ACTIVE
            </div>
            
            <h1 className="text-4xl md:text-5xl font-black text-gray-900 dark:text-white tracking-tight">
              <span className="bg-gradient-to-r from-blue-600 via-purple-500 to-teal-400 bg-clip-text text-transparent">Resume Analyzer</span> History
            </h1>
            
            <p className="text-gray-500 dark:text-gray-400 text-[15px] max-w-2xl mx-auto font-medium">
              View, manage, and reuse your previously generated AI cover letters
              <br className="hidden sm:block" /> and resume analyses.
            </p>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex justify-center mb-10 relative z-10">
          <div className="inline-flex items-center p-1 bg-white dark:bg-slate-900/60 border border-gray-200 dark:border-slate-800 rounded-xl backdrop-blur-sm shadow-sm">
            <button
              onClick={() => setActiveTab("analyses")}
              className={`flex items-center gap-2 px-6 py-2.5 text-sm font-bold rounded-lg transition-all ${
                activeTab === "analyses"
                  ? "bg-blue-600 text-white shadow-md shadow-blue-500/20"
                  : "text-gray-500 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-slate-800"
              }`}
            >
              <TrendingUp size={16} />
              Resume Analyses
            </button>
            <button
              onClick={() => setActiveTab("coverLetters")}
              className={`flex items-center gap-2 px-6 py-2.5 text-sm font-bold rounded-lg transition-all ${
                activeTab === "coverLetters"
                  ? "bg-blue-600 text-white shadow-md shadow-blue-500/20"
                  : "text-gray-500 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-slate-800"
              }`}
            >
              <FileText size={16} />
              Cover Letters
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="w-full relative z-10">
          {activeTab === "analyses" ? renderAnalysesTab() : renderCoverLettersTab()}
        </div>
      </main>

      <CoverLetterModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        initialText={selectedCl ? selectedCl.generatedText : ""}
        onRegenerate={handleRegenerate}
      />
      <Footer />
    </div>
  );
};

export default ResumeAnalyzerHistoryPage;
