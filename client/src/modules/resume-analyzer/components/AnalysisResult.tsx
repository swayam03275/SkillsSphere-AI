
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
  Loader2,
  BarChart3
} from "lucide-react";
import { useEffect, useState } from "react";
import Button from "../../../shared/components/Button";
import SkillGapVenn from "./SkillGapVenn";
import CoverLetterModal from "../../../shared/components/CoverLetterModal";
import { generateCoverLetter } from "../services/resumeService";
import AnalysisReportPDF from "./AnalysisReportPDF";
import { useToast } from "../../../shared/components";
import {
  exportResumeAnalysisToJSON,
  exportResumeAnalysisToTXT,
  exportToPDF,
} from "../../../utils/exportUtils";

import logger from "../../../utils/logger";

const ATS_BREAKDOWN_CONFIG = [
  { key: "formatting", label: "Formatting", offset: 4 },
  { key: "keywords", label: "Keywords", offset: -3 },
  { key: "structure", label: "Structure", offset: 2 },
  { key: "skillsMatch", label: "Skills Match", offset: 1 },
  { key: "experienceRelevance", label: "Experience Relevance", offset: -2 },
  { key: "education", label: "Education", offset: 0 },
  { key: "contactInformation", label: "Contact Information", offset: 3 },
];

const clampScore = (value) => {
  const number = Number(value);
  if (!Number.isFinite(number)) return null;
  return Math.max(0, Math.min(100, Math.round(number)));
};

const firstScore = (...values) => {
  for (const value of values) {
    const score = clampScore(value);
    if (score !== null) return score;
  }
  return null;
};

const booleanGroupScore = (values) => {
  const checks = values.filter((value) => typeof value === "boolean");
  if (checks.length === 0) return null;
  const passed = checks.filter(Boolean).length;
  return Math.round((passed / checks.length) * 100);
};

const fallbackCategoryScore = (overallScore, offset) => {
  const baseScore = clampScore(overallScore) ?? 0;
  return Math.max(0, Math.min(100, baseScore + offset));
};

const getBreakdownFeedback = (label, score) => {
  if (score >= 85) return `${label} is strong and ATS-friendly.`;
  if (score >= 70) return `${label} is solid with minor room to improve.`;
  if (score >= 50) return `${label} needs clearer signals for ATS parsing.`;
  return `${label} should be improved to raise your ATS readiness.`;
};

