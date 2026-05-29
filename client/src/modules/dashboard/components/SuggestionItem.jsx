import React, { useMemo } from "react";
import { 

  AlertCircle, 
  Sparkles, 
  TrendingUp, 
  Zap, 
  ChevronRight 
} from "lucide-react";

const SuggestionItem = ({ suggestion }) => {
  // Handle both string and object formats for robustness
  const text = typeof suggestion === "string" ? suggestion : (suggestion?.text || "");
  const priority = suggestion?.priority || "";

  const suggestionDetails = useMemo(() => {
    const safeText = text.toLowerCase();
    
    if (priority === "Critical" || safeText.includes("urgent") || safeText.includes("missing")) {
      return {
        icon: <AlertCircle size={16} className="text-red-400" />,
        bg: "bg-red-500/5",
        border: "border-red-500/20",
        label: "Critical Action",
        textColor: "text-red-600 dark:text-red-300"
      };
    }
    
    if (priority === "Strategic" || safeText.includes("add") || safeText.includes("integrate") || safeText.includes("projects")) {
      return {
        icon: <Sparkles size={16} className="text-blue-400" />,
        bg: "bg-blue-500/5",
        border: "border-blue-500/20",
        label: "Strategic Tip",
        textColor: "text-blue-600 dark:text-blue-300"
      };
    }

    if (priority === "Optimization" || safeText.includes("metric") || safeText.includes("measure") || safeText.includes("highlight")) {
      return {
        icon: <TrendingUp size={16} className="text-emerald-400" />,
        bg: "bg-emerald-500/5",
        border: "border-emerald-500/20",
        label: "Growth Area",
        textColor: "text-emerald-600 dark:text-emerald-300"
      };
    }

    return {
      icon: <Zap size={16} className="text-amber-400" />,
      bg: "bg-amber-500/5",
      border: "border-amber-500/20",
      label: "Critical Action",
      textColor: "text-amber-600 dark:text-amber-300"
    };
  }, [text, priority]);

  const { icon, bg, border, label, textColor } = suggestionDetails;

  return (
    <div className={`group flex flex-col gap-2 p-4 rounded-xl border ${bg} ${border} transition-all duration-300 hover:bg-gray-50 dark:hover:bg-white/[0.02]`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={`p-1.5 rounded-lg ${bg} border border-gray-200 dark:border-white/5`}>
            {icon}
          </div>
          <span className={`text-[10px] font-bold uppercase tracking-widest ${textColor}`}>{label}</span>
        </div>
        <ChevronRight size={14} className="text-slate-600 group-hover:translate-x-0.5 transition-transform" />
      </div>
      <p className="text-sm text-gray-700 dark:text-slate-300 leading-relaxed font-medium">
        {text.split(' ').map((word, i) => {
          const cleanWord = word.toLowerCase().replace(/[^a-z]/g, '');
          const isHighlight = ['skills', 'projects', 'metrics', 'achievements', 'keywords', 'experience', 'ats', 'readability'].includes(cleanWord);
          return (
            <span key={i} className={isHighlight ? 'text-gray-900 dark:text-white font-bold' : ''}>
              {word}{' '}
            </span>
          );
        })}
      </p>
    </div>
  );
};

export default SuggestionItem;
