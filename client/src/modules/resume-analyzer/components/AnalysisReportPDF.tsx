// @ts-nocheck

import React from "react";
import {
  AlertCircle,
  CheckCircle2,
  Sparkles,
  Zap,
  ShieldCheck,
  Layout,
  MessageSquare,
} from "lucide-react";

const AnalysisReportPDF = ({ result, fileName }) => {
  if (!result) return null;

  const score = result.score || 0;
  const isJDProvided = result.isJDProvided;
  const suggestions = (result.gapAnalysis?.suggestions || []).slice(0, 8);

  const getScoreColor = (s) => {
    if (s >= 80) return "text-emerald-700 border-emerald-200 bg-emerald-50";
    if (s >= 50) return "text-amber-700 border-amber-200 bg-amber-50";
    return "text-rose-700 border-rose-200 bg-rose-50";
  };

  const getScoreColorText = (s) => {
    if (s >= 80) return "text-emerald-600";
    if (s >= 50) return "text-amber-600";
    return "text-rose-600";
  };

  const getScoreBg = (s) => {
    if (s >= 80) return "bg-emerald-500";
    if (s >= 50) return "bg-amber-500";
    return "bg-rose-500";
  };

  // --- ATS Checklist Logic ---
  const atsData = result.atsOptimization || {};
  const checklist = [
    { label: "Experience Section", status: atsData.details?.sectionResults?.experience },
    { label: "Education Section", status: atsData.details?.sectionResults?.education },
    { label: "Skills Section", status: atsData.details?.sectionResults?.skills },
    { label: "Summary / Objective", status: atsData.details?.sectionResults?.summary },
    { label: "Contact: Email", status: atsData.details?.contactResults?.email },
    { label: "Contact: Phone", status: atsData.details?.contactResults?.phone },
    { label: "Contact: LinkedIn", status: atsData.details?.contactResults?.linkedin },
    { label: "Contact: GitHub", status: atsData.details?.contactResults?.github },
    { label: "Portfolio Link", status: atsData.details?.contactResults?.portfolio },
  ];

  // --- Missing Tech Keywords ---
  const techData = result.techStandard?.details?.domainMissing || {};
  const missingTechKeywords = Object.entries(techData)
    .filter(([, keywords]) => keywords.length > 0)
    .flatMap(([domain, keywords]) =>
      keywords.slice(0, 3).map((kw) => ({ keyword: kw, domain }))
    )
    .slice(0, 12);

  // --- Action Words ---
  const actionWords = result.readabilityMatch?.relevantVerbs || [
    "Spearheaded",
    "Orchestrated",
    "Transformed",
    "Optimized",
    "Architected",
    "Launched",
    "Pioneered",
    "Revitalized",
  ];

  // --- Missing JD Keywords ---
  const missingJDKeywords = result.keywordMatch?.missingKeywords || [];

  return (
    <div className="p-8 bg-white text-slate-800 font-sans max-w-[800px] mx-auto border border-slate-200 rounded-lg shadow-sm">
      {/* PDF Header */}
      <div className="border-b-2 border-indigo-600 pb-6 mb-8 flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-extrabold text-indigo-900 tracking-tight flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-indigo-600 shrink-0" />
            SkillsSphere AI
          </h1>
          <p className="text-xs text-slate-500 font-semibold tracking-wider uppercase mt-1">
            Resume Analysis Report
          </p>
        </div>
        <div className="text-right text-xs text-slate-500 space-y-1">
          <p>
            <span className="font-bold text-slate-700">Date:</span>{" "}
            {new Date().toLocaleDateString(undefined, {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </p>
          {fileName && (
            <p className="max-w-[250px] truncate">
              <span className="font-bold text-slate-700">File:</span> {fileName}
            </p>
          )}
          <p>
            <span className="font-bold text-slate-700">Mode:</span>{" "}
            {result.mode === "benchmark"
              ? "Market Readiness Benchmark"
              : isJDProvided
              ? "Job Description Optimized"
              : "General Quality Baseline"}
          </p>
        </div>
      </div>

      {/* Main Scores Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 break-inside-avoid">
        {/* ATS Score Card */}
        <div className={`border rounded-2xl p-5 flex flex-col items-center justify-center text-center ${getScoreColor(score)}`}>
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-2">
            ATS Trust Score
          </h3>
          <div className="text-5xl font-black tracking-tight mb-2">
            {score}%
          </div>
          {result.classification && (
            <div className="mt-1">
              <span className="inline-block px-3 py-1 rounded-full text-[10px] font-bold uppercase bg-white border border-slate-200">
                {typeof result.classification === "object"
                  ? result.classification.level
                  : result.classification}
              </span>
            </div>
          )}
        </div>

        {/* Impact Level Card */}
        <div className="border border-slate-200 rounded-2xl p-5 flex flex-col justify-between bg-slate-50">
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600">
              Impact Score
            </h3>
            <span className={`text-lg font-extrabold ${getScoreColorText(result.impactMatch?.score)}`}>
              {result.impactMatch?.score || 0}%
            </span>
          </div>
          <div className="h-2 bg-slate-200 rounded-full overflow-hidden mb-3">
            <div
              className={`h-full w-[var(--tw-width)] ${getScoreBg(result.impactMatch?.score)}`}
              style={{ '--tw-width': `${result.impactMatch?.score || 0}%` }}
            ></div>
          </div>
          <p className="text-[11px] text-slate-600 leading-relaxed">
            Found <strong className="text-slate-800">{result.impactMatch?.totalFindings || 0}</strong> metrics.{" "}
            {result.impactMatch?.feedback?.[0]}
          </p>
        </div>

        {/* Section Stats or Benchmark info */}
        <div className="border border-slate-200 rounded-2xl p-5 flex flex-col justify-between bg-slate-50">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-2">
            Analysis Overview
          </h3>
          <div className="space-y-2 text-[11px] text-slate-600 font-medium">
            <div className="flex justify-between border-b border-slate-200/60 pb-1">
              <span>Section Checks:</span>
              <span className="font-bold text-slate-800">
                {checklist.filter((item) => item.status).length} / 9 Passed
              </span>
            </div>
            <div className="flex justify-between border-b border-slate-200/60 pb-1">
              <span>Keyword Gaps:</span>
              <span className="font-bold text-slate-800">
                {missingJDKeywords.length + missingTechKeywords.length} identified
              </span>
            </div>
            <div className="flex justify-between">
              <span>Action Verbs:</span>
              <span className="font-bold text-slate-800">
                {actionWords.length} recommended
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ATS Readiness Checklist */}
      <div className="border border-slate-200 rounded-2xl p-6 mb-8 bg-slate-50 break-inside-avoid">
        <h3 className="text-sm font-extrabold text-indigo-900 mb-4 flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-indigo-600 shrink-0" />
          ATS Readiness Checklist
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {checklist.map((item, i) => (
            <div key={i} className="flex items-center gap-2 p-2 bg-white rounded-xl border border-slate-100 shadow-sm">
              {item.status ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
              )}
              <span className={`text-[11px] font-medium ${item.status ? "text-slate-700" : "text-rose-600 font-bold"}`}>
                {item.label}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Skill Gap Venn Data Representation */}
      {((result.skillMatch?.details?.matchedSkills?.length > 0) ||
        (result.skillMatch?.details?.missingSkills?.length > 0)) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8 break-inside-avoid">
          {/* Matched Expertise */}
          <div className="border border-slate-200 rounded-2xl p-6 bg-emerald-50/30">
            <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-700 mb-3 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              Matched Expertise ({result.skillMatch.details.matchedSkills.length})
            </h3>
            <div className="flex flex-wrap gap-1.5">
              {result.skillMatch.details.matchedSkills.slice(0, 12).map((skill, i) => (
                <span key={i} className="px-2 py-1 bg-emerald-100/55 border border-emerald-200 text-emerald-800 text-[10px] font-semibold rounded-lg">
                  {skill}
                </span>
              ))}
              {result.skillMatch.details.matchedSkills.length > 12 && (
                <span className="text-[10px] text-slate-500 font-semibold align-middle px-1">
                  +{result.skillMatch.details.matchedSkills.length - 12} more
                </span>
              )}
            </div>
          </div>

          {/* Critical Gaps */}
          <div className="border border-slate-200 rounded-2xl p-6 bg-rose-50/30">
            <h3 className="text-xs font-bold uppercase tracking-wider text-rose-700 mb-3 flex items-center gap-1.5">
              <AlertCircle className="w-4 h-4 text-rose-600" />
              Critical Gaps ({result.skillMatch.details.missingSkills.length})
            </h3>
            <div className="flex flex-wrap gap-1.5">
              {result.skillMatch.details.missingSkills.slice(0, 12).map((skill, i) => (
                <span key={i} className="px-2 py-1 bg-rose-100/55 border border-rose-200 text-rose-800 text-[10px] font-semibold rounded-lg">
                  {skill}
                </span>
              ))}
              {result.skillMatch.details.missingSkills.length > 12 && (
                <span className="text-[10px] text-rose-500 font-semibold align-middle px-1">
                  +{result.skillMatch.details.missingSkills.length - 12} more
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Keywords and Power Verbs Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8 break-inside-avoid">
        {/* Missing Tech/JD Keywords */}
        <div className="border border-slate-200 rounded-2xl p-6 bg-slate-50">
          <h3 className="text-sm font-extrabold text-indigo-900 mb-4 flex items-center gap-2">
            <Zap className="w-5 h-5 text-indigo-600 shrink-0" />
            Recommended Keywords
          </h3>
          <div className="space-y-4">
            {missingJDKeywords.length > 0 && (
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-2">
                  Missing Job Description Keywords
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {missingJDKeywords.slice(0, 8).map((k, i) => (
                    <span key={i} className="px-2 py-1 bg-rose-100/55 border border-rose-200 text-rose-800 text-[10px] font-semibold rounded-lg">
                      {k}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {missingTechKeywords.length > 0 && (
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-2">
                  Industry Standard Additions
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {missingTechKeywords.slice(0, 8).map((item, i) => (
                    <span key={i} className="px-2 py-1 bg-amber-100/55 border border-amber-200 text-amber-800 text-[10px] font-semibold rounded-lg capitalize" title={item.domain}>
                      {item.keyword}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {missingJDKeywords.length === 0 && missingTechKeywords.length === 0 && (
              <p className="text-xs text-emerald-600 font-semibold italic">
                No missing critical keywords found. Excellent keyword coverage!
              </p>
            )}
          </div>
        </div>

        {/* Suggested Power Verbs */}
        <div className="border border-slate-200 rounded-2xl p-6 bg-slate-50">
          <h3 className="text-sm font-extrabold text-indigo-900 mb-4 flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-indigo-600 shrink-0" />
            Suggested Power Verbs
          </h3>
          <p className="text-[11px] text-slate-500 mb-3 leading-relaxed">
            Incorporate these verbs to make your achievements sound more action-oriented and impactful.
          </p>
          <div className="flex flex-wrap gap-1.5">
            {actionWords.map((word, i) => (
              <span key={i} className="px-2 py-1 bg-white border border-slate-200 text-slate-700 text-[10px] font-bold rounded-lg uppercase tracking-wider">
                {word}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Strategic Recommendations */}
      {suggestions.length > 0 && (
        <div className="border border-slate-200 rounded-2xl p-6 bg-slate-50 break-inside-avoid">
          <h3 className="text-sm font-extrabold text-indigo-900 mb-4 flex items-center gap-2">
            <Layout className="w-5 h-5 text-indigo-600 shrink-0" />
            Strategic Recommendations
          </h3>
          <ul className="space-y-4">
            {suggestions.map((suggestion, index) => {
              const isCritical = suggestion.priority === "Critical";
              const isStrategic = suggestion.priority === "Strategic";
              return (
                <li key={index} className="flex items-start gap-3">
                  <div className="mt-0.5 shrink-0">
                    {isCritical ? (
                      <span className="inline-block px-1.5 py-0.5 rounded text-[8px] font-black bg-rose-100 text-rose-700 border border-rose-200 uppercase">
                        {suggestion.priority}
                      </span>
                    ) : isStrategic ? (
                      <span className="inline-block px-1.5 py-0.5 rounded text-[8px] font-black bg-indigo-100 text-indigo-700 border border-indigo-200 uppercase">
                        {suggestion.priority}
                      </span>
                    ) : (
                      <span className="inline-block px-1.5 py-0.5 rounded text-[8px] font-black bg-emerald-100 text-emerald-700 border border-emerald-200 uppercase">
                        {suggestion.priority}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-700 font-semibold leading-relaxed">
                    {suggestion.text}
                  </p>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {/* PDF Footer */}
      <div className="mt-12 pt-4 border-t border-slate-200 text-center text-[10px] text-slate-400 font-bold uppercase tracking-widest">
        SkillsSphere AI • Elevate Your Professional Journey
      </div>
    </div>
  );
};

export default AnalysisReportPDF;
