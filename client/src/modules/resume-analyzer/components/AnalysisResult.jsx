import {
  AlertCircle,
  CheckCircle2,
  ChevronRight,
  Download,
  Eye,
  FileText,
  Sparkles,
  Zap,
  ShieldCheck,
  ExternalLink,
  Layout,
  MessageSquare,
  Globe,
  PenTool,
  Loader2
} from "lucide-react";
import { useEffect, useState } from "react";
import Button from "../../../shared/landing/Button";
import SkillGapVenn from "./SkillGapVenn";
import CoverLetterModal from "../../../shared/components/CoverLetterModal";
import { generateCoverLetter } from "../services/resumeService";

const AnalysisResult = ({ result, file, jobDescription, onReset }) => {
  const score = result?.score || 0;
  const isJDProvided = result.isJDProvided;
  const suggestions = (result.gapAnalysis?.suggestions || []).slice(0, 8);

  const [previewUrl, setPreviewUrl] = useState(null);
  
  // Cover Letter States
  const [isGeneratingCL, setIsGeneratingCL] = useState(false);
  const [clModalOpen, setClModalOpen] = useState(false);
  const [clText, setClText] = useState("");
  const [clError, setClError] = useState("");

  useEffect(() => {
    if (
      file &&
      (file.type === "application/pdf" ||
        file.name.toLowerCase().endsWith(".pdf"))
    ) {
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
      return () => URL.revokeObjectURL(url);
    }
  }, [file]);

  const getScoreColor = (s) => {
    if (s >= 80) return "text-secondary";
    if (s >= 50) return "text-yellow-400";
    return "text-red-400";
  };

  // --- ATS Checklist Logic ---
  const atsData = result.atsOptimization || {};
  const checklist = [
    { label: "Experience Section", status: atsData.details?.sectionResults?.experience, reason: "Missing clear experience headers or work history" },
    { label: "Education Section", status: atsData.details?.sectionResults?.education, reason: "Missing education section or degree information" },
    { label: "Skills Section", status: atsData.details?.sectionResults?.skills, reason: "No extractable skills section found" },
    { label: "Summary / Objective", status: atsData.details?.sectionResults?.summary, reason: "Missing summary, profile, or objective section" },
    { label: "Contact: Email", status: atsData.details?.contactResults?.email, reason: "Missing valid email address" },
    { label: "Contact: Phone", status: atsData.details?.contactResults?.phone, reason: "Missing phone number" },
    { label: "Contact: LinkedIn", status: atsData.details?.contactResults?.linkedin, reason: "Missing LinkedIn profile link" },
    { label: "Contact: GitHub", status: atsData.details?.contactResults?.github, reason: "Missing GitHub profile link" },
    { label: "Portfolio Link", status: atsData.details?.contactResults?.portfolio, reason: "Missing portfolio or personal website link" },
  ];

  // --- Missing Tech Keywords (from techStandard evaluator) ---
  const techData = result.techStandard?.details?.domainMissing || {};
  const missingTechKeywords = Object.entries(techData)
    .filter(([, keywords]) => keywords.length > 0)
    .flatMap(([domain, keywords]) =>
      keywords.slice(0, 3).map(kw => ({ keyword: kw, domain }))
    )
    .slice(0, 12);

  // --- Action Words ---
  const actionWords = result.readabilityMatch?.relevantVerbs || ["Spearheaded", "Orchestrated", "Transformed", "Optimized", "Architected", "Launched", "Pioneered", "Revitalized"];

  const handleGenerateCoverLetter = async () => {
    try {
      if (!jobDescription || !jobDescription.trim()) {
        throw new Error("A Job Description is required to generate a targeted Cover Letter. Please reset and paste one in.");
      }

      setIsGeneratingCL(true);
      setClError("");
      
      const response = await generateCoverLetter(result.resumeId, jobDescription);
      
      if (response && response.coverLetter && response.coverLetter.generatedText) {
        setClText(response.coverLetter.generatedText);
        setClModalOpen(true);
      } else {
        throw new Error("Invalid response format from server.");
      }
    } catch (err) {
      setClError(err.message || "Failed to generate cover letter.");
      // Auto clear error after 5 seconds
      setTimeout(() => setClError(""), 5000);
    } finally {
      setIsGeneratingCL(false);
    }
  };

  return (
    <div className="w-full space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Top Banner */}
      <div className="flex justify-center">
        <div className="flex items-center gap-2 px-5 py-2 bg-primary/10 border border-primary/20 rounded-full shadow-lg backdrop-blur-md">
          <Zap className="w-4 h-4 text-primary" />
          <p className="text-xs font-bold text-primary tracking-wide uppercase">
            Advanced AI Intelligence Active
          </p>
        </div>
      </div>

      {/* Main Score & Metrics Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Trust Score */}
        <div className="lg:col-span-1 bg-surface border border-border rounded-[2rem] p-8 flex flex-col items-center justify-center relative overflow-hidden group shadow-2xl">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-50"></div>
          <div className="relative z-10 text-center">
             <div className="p-3 bg-primary/10 rounded-2xl text-primary inline-block mb-4 border border-primary/20">
              <Sparkles className="w-8 h-8" />
            </div>
            <h2 className="text-sm font-black uppercase tracking-[0.2em] text-text-muted mb-2">Trust Score</h2>
            <div className={`text-7xl font-black tracking-tighter ${getScoreColor(score)}`}>
              {score}%
            </div>
            
            {/* Classification Level and Insights */}
            {result.classification && (
              <div className="mt-4 space-y-2">
                <div className={`inline-block px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest bg-dark-bg border border-border shadow-sm ${getScoreColor(score)}`}>
                  {typeof result.classification === 'object' ? result.classification.level : result.classification}
                </div>
                {typeof result.classification === 'object' && result.classification.label && (
                  <p className="text-[10px] text-text-muted font-bold px-2 leading-relaxed italic">
                    {result.classification.label}
                  </p>
                )}
              </div>
            )}

            <p className="text-xs text-text-muted mt-4 font-bold max-w-[150px]">
              {result.mode === "benchmark" 
                ? "Market Readiness Benchmark" 
                : isJDProvided 
                ? "Optimized for Job Description" 
                : "General Quality Baseline"}
            </p>

            {result.mode === "benchmark" && (
              <div className="mt-4 flex items-center gap-1.5 px-3 py-1 bg-primary/10 border border-primary/20 rounded-full">
                <Sparkles size={10} className="text-primary" />
                <span className="text-[8px] font-black uppercase tracking-widest text-primary">Benchmark Active</span>
              </div>
            )}

          </div>
        </div>

        {/* Impact Score Widget */}
        <div className="bg-surface border border-border rounded-[2rem] p-8 relative overflow-hidden group shadow-xl">
           <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-yellow-400/10 rounded-lg">
                  <Zap className="w-5 h-5 text-yellow-400" />
                </div>
                <h3 className="font-bold text-text-main">Impact Level</h3>
              </div>
              <span className={`text-2xl font-black ${getScoreColor(result.impactMatch?.score)}`}>
                {result.impactMatch?.score}%
              </span>
           </div>
           <div className="space-y-4">
              <div className="h-2 bg-dark-bg rounded-full overflow-hidden">
                <div 
                  className="h-full bg-yellow-400 transition-all duration-1000" 
                  style={{ width: `${result.impactMatch?.score}%` }}
                ></div>
              </div>
              <p className="text-xs text-text-muted leading-relaxed">
                Found <strong>{result.impactMatch?.totalFindings || 0}</strong> quantifiable metrics. {result.impactMatch?.feedback?.[0]}
              </p>
           </div>
        </div>

        {/* ATS Readiness Checklist */}
        <div className="bg-surface border border-border rounded-[2rem] p-8 shadow-xl">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-secondary/10 rounded-lg">
              <ShieldCheck className="w-5 h-5 text-secondary" />
            </div>
            <h3 className="font-bold text-text-main">ATS Readiness</h3>
          </div>
          <div className="grid grid-cols-2 gap-x-6 gap-y-3">
            {checklist.map((item, i) => (
              <div key={i} className="flex items-center gap-2">
                {item.status ? (
                  <CheckCircle2 className="w-4 h-4 text-secondary flex-shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                )}
                <span className={`text-xs font-medium ${item.status ? "text-text-muted" : "text-red-400"}`}>
                  {item.label}
                </span>
              </div>
            ))}
          </div>

          {/* 🔗 Verified Links Section */}
          {result.verifiedLinks && result.verifiedLinks.length > 0 && (
            <div className="mt-8 pt-8 border-t border-border/50">
              <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-text-muted mb-4">Verified Profiles</h3>
              <div className="space-y-3">
                {result.verifiedLinks.map((link, i) => (
                  <div key={i} className="flex items-center justify-between gap-4 p-3 bg-dark-bg/40 border border-border rounded-2xl group hover:border-primary/40 transition-all shadow-sm">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`p-2 rounded-xl shrink-0 ${link.isValid ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
                        <Globe size={14} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[10px] font-bold text-text-main truncate pr-2" title={link.url}>
                          {link.url.replace(/^https?:\/\/(www\.)?/, '')}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                       {link.isValid ? (
                         <div className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-lg shadow-sm">
                            <ShieldCheck size={10} className="text-emerald-400" />
                            <span className="text-[8px] font-black uppercase tracking-tight text-emerald-400">Verified</span>
                         </div>
                       ) : (
                         <div className="flex items-center gap-1.5 px-2.5 py-1 bg-red-500/10 border border-red-500/20 rounded-lg shadow-sm">
                            <AlertCircle size={10} className="text-red-400" />
                            <span className="text-[8px] font-black uppercase tracking-tight text-red-400">Dead Link</span>
                         </div>
                       )}
                       <a href={link.url} target="_blank" rel="noreferrer" className="p-2 hover:bg-white/10 rounded-xl text-text-muted hover:text-primary transition-all">
                         <ExternalLink size={12} />
                       </a>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Visual Skill Gap Venn Diagram */}
      <SkillGapVenn 
        skillMatch={result.skillMatch} 
        isJDProvided={isJDProvided} 
        mode={result.mode}
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Suggestions & Keywords */}
        <div className="lg:col-span-7 space-y-8">
          {/* Action Word Suggestions Cloud (Dynamic) */}
          <div className="bg-surface/50 border border-border rounded-[2rem] p-8 shadow-xl">
            <div className="flex items-center gap-3 mb-6">
               <div className="p-2 bg-primary/10 rounded-lg">
                  <MessageSquare className="w-5 h-5 text-primary" />
                </div>
                <h3 className="text-lg font-bold">Suggested Power Verbs</h3>
            </div>
            <div className="flex flex-wrap gap-2">
              {actionWords.map((word, i) => (
                <span key={i} className="px-3 py-1.5 bg-dark-bg border border-border hover:border-primary/50 text-[10px] font-black uppercase tracking-widest text-text-muted rounded-lg transition-all hover:text-primary cursor-default">
                  {word}
                </span>
              ))}
            </div>
          </div>

          {/* Strategic Improvements Section */}
          <div className="bg-surface/50 border border-border rounded-[2rem] p-8 shadow-xl">
            <div className="flex items-center gap-3 mb-8">
              <div className="p-2 bg-secondary/10 rounded-lg">
                <Layout className="w-6 h-6 text-secondary" />
              </div>
              <h3 className="text-xl font-heading font-bold text-text-main">
                Strategic Improvements
              </h3>
            </div>
            <div className="max-h-[400px] overflow-y-auto pr-4 custom-scrollbar">
              <ul className="space-y-6">
                {(suggestions || []).map((suggestion, index) => {
                  const isCritical = suggestion.priority === "Critical";
                  const isStrategic = suggestion.priority === "Strategic";
                  
                  return (
                    <li key={index} className="flex items-start gap-4 group">
                      <div className={`mt-1 bg-dark-bg border ${isCritical ? 'border-red-400/30' : isStrategic ? 'border-primary/30' : 'border-border'} rounded-xl p-2 group-hover:scale-110 transition-transform`}>
                        {isCritical ? (
                          <AlertCircle className="w-4 h-4 text-red-400" />
                        ) : isStrategic ? (
                          <Zap className="w-4 h-4 text-primary" />
                        ) : (
                          <CheckCircle2 className="w-4 h-4 text-secondary" />
                        )}
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                           <span className={`text-[10px] font-black uppercase tracking-widest ${isCritical ? 'text-red-400' : isStrategic ? 'text-primary' : 'text-secondary'}`}>
                             {suggestion.priority}
                           </span>
                        </div>
                        <p className="text-text-main text-sm leading-relaxed font-medium">
                          {suggestion.text}
                        </p>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>

        </div>

        {/* Right Column: Document & Metadata */}
        <div className="lg:col-span-5 space-y-8">
           {/* Missing Keywords (if JD or standard check fails) */}
           <div className="bg-surface/50 border border-border rounded-[2rem] p-8 shadow-xl">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-yellow-400/10 rounded-lg">
                  <Zap className="w-5 h-5 text-yellow-400" />
                </div>
                <h3 className="font-bold text-text-main">Tech Keyword Gaps</h3>
              </div>
              <div className="flex flex-wrap gap-2">
                {result.keywordMatch?.missingKeywords?.length > 0 ? (
                  result.keywordMatch.missingKeywords.slice(0, 10).map((k, i) => (
                    <span key={i} className="px-3 py-1 bg-red-400/5 border border-red-400/20 text-red-400 text-[10px] font-bold rounded-lg transition-colors hover:bg-red-400/10">
                      {k}
                    </span>
                  ))
                ) : (
                  <div className="w-full py-4 text-center space-y-2">
                    <div className="inline-flex p-2 bg-secondary/10 rounded-full">
                      <CheckCircle2 className="w-4 h-4 text-secondary" />
                    </div>
                    <p className="text-[10px] text-secondary font-black uppercase tracking-widest">Perfect Keyword Match</p>
                  </div>
                )}
              </div>

              {/* Missing Tech Standard Keywords */}
              {missingTechKeywords.length > 0 && (
                <div className="mt-4 pt-4 border-t border-border/50">
                  <p className="text-[10px] font-black uppercase tracking-widest text-text-muted mb-2">
                    Add These Keywords to Boost Score
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {missingTechKeywords.map((item, i) => (
                      <span
                        key={i}
                        className="px-2.5 py-1 bg-yellow-400/5 border border-yellow-400/20 text-yellow-400 text-[10px] font-bold rounded-lg capitalize transition-colors hover:bg-yellow-400/10"
                        title={item.domain}
                      >
                        {item.keyword}
                      </span>
                    ))}
                  </div>
                </div>
              )}
           </div>

           {/* Preview */}
           <div className="bg-surface/50 border border-border rounded-[2rem] p-6 h-[400px] shadow-xl overflow-hidden relative group">
              {previewUrl ? (
                <iframe src={`${previewUrl}#toolbar=0`} className="w-full h-full border-none rounded-xl" />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-center p-8">
                   <FileText className="w-16 h-16 text-primary/20 mb-4" />
                   <p className="text-xs text-text-muted">{file?.name}</p>
                </div>
              )}
              <div className="absolute inset-0 bg-dark-bg/60 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center backdrop-blur-sm">
                 <a href={previewUrl} download={file?.name}>
                    <Button variant="primary">Download File</Button>
                 </a>
              </div>
           </div>
        </div>
      </div>

      {/* Bottom Actions */}
      <div className="flex flex-wrap justify-center gap-6 pt-8">
        
        {/* Generate Cover Letter Button */}
        <div className="flex flex-col items-center gap-2">
          <button 
            onClick={handleGenerateCoverLetter} 
            disabled={isGeneratingCL}
            className={`group flex items-center justify-center gap-3 px-6 py-4 rounded-2xl border transition-all shadow-xl
              ${isGeneratingCL 
                ? 'bg-surface/50 border-border cursor-not-allowed' 
                : 'bg-primary/10 border-primary/30 hover:border-primary hover:bg-primary/20 hover:-translate-y-1'
              }`}
          >
            {isGeneratingCL ? (
              <Loader2 className="w-6 h-6 text-primary animate-spin" />
            ) : (
              <PenTool className="w-6 h-6 text-primary group-hover:scale-110 transition-transform" />
            )}
            <div className="text-left">
              <span className="block text-sm font-bold text-text-main group-hover:text-primary transition-colors">
                {isGeneratingCL ? "Generating AI Draft..." : "Write Cover Letter"}
              </span>
              <span className="block text-[10px] uppercase tracking-widest text-text-muted mt-0.5">
                Powered by Gemini
              </span>
            </div>
          </button>
          {clError && (
            <span className="text-xs font-medium text-red-400 animate-in fade-in slide-in-from-top-1">
              {clError}
            </span>
          )}
        </div>

        {/* New Scan Button */}
        <button onClick={onReset} className="group flex flex-col items-center gap-3 mt-1">
          <div className="p-4 bg-surface border border-border rounded-2xl group-hover:border-primary/50 group-hover:bg-primary/5 transition-all shadow-xl">
            <Eye className="w-6 h-6 text-text-muted group-hover:text-primary transition-colors" />
          </div>
          <span className="text-xs font-black uppercase tracking-[0.3em] text-text-muted group-hover:text-primary">New Scan</span>
        </button>
      </div>

      <CoverLetterModal 
        isOpen={clModalOpen} 
        onClose={() => setClModalOpen(false)} 
        initialText={clText} 
      />
    </div>
  );
};

export default AnalysisResult;

