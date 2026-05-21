import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import Navbar from "../../../shared/landing/Navbar";
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

const CoverLetterHistoryPage = () => {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Modal state
  const [selectedClText, setSelectedClText] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const response = await getCoverLetterHistory();
        if (response.success) {
          setHistory(response.data || []);
        } else {
          setError("Failed to load cover letter history.");
        }
      } catch (err) {
        console.error(err);
        setError("An error occurred while fetching history.");
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, []);

  const openModal = (text) => {
    setSelectedClText(text);
    setIsModalOpen(true);
  };

  const getJobPreview = (jd) => {
    if (!jd) return "Targeted Cover Letter";
    const clean = jd.trim();
    return clean.length > 60 ? clean.substring(0, 60) + "..." : clean;
  };

  return (
    <div className="min-h-screen bg-white dark:bg-[#020817] text-gray-900 dark:text-slate-100 font-sans">
      <Navbar />

      <div className="max-w-5xl mx-auto pt-32 pb-12 px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8 animate-in slide-in-from-bottom-4 duration-500">
          <Link 
            to="/dashboard" 
            className="inline-flex items-center gap-2 text-sm text-blue-500 hover:text-blue-400 mb-4 transition-colors"
          >
            <ArrowLeft size={16} />
            Back to Dashboard
          </Link>
          <h1 className="text-3xl sm:text-4xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-gray-500 dark:from-white dark:to-slate-400">
            Cover Letter History
          </h1>
          <p className="mt-2 text-gray-500 dark:text-slate-400">
            View, manage, and reuse your previously generated AI cover letters.
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
                  onClick={() => openModal(cl.generatedText)}
                  className="w-full sm:w-auto px-6 py-2.5 bg-gray-100 dark:bg-white/5 hover:bg-blue-50 dark:hover:bg-blue-500/10 text-gray-700 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 font-bold rounded-xl border border-gray-200 dark:border-white/5 hover:border-blue-500/20 transition-all flex items-center justify-center gap-2 whitespace-nowrap"
                >
                  View & Reuse
                  <ChevronRight size={16} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <CoverLetterModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        initialText={selectedClText}
      />
    </div>
  );
};

export default CoverLetterHistoryPage;