const buildAtsScoreBreakdown = (result, overallScore) => {
  const atsDetails = result?.atsOptimization?.details || {};
  const sectionResults = atsDetails.sectionResults || {};
  const contactResults = atsDetails.contactResults || {};

  const availableScores = {
    formatting: firstScore(
      result?.atsOptimization?.formattingScore,
      atsDetails.formattingScore,
      result?.formatting?.score,
      result?.readabilityMatch?.score
    ),
    keywords: firstScore(
      result?.keywordMatch?.score,
      result?.techStandard?.score,
      result?.atsOptimization?.keywordScore,
      atsDetails.keywordScore
    ),
    structure: firstScore(
      result?.atsOptimization?.structureScore,
      atsDetails.structureScore,
      booleanGroupScore([
        sectionResults.experience,
        sectionResults.education,
        sectionResults.skills,
        sectionResults.summary,
      ])
    ),
    skillsMatch: firstScore(
      result?.skillMatch?.score,
      result?.skillsMatch?.score,
      result?.gapAnalysis?.score
    ),
    experienceRelevance: firstScore(
      result?.experienceMatch?.score,
      result?.experienceRelevance?.score,
      result?.impactMatch?.score,
      sectionResults.experience === true ? 85 : sectionResults.experience === false ? 45 : null
    ),
    education: firstScore(
      result?.educationMatch?.score,
      result?.education?.score,
      sectionResults.education === true ? 90 : sectionResults.education === false ? 40 : null
    ),
    contactInformation: firstScore(
      result?.contactInformation?.score,
      atsDetails.contactScore,
      booleanGroupScore([
        contactResults.email,
        contactResults.phone,
        contactResults.linkedin,
        contactResults.github,
        contactResults.portfolio,
      ])
    ),
  };

  return ATS_BREAKDOWN_CONFIG.map((category) => {
    const score = availableScores[category.key] ?? fallbackCategoryScore(overallScore, category.offset);

    return {
      ...category,
      score,
      feedback: getBreakdownFeedback(category.label, score),
    };
  });
};

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

  const { success, error: showError } = useToast();
  const [isExportingPDF, setIsExportingPDF] = useState(false);
  const [exportError, setExportError] = useState("");
  const [selectedOptimizerKeywords, setSelectedOptimizerKeywords] = useState<string[]>([]);

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

  const getProgressColor = (s) => {
    if (s >= 80) return "bg-secondary";
    if (s >= 50) return "bg-yellow-400";
    return "bg-red-400";
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
    // @ts-expect-error TODO: Fix pervasive types
    .filter(([, keywords]) => keywords.length > 0)
    .flatMap(([domain, keywords]) =>
      // @ts-expect-error TODO: Fix pervasive types
      keywords.slice(0, 3).map(kw => ({ keyword: kw, domain }))
    )
    .slice(0, 12);

  // --- Action Words ---
  const actionWords = result.readabilityMatch?.relevantVerbs || ["Spearheaded", "Orchestrated", "Transformed", "Optimized", "Architected", "Launched", "Pioneered", "Revitalized"];
  const atsScoreBreakdown = buildAtsScoreBreakdown(result, score);

  const baseAtsScore = result.atsOptimization?.score || result.score || 72;
  const keywordMatchFactor = 3.5;
  const projectedAtsScore = Math.min(100, Math.round(baseAtsScore + selectedOptimizerKeywords.length * keywordMatchFactor));
  const fileNameClean = file?.name
    ? file.name.replace(/\.[^/.]+$/, "")
    : "resume-analysis";

  const handleExportPDF = async () => {
    if (isExportingPDF) return;

    setIsExportingPDF(true);
    setExportError("");
    try {
      await exportToPDF("analysis-report-pdf", `${fileNameClean}-analysis-report.pdf`, {
        margin: [0.4, 0.4, 0.4, 0.4],
        image: { type: "jpeg", quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, letterRendering: true, scrollX: 0, scrollY: 0 },
        jsPDF: { unit: "in", format: "letter", orientation: "portrait" }
      });
      success("Report exported to PDF successfully.");
    } catch (err: any) {
      logger.error("PDF Export Error:", err);
      const message = "We couldn't export the PDF report. Please try again.";
      setExportError(message);
      showError(err.message || message);
    } finally {
      setIsExportingPDF(false);
    }
  };

  const handleExportTXT = () => {
    exportResumeAnalysisToTXT(result, `${fileNameClean}-analysis-report.txt`);
    success("Report exported to TXT successfully.");
  };

  const handleExportJSON = () => {
    exportResumeAnalysisToJSON(result, `${fileNameClean}-analysis-report.json`);
    success("Report exported to JSON successfully.");
  };

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
    } catch (err: any) {
      setClError(err.message || "Failed to generate cover letter.");
      // Auto clear error after 5 seconds
      setTimeout(() => setClError(""), 5000);
    } finally {
      setIsGeneratingCL(false);
    }
  };

  const handleRegenerate = async (tone, language) => {
    try {
      const response = await generateCoverLetter(result.resumeId, jobDescription, tone, language);
      if (response && response.coverLetter && response.coverLetter.generatedText) {
        setClText(response.coverLetter.generatedText);
        return response.coverLetter.generatedText;
      }
      throw new Error("Invalid response format from server.");
    } catch (err: any) {
      showError("Failed to regenerate: " + err.message);
      return null;
    }
  };

  return (
    <div className="w-full space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Top Banner removed, moved to parent layout */}

      {result.isScannedPdf && (
        <div className="flex flex-col md:flex-row items-center gap-4 p-5 bg-yellow-500/10 border border-yellow-500/20 rounded-2xl animate-in fade-in slide-in-from-top-2 duration-300">
          <AlertCircle className="w-8 h-8 text-yellow-400 shrink-0" />
          <div className="text-center md:text-left space-y-1">
            <h4 className="text-sm font-bold text-yellow-400">Scanned Resume Warning</h4>
            <p className="text-xs text-text-muted leading-relaxed">
              We couldn't read any text from your resume. It appears to be a scanned document or an image. For a much more accurate AI analysis, we highly recommend uploading a text-selectable PDF, DOCX, or TXT format.
            </p>
          </div>
          <button
            onClick={onReset}
            className="md:ml-auto px-4 py-2 text-xs font-bold text-yellow-400 border border-yellow-500/30 rounded-xl hover:bg-yellow-500/15 transition-all shrink-0 active:scale-95"
          >
            Upload New Resume
          </button>
        </div>
      )}

      {/* Main Score & Metrics Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Trust Score */}
        <div className="bg-white dark:bg-[#121214] border border-gray-100 dark:border-white/5 rounded-3xl p-8 flex flex-col items-center justify-between text-center shadow-sm">
           <div className="mb-4">
             <div className="inline-flex p-2 bg-purple-50 dark:bg-purple-500/10 rounded-xl text-purple-600 mb-4">
               <Sparkles className="w-5 h-5" />
             </div>
             <h2 className="text-[11px] font-black uppercase tracking-[0.2em] text-gray-500 dark:text-gray-400 mb-1">Trust Score</h2>
             <div className={`text-6xl font-black tracking-tighter ${getScoreColor(score)} leading-none mt-2`}>
               {score}%
             </div>
           </div>
           
           <div className="space-y-3 mb-6">
             <div className={`inline-flex px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${score >= 80 ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : score >= 50 ? 'bg-amber-50 text-amber-600 border border-amber-100' : 'bg-red-50 text-red-600 border border-red-100'}`}>
               {typeof result.classification === 'object' ? result.classification.level : (result.classification || "INTERMEDIATE")}
             </div>
             <div className="text-xs">
               <p className="font-bold text-gray-700 dark:text-gray-300">Moderate Profile Strength</p>
               <p className="italic font-medium text-gray-500 dark:text-gray-400 mt-0.5">(Skill Gaps Noted • Deep Experience)</p>
             </div>
           </div>

           <div className="w-full pt-4 border-t border-gray-100 dark:border-white/5 text-[11px] font-bold text-gray-500 dark:text-gray-400">
             {isJDProvided ? "Optimized for Job Description" : "General Quality Baseline"}
           </div>
        </div>

        {/* Impact Score Widget */}
        <div className="bg-white dark:bg-[#121214] border border-gray-100 dark:border-white/5 rounded-3xl p-8 shadow-sm flex flex-col">
           <div className="flex items-center gap-2 mb-6">
              <div className="p-1.5 bg-yellow-50 dark:bg-yellow-500/10 rounded-lg">
                <Zap className="w-4 h-4 text-yellow-500" />
              </div>
              <h3 className="font-bold text-gray-900 dark:text-white text-sm">Impact Level</h3>
           </div>
           
           <div className="flex-grow flex flex-col items-center justify-center space-y-6">
              <div className={`text-7xl font-black ${getScoreColor(result.impactMatch?.score)} leading-none`}>
                {result.impactMatch?.score}%
              </div>
              <div className="w-full max-w-[200px] h-2 bg-gray-100 dark:bg-white/5 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-yellow-400 transition-all duration-1000 w-[var(--tw-width)]" 
                  style={{ '--tw-width': `${result.impactMatch?.score}%` }}
                ></div>
              </div>
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400">
                Found <strong className="text-gray-900 dark:text-white">{result.impactMatch?.totalFindings || 0}</strong> quantifiable metrics.
              </p>
           </div>
        </div>

        {/* ATS Readiness Checklist */}
        <div className="bg-white dark:bg-[#121214] border border-gray-100 dark:border-white/5 rounded-3xl p-8 shadow-sm flex flex-col">
          <div className="flex items-center gap-2 mb-6">
            <div className="p-1.5 bg-emerald-50 dark:bg-emerald-500/10 rounded-lg">
              <ShieldCheck className="w-4 h-4 text-emerald-500" />
            </div>
            <h3 className="font-bold text-gray-900 dark:text-white text-sm">ATS Readiness</h3>
          </div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-3 flex-grow">
            {checklist.map((item, i) => (
              <div key={i} className="flex items-center gap-2">
                {item.status ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                ) : (
                  <AlertCircle className="w-3.5 h-3.5 text-red-500 flex-shrink-0" />
                )}
                <span className={`text-[11px] font-bold ${item.status ? "text-gray-600 dark:text-gray-400" : "text-red-500"}`}>
                  {item.label}
                </span>
              </div>
            ))}
          </div>

          {result.verifiedLinks && result.verifiedLinks.length > 0 && (
            <div className="mt-6 pt-4 border-t border-gray-100 dark:border-white/5">
              <h3 className="text-[10px] font-black uppercase tracking-[0.1em] text-gray-500 dark:text-gray-400 mb-3">Verified Profiles</h3>
              <div className="flex flex-wrap gap-2">
                {result.verifiedLinks.map((link, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/10 rounded-lg text-[10px] font-bold text-gray-600 dark:text-gray-300 max-w-[150px] truncate">
                       <Globe size={12} className="shrink-0" /> <span className="truncate">{link.url.replace(/^https?:\/\/(www\.)?/, '')}</span>
                    </div>
                    {link.isValid ? (
                      <div className="flex items-center gap-1 px-2 py-1.5 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-100 dark:border-emerald-500/20 rounded-lg text-[9px] font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                         <ShieldCheck size={10} /> Verified
                         <a href={link.url} target="_blank" rel="noreferrer"><ExternalLink size={10} className="ml-0.5 opacity-60 hover:opacity-100" /></a>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1 px-2 py-1.5 bg-red-50 dark:bg-red-500/10 border border-red-100 dark:border-red-500/20 rounded-lg text-[9px] font-black uppercase tracking-wider text-red-600 dark:text-red-400">
                         <AlertCircle size={10} /> Dead Link
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ATS Score Breakdown */}
      <section className="bg-white dark:bg-[#121214] border border-gray-100 dark:border-white/5 rounded-3xl p-8 shadow-sm mt-6">
        <div className="flex items-center justify-between border-b border-gray-100 dark:border-white/5 pb-6 mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-50 dark:bg-indigo-500/10 rounded-xl">
              <BarChart3 className="w-5 h-5 text-indigo-500" />
            </div>
            <h3 className="text-lg font-black text-gray-900 dark:text-white">ATS Score Breakdown</h3>
          </div>
          <span className={`text-3xl font-black ${getScoreColor(score)}`}>{score}%</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8">
          {atsScoreBreakdown.map((category) => (
            <div key={category.key} className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-[13px] font-bold text-gray-900 dark:text-white">{category.label}</h4>
                <span className={`text-sm font-black ${getScoreColor(category.score)}`}>{category.score}%</span>
              </div>
              <div className="h-2 bg-gray-100 dark:bg-white/5 rounded-full overflow-hidden">
                <div className={`h-full rounded-full transition-all duration-1000 w-[var(--tw-width)] ${getProgressColor(category.score)}`} style={{ '--tw-width': `${category.score}%` }} />
              </div>
              <p className="text-[11px] font-medium text-gray-500 dark:text-gray-400 pt-1">
                {category.feedback}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Visual Skill Gap Venn Diagram */}
      <SkillGapVenn 
        skillMatch={result.skillMatch} 
        isJDProvided={isJDProvided} 
        mode={result.mode}
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Suggestions & Keywords */}
        <div className="lg:col-span-7 space-y-6">
          {/* Action Word Suggestions Cloud */}
          <div className="bg-white dark:bg-[#121214] border border-gray-100 dark:border-white/5 rounded-3xl p-8 shadow-sm">
            <div className="flex items-center gap-3 mb-6">
               <div className="p-2 bg-indigo-50 dark:bg-indigo-500/10 rounded-xl">
                  <MessageSquare className="w-5 h-5 text-indigo-500" />
                </div>
                <h3 className="text-[15px] font-bold text-gray-900 dark:text-white">Suggested Power Verbs</h3>
            </div>
            <div className="flex flex-wrap gap-2.5">
              {actionWords.map((word, i) => (
                <span key={i} className="px-3 py-1.5 bg-purple-50 dark:bg-purple-500/10 text-purple-700 dark:text-purple-300 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all cursor-default">
                  {word}
                </span>
              ))}
            </div>
          </div>

          {/* Strategic Improvements Section */}
          <div className="bg-white dark:bg-[#121214] border border-gray-100 dark:border-white/5 rounded-3xl p-8 shadow-sm">
            <div className="flex items-center gap-3 mb-8">
              <div className="p-2 bg-emerald-50 dark:bg-emerald-500/10 rounded-xl">
                <Layout className="w-5 h-5 text-emerald-500" />
              </div>
              <h3 className="text-[15px] font-bold text-gray-900 dark:text-white">
                Strategic Improvements
              </h3>
            </div>
            <div className="max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
              <ul className="space-y-6">
                {(suggestions || []).map((suggestion, index) => {
                  const isCritical = suggestion.priority === "Critical";
                  const isStrategic = suggestion.priority === "Strategic";
                  const colorTheme = isCritical ? 'red' : isStrategic ? 'indigo' : 'emerald';
                  
                  return (
                    <li key={index} className="flex items-start gap-4">
                      <div className={`mt-1 p-2 bg-${colorTheme}-50 dark:bg-${colorTheme}-500/10 rounded-xl`}>
                        {isCritical ? (
                          <AlertCircle className={`w-4 h-4 text-${colorTheme}-500`} />
                        ) : isStrategic ? (
                          <Zap className={`w-4 h-4 text-${colorTheme}-500`} />
                        ) : (
                          <CheckCircle2 className={`w-4 h-4 text-${colorTheme}-500`} />
                        )}
                      </div>
                      <div className="space-y-1">
                        <span className={`text-[10px] font-black uppercase tracking-widest text-${colorTheme}-600 dark:text-${colorTheme}-400`}>
                          {isCritical ? 'CRITICAL' : isStrategic ? 'STRATEGIC' : 'OPTIMIZATION'}
                        </span>
                        <p className="text-gray-600 dark:text-gray-300 text-xs leading-relaxed font-medium">
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
        <div className="lg:col-span-5 space-y-6">
           {/* Missing Keywords / Keyword Optimizer */}
           <div className="bg-white dark:bg-[#121214] border border-gray-100 dark:border-white/5 rounded-3xl p-8 shadow-sm">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-yellow-50 dark:bg-yellow-500/10 rounded-xl">
                    <Zap className="w-5 h-5 text-yellow-500" />
                  </div>
                  <h3 className="text-[15px] font-bold text-gray-900 dark:text-white">Tech Keyword Gaps</h3>
                </div>
                {result.keywordMatch?.missingKeywords?.length > 0 && (
                  <span className="px-2 py-1 bg-indigo-500/10 text-indigo-400 rounded-lg text-[9px] font-black uppercase tracking-widest border border-indigo-500/20">
                    Live Score Optimizer
                  </span>
                )}
              </div>
              
              {result.keywordMatch?.missingKeywords?.length > 0 ? (
                <div className="space-y-6">
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Simulate adding missing keywords to see how they impact your overall ATS readability and scoring:
                  </p>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {result.keywordMatch.missingKeywords.slice(0, 10).map((k, i) => {
                      const isSelected = selectedOptimizerKeywords.includes(k);
                      return (
                        <label
                          key={i}
                          className={`flex items-center justify-between p-3 rounded-2xl border cursor-pointer select-none transition-all duration-300 ${
                            isSelected
                              ? "bg-indigo-500/10 border-indigo-500 text-indigo-600 dark:text-indigo-400 shadow-sm"
                              : "bg-gray-50 dark:bg-white/5 border-gray-100 dark:border-white/5 hover:border-gray-200 dark:hover:border-white/10 text-gray-700 dark:text-gray-300"
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => {
                                if (isSelected) {
                                  setSelectedOptimizerKeywords(selectedOptimizerKeywords.filter(kw => kw !== k));
                                } else {
                                  setSelectedOptimizerKeywords([...selectedOptimizerKeywords, k]);
                                }
                              }}
                              className="w-3.5 h-3.5 rounded accent-indigo-500 cursor-pointer"
                            />
                            <span className="text-xs font-bold">{k}</span>
                          </div>
                          <span className="text-[9px] font-bold opacity-80">+{keywordMatchFactor}%</span>
                        </label>
                      );
                    })}
                  </div>

                  {/* Projected score dial */}
                  <div className="p-4 bg-gradient-to-br from-indigo-500/20 to-teal-500/10 border border-indigo-500/10 rounded-2xl flex items-center justify-between shadow-[0_4px_15px_rgba(99,102,241,0.05)]">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Projected ATS Score</p>
                      <div className="flex items-baseline gap-1.5 mt-1.5">
                        <span className="text-3xl font-black text-gray-900 dark:text-white">{projectedAtsScore}%</span>
                        <span className="text-[11px] font-bold text-emerald-500">+{projectedAtsScore - baseAtsScore}% Increase</span>
                      </div>
                    </div>
                    <div className="relative w-12 h-12 flex items-center justify-center">
                      <svg className="w-full h-full transform -rotate-90">
                        <circle cx="24" cy="24" r="20" fill="transparent" stroke="currentColor" strokeWidth="3" className="text-gray-200 dark:text-white/10" />
                        <circle cx="24" cy="24" r="20" fill="transparent" stroke="currentColor" strokeWidth="3" strokeDasharray={125.6} strokeDashoffset={125.6 * (1 - projectedAtsScore / 100)} className="text-indigo-500 transition-all duration-500" />
                      </svg>
                      <Sparkles className="absolute w-4 h-4 text-indigo-400 animate-spin-slow" />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="w-full py-6 flex flex-col items-center text-center space-y-3">
                  <CheckCircle2 className="w-8 h-8 text-emerald-500" />
                  <p className="text-[11px] text-emerald-600 font-black uppercase tracking-widest">Perfect Keyword Match</p>
                </div>
              )}

              {/* Missing Tech Standard Keywords */}
              {missingTechKeywords.length > 0 && (
                <div className="mt-6 pt-6 border-t border-gray-100 dark:border-white/5">
                  <p className="text-[10px] font-black uppercase tracking-widest text-gray-500 dark:text-gray-400 mb-4">
                    Add These Keywords to Boost Score
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {missingTechKeywords.map((item, i) => (
                      <span
                        key={i}
                        className="px-3 py-1.5 bg-yellow-50 dark:bg-yellow-500/10 text-yellow-700 dark:text-yellow-300 text-[10px] font-bold rounded-xl capitalize border border-yellow-200/20"
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
           <div className="bg-white dark:bg-[#121214] border border-gray-100 dark:border-white/5 rounded-3xl p-6 h-[400px] shadow-sm overflow-hidden relative group">
              {previewUrl ? (
                <iframe src={`${previewUrl}#toolbar=0`} className="w-full h-full border-none rounded-xl bg-white" />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-center p-8 bg-gray-50 dark:bg-white/5 rounded-xl">
                   <FileText className="w-12 h-12 text-gray-300 dark:text-gray-600 mb-4" />
                   <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">{file?.name || "Resume Preview"}</p>
                </div>
              )}
              <div className="absolute inset-0 bg-white/80 dark:bg-[#121214]/80 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center backdrop-blur-sm">
                 <a href={previewUrl} download={file?.name}>
                    {/* @ts-expect-error TODO: Fix pervasive types */}
                    <Button variant="primary" className="shadow-lg rounded-full px-6">Download Resume</Button>
                 </a>
              </div>
           </div>
        </div>
      </div>

      {/* Bottom Actions */}
      <div className="flex flex-wrap items-center justify-center gap-8 pt-6 pb-12">
        
        {/* Generate Cover Letter Button */}
        <div className="flex flex-col items-center gap-2">
          <button 
            onClick={handleGenerateCoverLetter} 
            disabled={isGeneratingCL}
            className={`group flex items-center justify-center gap-4 px-8 py-3.5 rounded-2xl transition-all
              ${isGeneratingCL 
                ? 'bg-gray-100 dark:bg-white/5 cursor-not-allowed' 
                : 'bg-indigo-50 dark:bg-indigo-500/10 hover:bg-indigo-100 dark:hover:bg-indigo-500/20 active:scale-95'
              }`}
          >
            {isGeneratingCL ? (
              <Loader2 className="w-5 h-5 text-indigo-500 animate-spin" />
            ) : (
              <PenTool className="w-5 h-5 text-indigo-500" />
            )}
            <div className="text-left">
              <span className="block text-[15px] font-bold text-gray-900 dark:text-white">
                {isGeneratingCL ? "Generating..." : "Write Cover Letter"}
              </span>
              <span className="block text-[10px] uppercase tracking-widest font-bold text-indigo-400 dark:text-indigo-300 mt-0.5">
                Powered by Gemini
              </span>
            </div>
          </button>
          {clError && (
            <span className="text-xs font-medium text-red-500">
              {clError}
            </span>
          )}
        </div>

        {/* Export PDF Report Button */}
        <div className="flex flex-col items-center gap-2">
          <button 
            onClick={handleExportPDF} 
            disabled={isExportingPDF}
            aria-busy={isExportingPDF}
            className={`group flex items-center justify-center gap-4 px-8 py-3.5 rounded-2xl transition-all
              ${isExportingPDF 
                ? 'bg-gray-100 dark:bg-white/5 cursor-not-allowed' 
                : 'bg-emerald-50 dark:bg-emerald-500/10 hover:bg-emerald-100 dark:hover:bg-emerald-500/20 active:scale-95'
              }`}
          >
            {isExportingPDF ? (
              <Loader2 className="w-5 h-5 text-emerald-500 animate-spin" />
            ) : (
              <Download className="w-5 h-5 text-emerald-500" />
            )}
            <div className="text-left">
              <span className="block text-[15px] font-bold text-gray-900 dark:text-white">
                {isExportingPDF ? "Exporting..." : "Export PDF"}
              </span>
              <span className="block text-[10px] uppercase tracking-widest font-bold text-emerald-400 dark:text-emerald-300 mt-0.5">
                Download Feedback
              </span>
            </div>
          </button>
          {exportError && (
            <span role="alert" className="text-xs font-medium text-red-500 text-center">
              {exportError}
            </span>
          )}
        </div>

        {/* Export TXT Report Button */}
        <div className="flex flex-col items-center gap-2">
          <button
            onClick={handleExportTXT}
            className="group flex items-center justify-center gap-4 px-8 py-3.5 rounded-2xl bg-sky-50 dark:bg-sky-500/10 hover:bg-sky-100 dark:hover:bg-sky-500/20 active:scale-95 transition-all"
          >
            <FileText className="w-5 h-5 text-sky-500" />
            <div className="text-left">
              <span className="block text-[15px] font-bold text-gray-900 dark:text-white">
                Export TXT
              </span>
              <span className="block text-[10px] uppercase tracking-widest font-bold text-sky-400 dark:text-sky-300 mt-0.5">
                Plain Summary
              </span>
            </div>
          </button>
        </div>

        {/* Export JSON Report Button */}
        <div className="flex flex-col items-center gap-2">
          <button
            onClick={handleExportJSON}
            className="group flex items-center justify-center gap-4 px-8 py-3.5 rounded-2xl bg-violet-50 dark:bg-violet-500/10 hover:bg-violet-100 dark:hover:bg-violet-500/20 active:scale-95 transition-all"
          >
            <Download className="w-5 h-5 text-violet-500" />
            <div className="text-left">
              <span className="block text-[15px] font-bold text-gray-900 dark:text-white">
                Export JSON
              </span>
              <span className="block text-[10px] uppercase tracking-widest font-bold text-violet-400 dark:text-violet-300 mt-0.5">
                Structured Data
              </span>
            </div>
          </button>
        </div>

        {/* New Scan Button */}
        <div className="flex flex-col items-center gap-3 md:ml-12">
          <button 
            onClick={onReset} 
            className="w-14 h-14 flex items-center justify-center bg-indigo-600 hover:bg-indigo-700 text-white rounded-full shadow-lg shadow-indigo-500/30 transition-all hover:scale-105 active:scale-95"
          >
            <Eye className="w-6 h-6" />
          </button>
          <span className="text-[11px] font-black uppercase tracking-[0.2em] text-indigo-600 dark:text-indigo-400">New Scan</span>
        </div>
      </div>

      <CoverLetterModal 
        isOpen={clModalOpen} 
        onClose={() => setClModalOpen(false)} 
        initialText={clText} 
        onRegenerate={handleRegenerate}
      />

      {/* Off-screen PDF Template Container */}
      <div className="absolute top-0 left-0 w-px h-px overflow-hidden pointer-events-none bg-transparent">
        <div 
          id="analysis-report-pdf" 
          className="w-[800px] bg-white text-slate-800"
        >
          <AnalysisReportPDF result={result} fileName={file?.name} />
        </div>
      </div>
    </div>
  );
};

export default AnalysisResult;

