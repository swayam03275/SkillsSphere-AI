import React from "react";
import { 
  X, 
  ArrowRight, 
  CheckCircle2, 
  AlertCircle, 
  TrendingUp,
  Sparkles,
  Zap,
  Layout
} from "lucide-react";
import Button from "../../../shared/components/Button";

const normalizeSkill = (skill) =>
  String(skill || "").trim().toLowerCase();

const safeArray = (value) =>
  Array.isArray(value) ? value : [];

const getUniqueNormalizedSkills = (skills) => {
  const map = new Map();

  safeArray(skills).forEach((skill) => {
    const normalized = normalizeSkill(skill);

    if (normalized && !map.has(normalized)) {
      map.set(normalized, skill);
    }
  });

  return map;
};

const calculateDiff = (oldValues, newValues) => {
  const oldMap = getUniqueNormalizedSkills(oldValues);
  const newMap = getUniqueNormalizedSkills(newValues);

  return {
    added: [...newMap.entries()]
      .filter(([key]) => !oldMap.has(key))
      .map(([, value]) => value),

    removed: [...oldMap.entries()]
      .filter(([key]) => !newMap.has(key))
      .map(([, value]) => value),
  };
};

const getScoreTrend = (diff) => {
  if (diff >= 15) {
    return {
      label: "Major Improvement",
      color: "text-emerald-400",
    };
  }

  if (diff >= 5) {
    return {
      label: "Strong Improvement",
      color: "text-green-400",
    };
  }

  if (diff > 0) {
    return {
      label: "Minor Improvement",
      color: "text-blue-400",
    };
  }

  if (diff === 0) {
    return {
      label: "No Change",
      color: "text-slate-400",
    };
  }

  if (diff <= -15) {
    return {
      label: "Major Regression",
      color: "text-red-500",
    };
  }

  return {
    label: "Regression",
    color: "text-red-400",
  };
};

const validateVersion = (version) => {
  return (
    version &&
    typeof version.score === "number" &&
    !Number.isNaN(version.score) &&
    version.createdAt
  );
};

