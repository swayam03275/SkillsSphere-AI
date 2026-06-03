import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import Navbar from "../../../shared/components/Navbar";
import Footer from "../../../shared/components/Footer";

import { getCoverLetterHistory } from "../services/dashboardService";
import { 
  FileText, 
  Clock, 
  Briefcase, 
  ChevronRight, 
  ArrowLeft,
  Loader2 
} from "lucide-react";
import CoverLetterModal from "../../../shared/components/CoverLetterModal";
import { generateCoverLetter } from "../../resume-analyzer/services/resumeService";
import { useDocumentTitle } from "../../../hooks/useDocumentTitle";
import { useToast } from "../../../shared/components/toast/ToastProvider";


import logger from "../../../utils/logger";

const ResumeAnalyzerHistoryPage = () => {
  useDocumentTitle("Resume Analyzer History");
  const toast = useToast();
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Modal state
  const [selectedCl, setSelectedCl] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const fetchHistory = async () => {
    try {
      const response = await getCoverLetterHistory();
      if (response.success) {
        setHistory(response.data || []);
      } else {
        setError("Failed to load cover letter history.");
      }
    } catch (err) {
      logger.error(err);
      setError("An error occurred while fetching history.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

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
        fetchHistory();
        return response.coverLetter.generatedText;
      }
      throw new Error("Invalid response format from server.");
    } catch (err) {
      toast.error("Failed to regenerate: " + err.message);
      return null;
    }
  };

  const getJobPreview = (jd) => {
    if (!jd) return "Targeted Cover Letter";
    const clean = jd.trim();
    return clean.length > 60 ? clean.substring(0, 60) + "..." : clean;
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
        {/* Header */}
        <div className="mb-8 animate-in slide-in-from-bottom-4 duration-500">
          <Link 
            to="/dashboard" 
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/50 dark:bg-white/5 border border-gray-200 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-white/10 text-sm font-medium text-gray-600 dark:text-slate-300 hover:text-gray-900 dark:hover:text-white transition-all backdrop-blur-md shadow-sm mb-8"
          >
            <ArrowLeft size={16} />
            Back to Dashboard
          </Link>
          <h1 className="text-4xl md:text-5xl font-black text-gray-900 dark:text-white tracking-tight">
            Resume Analyzer <span className="bg-gradient-to-r from-blue-600 via-purple-500 to-teal-400 bg-clip-text text-transparent">History</span>
          </h1>
          <p className="mt-2 text-gray-600 dark:text-slate-400 text-lg">
            View, manage, and reuse your previously generated AI cover letters and resume analyses.
          </p>
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-blue-500 animate-spin mb-4" />
            <p className="text-slate-400 animate-pulse">Loading history...</p>
          </div>
        ) : error ? (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-6 rounded-2xl text-center">
            {error}
          </div>
        ) : history.length === 0 ? (
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
        ) : (
          <div className="grid gap-4 sm:gap-6 animate-in slide-in-from-bottom-8 duration-700">
            {history.map((cl) => (
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
                    <div className="flex items-center gap-4 text-xs font-medium text-gray-500 dark:text-slate-400">
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
        )}
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
