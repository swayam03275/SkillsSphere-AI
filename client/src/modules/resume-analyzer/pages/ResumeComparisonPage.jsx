import React, { useState, useEffect } from "react";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import Navbar from "../../../shared/components/Navbar";
import Footer from "../../../shared/components/Footer";
import { compareResumes } from "../services/resumeService";
import { useDocumentTitle } from "../../../hooks/useDocumentTitle";
import { useToast } from "../../../shared/components/toast/ToastProvider";
import { 
  ArrowLeft, 
  Sparkles, 
  TrendingUp, 
  TrendingDown, 
  Minus, 
  Award, 
  FileCheck, 
  Zap, 
  AlertCircle, 
  CheckCircle2, 
  Loader2, 
  Clock 
} from "lucide-react";
import logger from "../../../utils/logger";

const ResumeComparisonPage = () => {
  useDocumentTitle("Resume Comparison & Diff");
  const toast = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const id1 = searchParams.get("id1");
  const id2 = searchParams.get("id2");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [compareData, setCompareData] = useState(null);

  useEffect(() => {
    const fetchComparison = async () => {
      if (!id1 || !id2) {
        setError("Two analysis version IDs are required for comparison.");
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);
      try {
        const data = await compareResumes(id1, id2);
        setCompareData(data);
      } catch (err) {
        logger.error(err);
        setError(err.message || "Failed to load version comparison.");
        toast.error("Error loading comparison: " + (err.message || "Unknown error"));
      } finally {
        setLoading(false);
      }
    };

    fetchComparison();
  }, [id1, id2]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50/50 dark:bg-[#09090b] text-gray-900 dark:text-text-main font-sans pt-20 flex flex-col relative overflow-hidden">
        <Navbar />
        <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
          <div className="absolute -top-[20%] -left-[10%] w-[50%] h-[50%] rounded-full bg-blue-400/10 dark:bg-blue-900/10 blur-[120px]" />
        </div>
        <main className="container mx-auto px-4 max-w-5xl z-10 flex-grow py-8 relative flex flex-col items-center justify-center">
          <Loader2 className="w-10 h-10 text-blue-500 animate-spin mb-4" />
          <p className="text-slate-400 animate-pulse font-medium">Generating version diff and insights...</p>
        </main>
        <Footer />
      </div>
    );
  }

  if (error || !compareData) {
    return (
      <div className="min-h-screen bg-gray-50/50 dark:bg-[#09090b] text-gray-900 dark:text-text-main font-sans pt-20 flex flex-col relative overflow-hidden">
        <Navbar />
        <main className="container mx-auto px-4 max-w-xl z-10 flex-grow py-20 relative text-center">
          <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
            <AlertCircle className="w-8 h-8 text-red-500" />
          </div>
          <h2 className="text-2xl font-bold mb-2">Comparison Failed</h2>
          <p className="text-slate-500 dark:text-slate-400 mb-8">{error || "Could not retrieve comparison data."}</p>
          <Link 
            to="/resume-history"
            className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl shadow-lg transition-all"
          >
            <ArrowLeft size={16} />
            Back to History
          </Link>
        </main>
        <Footer />
      </div>
    );
  }

  const { v1, v2, insights } = compareData;
  const score1 = Math.round(v1.score || 0);
  const score2 = Math.round(v2.score || 0);
  const scoreDiff = score2 - score1;

  // Compute Skill Diff
  const oldSkills = v1.skills || [];
  const newSkills = v2.skills || [];
  const addedSkills = newSkills.filter(s => !oldSkills.includes(s));
  const removedSkills = oldSkills.filter(s => !newSkills.includes(s));
  const commonSkills = newSkills.filter(s => oldSkills.includes(s));

  // Compute Gaps Diff
  const oldGaps = v1.missingSkills || [];
  const newGaps = v2.missingSkills || [];
  const resolvedGaps = oldGaps.filter(g => !newGaps.includes(g));
  const remainingGaps = newGaps;

  return (
    <div className="min-h-screen bg-gray-50/50 dark:bg-[#09090b] text-gray-900 dark:text-text-main font-sans pt-20 flex flex-col overflow-hidden relative">
      <Navbar />

      {/* Background glowing elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute -top-[20%] -left-[10%] w-[50%] h-[50%] rounded-full bg-blue-400/20 dark:bg-blue-900/20 blur-[120px] mix-blend-normal" />
        <div className="absolute top-[20%] -right-[10%] w-[40%] h-[40%] rounded-full bg-purple-400/20 dark:bg-purple-900/20 blur-[120px] mix-blend-normal" />
      </div>

      <main className="container mx-auto px-4 max-w-5xl z-10 flex-grow py-8 relative">
        {/* Back Link */}
        <div className="py-6">
          <Link 
            to="/resume-history" 
            className="inline-flex items-center gap-2 text-sm font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors"
          >
            <ArrowLeft size={16} />
            Back to Version History
          </Link>
        </div>

        {/* Hero Banner */}
        <div className="text-center space-y-4 mb-10 relative">
          <div className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-purple-50 dark:bg-purple-500/10 border border-purple-100 dark:border-purple-500/20 shadow-sm text-[11px] font-bold text-purple-600 dark:text-purple-400 mx-auto tracking-wide uppercase">
            <Sparkles size={12} className="text-purple-500" /> Version Difference Matrix Active
          </div>
          <h1 className="text-4xl md:text-5xl font-black text-gray-900 dark:text-white tracking-tight">
            Resume <span className="bg-gradient-to-r from-blue-600 via-purple-500 to-teal-400 bg-clip-text text-transparent">Comparison</span>
          </h1>
          <p className="text-gray-500 dark:text-gray-400 text-[15px] max-w-2xl mx-auto font-medium">
            Analyze the delta progress between your previous scans and watch your skills improve.
          </p>
        </div>

        {/* Top Delta Section */}
        <div className="bg-white dark:bg-[#121214] border border-gray-100 dark:border-white/5 rounded-3xl p-8 shadow-sm flex flex-col md:flex-row items-center justify-between gap-8 mb-8">
          <div className="flex-1 space-y-2 text-center md:text-left">
            <h3 className="text-lg font-black text-gray-900 dark:text-white">Overall Progress Score</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">
              Comparing your older baseline score to the latest analyzer metrics.
            </p>
          </div>
          
          <div className="flex items-center gap-6 shrink-0">
            {/* Visual delta indicator */}
            <div className="flex items-center gap-4">
              <div className="text-center">
                <span className="block text-[10px] font-black uppercase text-gray-400 tracking-wider">Base</span>
                <span className="text-2xl font-black text-gray-600 dark:text-slate-400">{score1}%</span>
              </div>
              
              <div className="h-8 w-px bg-gray-200 dark:bg-slate-800" />
              
              <div className="text-center">
                <span className="block text-[10px] font-black uppercase text-gray-400 tracking-wider">Latest</span>
                <span className="text-2xl font-black text-gray-900 dark:text-white">{score2}%</span>
              </div>
            </div>

            <div className={`p-4 rounded-2xl flex flex-col items-center justify-center w-24 h-24 border ${
              scoreDiff > 0 
                ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-500" 
                : scoreDiff < 0 
                  ? "bg-red-500/10 border-red-500/20 text-red-500" 
                  : "bg-gray-500/10 border-gray-500/20 text-gray-500"
            }`}>
              {scoreDiff > 0 ? (
                <TrendingUp size={24} className="mb-1" />
              ) : scoreDiff < 0 ? (
                <TrendingDown size={24} className="mb-1" />
              ) : (
                <Minus size={24} className="mb-1" />
              )}
              <span className="text-lg font-black">
                {scoreDiff > 0 ? `+${scoreDiff}` : scoreDiff}%
              </span>
              <span className="text-[9px] font-black uppercase tracking-wider">Delta</span>
            </div>
          </div>
        </div>

        {/* Side-by-side Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* Version A Card */}
          <div className="bg-white dark:bg-[#121214] border border-gray-100 dark:border-white/5 rounded-3xl p-6 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 left-0 w-2 h-full bg-slate-400 dark:bg-slate-700" />
            <div className="space-y-4 pl-4">
              <span className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Version A (Baseline)</span>
              <div>
                <h4 className="text-xl font-bold text-gray-900 dark:text-white capitalize">
                  {v1.classification || "General Resume"}
                </h4>
                <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-slate-400 mt-1">
                  <Clock size={12} />
                  <span>{new Date(v1.createdAt).toLocaleDateString(undefined, {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric'
                  })}</span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-100 dark:border-white/5">
                <div>
                  <span className="block text-[10px] text-gray-400 font-bold uppercase">ATS Score</span>
                  <span className="text-lg font-black text-gray-700 dark:text-slate-300">{score1}%</span>
                </div>
                <div>
                  <span className="block text-[10px] text-gray-400 font-bold uppercase">Total Skills</span>
                  <span className="text-lg font-black text-gray-700 dark:text-slate-300">{oldSkills.length} Detected</span>
                </div>
              </div>
            </div>
          </div>

          {/* Version B Card */}
          <div className="bg-white dark:bg-[#121214] border border-gray-100 dark:border-white/5 rounded-3xl p-6 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 left-0 w-2 h-full bg-blue-500" />
            <div className="space-y-4 pl-4">
              <span className="text-[10px] font-black uppercase text-blue-500 tracking-widest">Version B (Latest)</span>
              <div>
                <h4 className="text-xl font-bold text-gray-900 dark:text-white capitalize">
                  {v2.classification || "General Resume"}
                </h4>
                <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-slate-400 mt-1">
                  <Clock size={12} />
                  <span>{new Date(v2.createdAt).toLocaleDateString(undefined, {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric'
                  })}</span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-100 dark:border-white/5">
                <div>
                  <span className="block text-[10px] text-gray-400 font-bold uppercase">ATS Score</span>
                  <span className="text-lg font-black text-blue-500">{score2}%</span>
                </div>
                <div>
                  <span className="block text-[10px] text-gray-400 font-bold uppercase">Total Skills</span>
                  <span className="text-lg font-black text-blue-500">{newSkills.length} Detected</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* AI Strategic Insights */}
        <div className="bg-white dark:bg-[#121214] border border-gray-100 dark:border-white/5 rounded-3xl p-8 shadow-sm mb-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-indigo-50 dark:bg-indigo-500/10 rounded-xl">
              <Sparkles className="w-5 h-5 text-indigo-500" />
            </div>
            <h3 className="text-[15px] font-bold text-gray-900 dark:text-white">AI Strategic Insights</h3>
          </div>
          <div className="p-5 bg-indigo-500/[0.03] border border-indigo-500/10 rounded-2xl">
            <p className="text-sm font-medium text-gray-700 dark:text-slate-300 leading-relaxed">
              {insights}
            </p>
          </div>
        </div>

        {/* Skills Changes Diff Venn-like */}
        <div className="bg-white dark:bg-[#121214] border border-gray-100 dark:border-white/5 rounded-3xl p-8 shadow-sm mb-8">
          <div className="flex items-center gap-3 mb-8">
            <div className="p-2 bg-emerald-50 dark:bg-emerald-500/10 rounded-xl">
              <FileCheck className="w-5 h-5 text-emerald-500" />
            </div>
            <h3 className="text-[15px] font-bold text-gray-900 dark:text-white">Technical Skills Diff</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Added Skills */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-emerald-500">
                <CheckCircle2 size={16} />
                <span className="text-xs font-black uppercase tracking-widest">Added Skills ({addedSkills.length})</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {addedSkills.length > 0 ? (
                  addedSkills.map((skill, i) => (
                    <span key={i} className="px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-[10px] font-bold rounded-xl">
                      {skill}
                    </span>
                  ))
                ) : (
                  <span className="text-xs text-gray-400 italic font-medium">No new skills added in this version.</span>
                )}
              </div>
            </div>

            {/* Common Skills */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-blue-500">
                <Award size={16} />
                <span className="text-xs font-black uppercase tracking-widest">Common Skills ({commonSkills.length})</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {commonSkills.length > 0 ? (
                  commonSkills.slice(0, 15).map((skill, i) => (
                    <span key={i} className="px-3 py-1.5 bg-blue-500/10 border border-blue-500/20 text-blue-500 text-[10px] font-bold rounded-xl">
                      {skill}
                    </span>
                  ))
                ) : (
                  <span className="text-xs text-gray-400 italic font-medium">No overlapping skills found.</span>
                )}
                {commonSkills.length > 15 && (
                  <span className="text-[10px] text-gray-400 font-bold self-center">
                    +{commonSkills.length - 15} more
                  </span>
                )}
              </div>
            </div>

            {/* Removed Skills */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-slate-400">
                <Minus size={16} />
                <span className="text-xs font-black uppercase tracking-widest">Removed Skills ({removedSkills.length})</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {removedSkills.length > 0 ? (
                  removedSkills.map((skill, i) => (
                    <span key={i} className="px-3 py-1.5 bg-gray-500/10 border border-gray-500/20 text-slate-400 text-[10px] font-bold rounded-xl">
                      {skill}
                    </span>
                  ))
                ) : (
                  <span className="text-xs text-gray-400 italic font-medium">No skills removed.</span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Skill Gap Analytics */}
        <div className="bg-white dark:bg-[#121214] border border-gray-100 dark:border-white/5 rounded-3xl p-8 shadow-sm mb-8">
          <div className="flex items-center gap-3 mb-8">
            <div className="p-2 bg-purple-50 dark:bg-purple-500/10 rounded-xl">
              <Zap className="w-5 h-5 text-purple-500" />
            </div>
            <h3 className="text-[15px] font-bold text-gray-900 dark:text-white">Gap Analytics & Resolution</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Gaps Resolved */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-emerald-500">
                <CheckCircle2 size={16} />
                <span className="text-xs font-black uppercase tracking-widest">Resolved Gaps ({resolvedGaps.length})</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {resolvedGaps.length > 0 ? (
                  resolvedGaps.map((gap, i) => (
                    <span key={i} className="px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-[10px] font-bold rounded-xl">
                      {gap}
                    </span>
                  ))
                ) : (
                  <span className="text-xs text-gray-400 italic font-medium">No gaps were resolved in this version.</span>
                )}
              </div>
            </div>

            {/* Remaining Gaps */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-red-400">
                <AlertCircle size={16} />
                <span className="text-xs font-black uppercase tracking-widest">Remaining Gaps ({remainingGaps.length})</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {remainingGaps.length > 0 ? (
                  remainingGaps.map((gap, i) => (
                    <span key={i} className="px-3 py-1.5 bg-red-500/10 border border-red-500/20 text-red-400 text-[10px] font-bold rounded-xl">
                      {gap}
                    </span>
                  ))
                ) : (
                  <span className="text-xs text-emerald-500 italic font-bold">Awesome! No remaining skill gaps detected.</span>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default ResumeComparisonPage;
