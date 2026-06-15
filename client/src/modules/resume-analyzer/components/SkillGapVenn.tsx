// @ts-nocheck

import React from "react";
import { User, Briefcase, Zap, AlertCircle, CheckCircle2 } from "lucide-react";
const SkillGapVenn = ({ skillMatch = {}, isJDProvided = false, mode = "match" }) => {
  if (!isJDProvided && mode !== "benchmark") return null;

  const { matchedSkills = [], missingSkills = [], extraSkills = [] } = skillMatch.details || {};
  const matchedCount = matchedSkills.length;
  const missingCount = missingSkills.length;
  const extraCount = extraSkills.length;

  return (
    <div className="bg-white dark:bg-[#121214] border border-gray-100 dark:border-white/5 rounded-3xl p-8 shadow-sm relative overflow-hidden">
      <div className="flex items-center gap-3 mb-8">
        <div className="p-2 bg-indigo-50 dark:bg-indigo-500/10 rounded-xl">
          <Zap className="w-5 h-5 text-indigo-500" />
        </div>
        <h3 className="text-[15px] font-bold text-gray-900 dark:text-white">Visual Skill Gap</h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
        {/* Venn Diagram Visual */}
        <div className="relative flex justify-center py-8">
          <svg viewBox="0 0 400 240" className="w-full max-w-[400px]">
            <defs>
              <filter id="shadow">
                <feDropShadow dx="0" dy="4" stdDeviation="4" floodOpacity="0.05" />
              </filter>
              <linearGradient id="resumeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#6366f1" stopOpacity="0.1" />
                <stop offset="100%" stopColor="#6366f1" stopOpacity="0.02" />
              </linearGradient>
              <linearGradient id="jobGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#10b981" stopOpacity="0.1" />
                <stop offset="100%" stopColor="#10b981" stopOpacity="0.02" />
              </linearGradient>
            </defs>

            {/* Resume Circle */}
            <circle 
              cx="160" cy="120" r="100" 
              fill="url(#resumeGrad)" 
              stroke="#6366f1" 
              strokeWidth="1.5" 
              strokeDasharray="4 4"
            />
            <text x="100" y="50" className="text-[10px] font-black uppercase fill-gray-500 dark:fill-gray-400">Your Resume</text>
            
            <text x="245" y="50" className={`text-[10px] font-black uppercase ${mode === 'benchmark' ? 'fill-blue-500' : 'fill-emerald-500'}`}>
              {mode === 'benchmark' ? 'Market Standard' : 'Job Description'}
            </text>

            {/* Overlap Text */}
            <text x="200" y="130" textAnchor="middle" className="text-3xl font-black fill-gray-900 dark:fill-white">
              {matchedCount}
            </text>
            <text x="200" y="148" textAnchor="middle" className="text-[9px] font-black uppercase fill-gray-400 dark:fill-gray-500">Matches</text>
            
            {/* Counts */}
            <text x="100" y="130" textAnchor="middle" className="text-3xl font-black fill-gray-900 dark:fill-white">{extraCount}</text>
            <text x="100" y="148" textAnchor="middle" className="text-[9px] font-black uppercase fill-gray-400 dark:fill-gray-500">Unrequired</text>
            
            <text x="300" y="130" textAnchor="middle" className="text-3xl font-black fill-red-500">{missingCount}</text>
            <text x="300" y="148" textAnchor="middle" className="text-[9px] font-black uppercase fill-red-400">Gaps</text>
          </svg>
        </div>

        {/* Breakdown List */}
        <div className="space-y-6">
          {/* Matched */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-emerald-500">
              <CheckCircle2 size={16} />
              <span className="text-xs font-black uppercase tracking-widest">Matched Expertise ({matchedCount})</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {matchedSkills.slice(0, 8).map((skill, i) => (
                <span key={i} className="px-2 py-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-[10px] font-bold rounded-lg">
                  {skill}
                </span>
              ))}
              {matchedCount > 8 && <span className="text-[10px] text-slate-500 font-bold">+{matchedCount - 8} more</span>}
            </div>
          </div>

          {/* Missing */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-red-400">
              <AlertCircle size={16} />
              <span className="text-xs font-black uppercase tracking-widest">Critical Gaps ({missingCount})</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {missingSkills.slice(0, 8).map((skill, i) => (
                <span key={i} className="px-2 py-1 bg-red-400/5 border border-red-400/20 text-red-400 text-[10px] font-bold rounded-lg">
                  {skill}
                </span>
              ))}
              {missingCount > 8 && <span className="text-[10px] text-red-400/50 font-bold">+{missingCount - 8} more</span>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SkillGapVenn;
