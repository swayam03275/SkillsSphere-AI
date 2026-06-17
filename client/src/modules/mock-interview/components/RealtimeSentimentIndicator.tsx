import React from 'react';
import { Activity, Brain, AlertCircle } from 'lucide-react';
const RealtimeSentimentIndicator = ({ analysis }) => {
  if (!analysis) return null;

  const { confidence, tone, hesitationCount } = analysis;

  const getConfidenceColor = (score) => {
    if (score >= 80) return '#10b981'; // green
    if (score >= 50) return '#f59e0b'; // yellow
    return '#ef4444'; // red
  };

  const getToneLabel = (score) => {
    if (score >= 60) return 'Positive';
    if (score >= 40) return 'Neutral';
    return 'Negative';
  };

  const getToneColor = (score) => {
    if (score >= 60) return '#10b981';
    if (score >= 40) return '#94a3b8';
    return '#ef4444';
  };

  return (
    <div className="bg-gray-50 dark:bg-gray-900/70 backdrop-blur-md border border-gray-200 dark:border-white/10 rounded-2xl p-6 mb-6">
      <div className="flex items-center gap-2 text-indigo-300 font-semibold mb-4 text-sm uppercase tracking-wider">
        <Activity size={16} className="animate-pulse" />
        <span>Live Analysis</span>
      </div>

      <div className="grid grid-cols-[repeat(auto-fit,minmax(120px,1fr))] gap-4">
        <div className="flex flex-col gap-2 bg-gray-100 dark:bg-black/20 p-4 rounded-xl border border-gray-200 dark:border-white/5">
          <div className="flex items-center gap-2 text-slate-400 text-xs">
            <Brain size={14} />
            <span>Confidence</span>
          </div>
          <div className="text-xl font-bold text-[color:var(--tw-color)]" style={{ '--tw-color': getConfidenceColor(confidence) }}>
            {confidence}%
          </div>
          <div className="h-1 bg-gray-200 dark:bg-white/10 rounded-sm overflow-hidden">
            <div 
              className="h-full rounded-sm w-[var(--tw-width)] bg-[color:var(--tw-bg)] transition-all duration-300" 
              style={{ 
                '--tw-width': `${confidence}%`, 
                '--tw-bg': getConfidenceColor(confidence),
              }}
            />
          </div>
        </div>

        <div className="flex flex-col gap-2 bg-gray-100 dark:bg-black/20 p-4 rounded-xl border border-gray-200 dark:border-white/5">
          <div className="flex items-center gap-2 text-slate-400 text-xs">
            <Activity size={14} />
            <span>Tone</span>
          </div>
          <div className="text-xl font-bold text-[color:var(--tw-color)]" style={{ '--tw-color': getToneColor(tone) }}>
            {getToneLabel(tone)}
          </div>
          <div className="h-1 bg-gray-200 dark:bg-white/10 rounded-sm overflow-hidden">
            <div 
              className="h-full rounded-sm w-[var(--tw-width)] bg-[color:var(--tw-bg)] transition-all duration-300" 
              style={{ 
                '--tw-width': `${tone}%`, 
                '--tw-bg': getToneColor(tone),
              }}
            />
          </div>
        </div>
        
        <div className="flex flex-col gap-2 bg-gray-100 dark:bg-black/20 p-4 rounded-xl border border-gray-200 dark:border-white/5">
          <div className="flex items-center gap-2 text-slate-400 text-xs">
            <AlertCircle size={14} />
            <span>Hesitations</span>
          </div>
          <div className="text-xl font-bold text-[color:var(--tw-color)]" style={{ '--tw-color': hesitationCount > 5 ? '#ef4444' : '#94a3b8' }}>
            {hesitationCount}
          </div>
        </div>
      </div>
    </div>
  );
};

export default RealtimeSentimentIndicator;