const VersionComparisonModal = ({ isOpen, onClose, versions }) => {
  if (!isOpen || !versions || versions.length !== 2) return null;

  if (
    !validateVersion(versions[0]) ||
    !validateVersion(versions[1])
  ) {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60">
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-10 max-w-md">
          <h2 className="text-xl font-bold mb-3">
            Comparison Unavailable
          </h2>

          <p className="text-sm text-slate-500">
            One or more resume versions contain invalid
            comparison data.
          </p>

          <div className="mt-6">
            <Button onClick={onClose}>
              Close
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // versions[0] is the older one based on history array order (newest first)
  // But wait, the history is newest first, so history[0] is newer than history[1].
  // Let's sort them by date to be sure.
  const sorted = [...versions].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
  const v1 = sorted[0]; // Older
  const v2 = sorted[1]; // Newer

  const scoreDiff = v2.score - v1.score;

  
  // Calculate skill diffs
  const skillDiff = calculateDiff(
    v1.skills,
    v2.skills
  );

  const addedSkills = skillDiff.added;
  const removedSkills = skillDiff.removed;

  const gapDiff = calculateDiff(
    v1.missingSkills,
    v2.missingSkills
  );

  const resolvedGaps = gapDiff.removed;
  const newGaps = gapDiff.added;

  const trend = getScoreTrend(scoreDiff);

  const classificationChanged =
    v1.classification !== v2.classification;

  const totalChanges =
    addedSkills.length +
    removedSkills.length +
    resolvedGaps.length +
    newGaps.length;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-white/10 rounded-[2rem] w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
        
        {/* Header */}
        <div className="px-8 py-6 border-b border-gray-200 dark:border-white/5 flex items-center justify-between bg-gradient-to-r from-blue-600/10 to-transparent">
          <div>
            <h2 className="text-2xl font-black text-gray-900 dark:text-white flex items-center gap-2">
              <TrendingUp className="text-blue-400" />
              Resume Evolution Analysis
            </h2>
            <p className="text-gray-500 dark:text-slate-400 text-sm mt-1">
              Comparing versions from {new Date(v1.createdAt).toLocaleDateString()} and {new Date(v2.createdAt).toLocaleDateString()}
            </p>
          </div>
          <button 
            onClick={onClose}
            aria-label="Close modal"
            className="p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-full text-gray-400 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white transition-all"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-8 space-y-10 custom-scrollbar">
          
          {/* Summary Score View */}
          <div className="p-6 rounded-3xl bg-indigo-500/5 border border-indigo-500/20">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-black text-lg">
                  Comparison Summary
                </h3>

                <p className="text-sm text-slate-500">
                  Comprehensive evolution metrics
                </p>
              </div>

              <div className={`font-black ${trend.color}`}>
                {trend.label}
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
              <div>
                <p className="text-xs text-slate-500">
                  Added Skills
                </p>
                <p className="text-2xl font-black">
                  {addedSkills.length}
                </p>
              </div>

              <div>
                <p className="text-xs text-slate-500">
                  Removed Skills
                </p>
                <p className="text-2xl font-black">
                  {removedSkills.length}
                </p>
              </div>

              <div>
                <p className="text-xs text-slate-500">
                  Resolved Gaps
                </p>
                <p className="text-2xl font-black">
                  {resolvedGaps.length}
                </p>
              </div>

              <div>
                <p className="text-xs text-slate-500">
                  Total Changes
                </p>
                <p className="text-2xl font-black">
                  {totalChanges}
                </p>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-6 rounded-2xl bg-gray-100 dark:bg-slate-800/40 border border-gray-200 dark:border-white/5 text-center">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">Previous Score</p>
              <div className="text-4xl font-black text-gray-500 dark:text-slate-400">{v1.score}%</div>
              <p className="text-[10px] font-bold text-slate-500 mt-1">{v1.classification}</p>
            </div>
            
            <div className="flex flex-col items-center justify-center">
              <div className={`flex items-center gap-2 px-4 py-2 rounded-full font-black text-sm border ${
                scoreDiff >= 0 ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-red-500/10 border-red-500/20 text-red-400'
              }`}>
                {scoreDiff >= 0 ? '+' : ''}{scoreDiff}% Score Change
              </div>
              <div className="h-8 w-px bg-gradient-to-b from-white/10 to-transparent my-2"></div>
            </div>

            <div className="p-6 rounded-2xl bg-blue-600/10 border border-blue-500/20 text-center relative overflow-hidden group">
              <div className="absolute top-0 right-0 -mt-4 -mr-4 h-20 w-20 bg-blue-500/10 rounded-full blur-2xl"></div>
              <p className="text-[10px] font-black uppercase tracking-widest text-blue-400 mb-2">Current Score</p>
              <div className="text-4xl font-black text-gray-900 dark:text-white">{v2.score}%</div>
              <p className="text-[10px] font-bold text-blue-300 mt-1">{v2.classification}</p>
            </div>
          </div>

          {/* Skill Diffs */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            
            {/* Skills Removed */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-red-400">
                <div className="p-2 bg-red-500/10 rounded-lg">
                  <AlertCircle size={18} />
                </div>

                <h3 className="font-bold text-lg">
                  Skills Removed
                </h3>
              </div>

              <div className="p-6 rounded-2xl bg-gray-50 dark:bg-slate-800/40 border border-gray-200 dark:border-white/5 min-h-[120px]">
                {removedSkills.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {removedSkills.map(skill => (
                      <span
                        key={skill}
                        className="px-3 py-1.5 rounded-lg bg-red-500/10 text-red-400 text-xs font-bold border border-red-500/20 uppercase"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-slate-500 text-sm italic">
                    No skills were removed.
                  </p>
                )}
              </div>
            </div>
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-emerald-400">
                <div className="p-2 bg-emerald-500/10 rounded-lg">
                  <CheckCircle2 size={18} />
                </div>
                <h3 className="font-bold text-lg">Skills Acquired</h3>
              </div>
              <div className="p-6 rounded-2xl bg-gray-50 dark:bg-slate-800/40 border border-gray-200 dark:border-white/5 min-h-[120px]">
                {addedSkills.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {addedSkills.map(skill => (
                      <span key={skill} className="px-3 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 text-xs font-bold border border-emerald-500/20 uppercase">
                        {skill}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-slate-500 text-sm italic">No new skills detected in this version.</p>
                )}
              </div>
            </div>

            {/* Resolved Gaps */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-amber-400">
                <div className="p-2 bg-amber-500/10 rounded-lg">
                  <AlertCircle size={18} />
                </div>

                <h3 className="font-bold text-lg">
                  Newly Introduced Gaps
                </h3>
              </div>

              <div className="p-6 rounded-2xl bg-gray-50 dark:bg-slate-800/40 border border-gray-200 dark:border-white/5 min-h-[120px]">
                {newGaps.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {newGaps.map(skill => (
                      <span
                        key={skill}
                        className="px-3 py-1.5 rounded-lg bg-amber-500/10 text-amber-400 text-xs font-bold border border-amber-500/20 uppercase"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-slate-500 text-sm italic">
                    No new gaps detected.
                  </p>
                )}
              </div>
            </div>
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-blue-400">
                <div className="p-2 bg-blue-500/10 rounded-lg">
                  <Sparkles size={18} />
                </div>
                <h3 className="font-bold text-lg">Resolved Skill Gaps</h3>
              </div>
              <div className="p-6 rounded-2xl bg-gray-50 dark:bg-slate-800/40 border border-gray-200 dark:border-white/5 min-h-[120px]">
                {resolvedGaps.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {resolvedGaps.map(skill => (
                      <span key={skill} className="px-3 py-1.5 rounded-lg bg-blue-500/10 text-blue-400 text-xs font-bold border border-blue-500/20 uppercase flex items-center gap-1.5">
                        <ArrowRight size={12} />
                        {skill}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-slate-500 text-sm italic">No priority gaps were resolved in this update.</p>
                )}
              </div>
            </div>
          </div>

          {/* New Suggestions / Strategic Advice */}
          <div className="p-8 rounded-3xl bg-gradient-to-br from-indigo-600/10 to-purple-600/10 border border-indigo-500/20">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-indigo-500/20 rounded-xl text-indigo-400">
                <Zap size={24} />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">Evolution Strategy</h3>
                <p className="text-indigo-300/60 text-xs font-medium uppercase tracking-widest">AI Insights</p>
              </div>
            </div>
            
            <div className="mb-8 p-5 rounded-2xl bg-white/5 border border-white/10">
              <h4 className="font-black text-sm uppercase tracking-widest mb-3">
                Classification Progression
              </h4>

              <div className="flex items-center gap-3">
                <span className="font-bold">
                  {v1.classification}
                </span>

                <ArrowRight size={16} />

                <span className="font-bold text-blue-400">
                  {v2.classification}
                </span>
              </div>

              {classificationChanged && (
                <p className="mt-2 text-xs text-blue-400">
                  Classification changed between versions.
                </p>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-4">
                <h4 className="text-sm font-black text-gray-600 dark:text-slate-300 uppercase tracking-widest flex items-center gap-2">
                  <Layout size={16} /> Key Improvements
                </h4>
                <ul className="space-y-3">
                  {scoreDiff > 0 && (
                    <li className="text-sm text-gray-600 dark:text-slate-400 flex items-start gap-2">
                      <div className="mt-1.5 h-1.5 w-1.5 rounded-full bg-emerald-500 shrink-0"></div>
                      <span>Your overall score increased by <strong>{scoreDiff}%</strong>, showing strong alignment with current market standards.</span>
                    </li>
                  )}
                  {addedSkills.length > 0 && (
                    <li className="text-sm text-gray-600 dark:text-slate-400 flex items-start gap-2">
                      <div className="mt-1.5 h-1.5 w-1.5 rounded-full bg-blue-500 shrink-0"></div>
                      <span>Successfully integrated <strong>{addedSkills.length}</strong> new technical competencies into your profile.</span>
                    </li>
                  )}
                  {resolvedGaps.length > 0 && (
                    <li className="text-sm text-gray-600 dark:text-slate-400 flex items-start gap-2">
                      <div className="mt-1.5 h-1.5 w-1.5 rounded-full bg-purple-500 shrink-0"></div>
                      <span>Reduced priority skill gaps by addressing <strong>{resolvedGaps.length}</strong> high-impact areas.</span>
                    </li>
                  )}
                </ul>
              </div>

              <div className="space-y-4">
                <h4 className="text-sm font-black text-gray-600 dark:text-slate-300 uppercase tracking-widest flex items-center gap-2">
                  <AlertCircle size={16} /> Remaining Priorities
                </h4>
                <div className="flex flex-wrap gap-2">
                  {v2.missingSkills?.slice(0, 5).map(skill => (
                    <span key={skill} className="px-2 py-1 rounded-md bg-red-500/5 text-red-400/70 text-[10px] font-bold border border-red-500/10 uppercase">
                      {skill}
                    </span>
                  ))}
                  {v2.missingSkills?.length > 5 && (
                    <span className="text-[10px] text-slate-500 font-bold px-1">+ {v2.missingSkills.length - 5} more</span>
                  )}
                </div>
                <p className="text-xs text-slate-500 leading-relaxed">
                  To continue your growth, focus on the remaining {v2.missingSkills?.length} skill gaps identified in your latest analysis.
                </p>
              </div>
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="px-8 py-6 border-t border-gray-200 dark:border-white/5 bg-gray-50 dark:bg-slate-950/50 flex justify-end">
          <Button variant="primary" onClick={onClose} className="px-10">
            Done Reviewing
          </Button>
        </div>
      </div>
    </div>
  );
};

export default VersionComparisonModal;
