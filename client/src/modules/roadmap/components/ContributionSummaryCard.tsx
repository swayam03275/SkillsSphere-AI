import React from "react";
import { Star, TrendingUp, Award } from "lucide-react";
const ContributionSummaryCard = ({ roadmap }) => {
  if (!roadmap || !roadmap.roadmap) return null;

  const contributionTopics = roadmap.roadmap.filter(
    (t) => t.type === "contribution"
  );
  
  if (contributionTopics.length === 0) return null;

  const completedContributions = contributionTopics.filter(
    (t) => t.status === "completed" || t.isVerified
  ).length;
  const totalContributions = contributionTopics.length;
  const contributionProgress = totalContributions > 0 
    ? Math.round((completedContributions / totalContributions) * 100) 
    : 0;

  const readinessBoost = roadmap.readinessBoost || 0;

  return (
    <div className="bg-[var(--surface)] border border-amber-500/20 p-5 rounded-2xl shadow-[0_0_20px_rgba(245,158,11,0.05)] relative overflow-hidden group hover:border-amber-500/40 transition-all flex flex-col justify-between">
      {/* Background Glow */}
      <div className="absolute -top-10 -right-10 w-32 h-32 bg-amber-500/10 rounded-full blur-[40px] pointer-events-none group-hover:bg-amber-500/20 transition-all"></div>
      
      <div className="flex items-center gap-3 mb-4 relative z-10">
        <div className="p-2 bg-amber-500/10 rounded-lg">
          <Star className="w-5 h-5 text-amber-500" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-[var(--text-main)]">
            Contribution Progress
          </h3>
          <p className="text-xs text-[var(--text-muted)] flex items-center gap-1">
            <TrendingUp className="w-3 h-3 text-emerald-400" />
            Career Readiness Boost
          </p>
        </div>
      </div>

      <div className="space-y-4 relative z-10">
        <div className="flex justify-between items-end">
          <div>
            <p className="text-2xl font-black text-amber-500">
              {completedContributions} <span className="text-lg text-[var(--text-muted)]">/ {totalContributions}</span>
            </p>
            <p className="text-[10px] uppercase font-bold tracking-wider text-[var(--text-muted)]">
              Completed
            </p>
          </div>
          
          {readinessBoost > 0 ? (
            <div className="flex items-center gap-1 px-2 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-md">
              <Award className="w-3 h-3 text-emerald-500" />
              <span className="text-xs font-black text-emerald-500">+{readinessBoost}% Boost</span>
            </div>
          ) : (
            <div className="text-xs font-bold text-amber-500/80">
              In Progress
            </div>
          )}
        </div>

        <div className="h-1.5 w-full bg-amber-500/10 rounded-full overflow-hidden">
          <div 
            className="h-full bg-amber-500 transition-all duration-1000 shadow-[0_0_10px_rgba(245,158,11,0.8)] w-[var(--tw-width)]" 
            style={{ '--tw-width': `${contributionProgress}%` }}
          ></div>
        </div>
      </div>
    </div>
  );
};

export default ContributionSummaryCard;
