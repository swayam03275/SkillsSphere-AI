import React, { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { 
  Target, CheckCircle, Activity, Rocket, ChevronRight, TrendingUp, 
  Briefcase, Clock, FileText, Sparkles, AlertCircle, Zap 
} from "lucide-react";
import {
  ResponsiveContainer, BarChart, Bar, Cell, XAxis, YAxis, Tooltip as RechartsTooltip
} from "recharts";
import StatCard from "../StatCard";
import DashboardSkeleton from "../DashboardSkeleton";
import SuggestionItem from "../SuggestionItem";
import PerformanceTrend from "../PerformanceTrend";
import VersionComparisonModal from "../VersionComparisonModal";
import { getAnalysisHistory, getSkillTrends, getRoleAnalytics } from "../../services/dashboardService";
import { getMyRoadmap } from "../../../roadmap/services/roadmapService";
import logger from "../../../../utils/logger";

const StudentDashboard = ({ token }) => {
  const [history, setHistory] = useState([]);
  const [skillTrends, setSkillTrends] = useState([]);
  const [roadmap, setRoadmap] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedVersions, setSelectedVersions] = useState([]);
  const [showComparison, setShowComparison] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [historyRes, trendsRes, roadmapRes, analyticsRes] = await Promise.all([
          getAnalysisHistory(token),
          getSkillTrends(),
          getMyRoadmap(),
          getRoleAnalytics(token)
        ]);

        if (historyRes.success) setHistory(historyRes.data || []);
        if (trendsRes.success) setSkillTrends(trendsRes.trends || []);
        if (roadmapRes.success) setRoadmap(roadmapRes.data || null);
        if (analyticsRes.success) setAnalytics(analyticsRes.data);
      } catch (error) {
        logger.error("Failed to fetch student dashboard data:", error);
      } finally {
        setLoading(false);
      }
    };
    if (token) fetchData();
  }, [token]);

  const chartData = useMemo(() => {
    return [...history].reverse().map((item) => ({
      date: new Date(item.createdAt).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
      }),
      score: item.score,
      fullDate: new Date(item.createdAt).toLocaleDateString(undefined, {
        year: "numeric",
        month: "long",
        day: "numeric",
      }),
    }));
  }, [history]);

  const toggleVersionSelection = (id) => {
    setSelectedVersions((prev) => {
      if (prev.includes(id)) return prev.filter((v) => v !== id);
      if (prev.length >= 2) return [prev[1], id];
      return [...prev, id];
    });
  };

  const compareData = useMemo(() => {
    if (selectedVersions.length !== 2) return null;
    return selectedVersions.map((id) =>
      history.find((item) => item._id === id),
    );
  }, [selectedVersions, history]);

  const latestAnalysis = history.length > 0 ? history[0] : null;
  const nextMilestone = roadmap?.roadmap?.find(t => t.status !== "completed");

  if (loading) return <DashboardSkeleton />;

  return (
    <div className="space-y-6 animate-fade-in relative">
      {/* Dynamic Role-Specific Analytics */}
      {analytics && (
        <section className="grid gap-4 sm:gap-6 md:grid-cols-3 grid-cols-1">
          <StatCard icon={Target} label="Roadmap Progress" value={`${analytics.roadmapProgress}%`} color="blue" />
          <StatCard icon={CheckCircle} label="Topics Completed" value={analytics.completedTopics} color="emerald" />
          <StatCard icon={Activity} label="Avg Interview Score" value={`${analytics.averageInterviewScore}%`} color="violet" />
        </section>
      )}

      {/* Analytics Section */}
      <section className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          {/* Next Roadmap Milestone */}
          {nextMilestone && (
            <Link to="/roadmap" className="block group">
              <div className="mb-6 p-6 bg-gradient-to-br from-blue-600/20 to-indigo-900/40 border border-blue-500/20 rounded-[2rem] hover:border-blue-500/40 transition-all shadow-xl relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 group-hover:opacity-20 transition-all">
                  <Rocket size={80} className="text-blue-400" />
                </div>
                <div className="relative z-10">
                  <div className="flex items-center gap-2 mb-3">
                    <Target size={16} className="text-blue-400" />
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-400">
                      Next Career Milestone
                    </span>
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2 group-hover:text-blue-400 transition-colors">
                    Master {nextMilestone.topicName}
                  </h3>
                  <p className="text-sm text-slate-400 max-w-md mb-4 font-medium italic">
                    Completing this milestone will significantly boost your
                    profile strength for {roadmap?.targetRole || "your target"} roles.
                  </p>
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-white bg-white/70 dark:bg-white/5 w-fit px-4 py-2 rounded-xl group-hover:bg-blue-100 dark:group-hover:bg-blue-600 transition-all">
                    Continue Learning
                    <ChevronRight
                      size={14}
                      className="group-hover:translate-x-1 transition-transform"
                    />
                  </div>
                </div>
              </div>
            </Link>
          )}

          {/* Score Trend Chart */}
          <PerformanceTrend 
            data={chartData} 
            historyLength={history.length} 
            customTooltip={({ active, payload }) => {
              if (active && payload && payload.length) {
                return (
                  <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-white/10 p-3 rounded-lg shadow-xl backdrop-blur-md">
                    <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">{payload[0].payload.fullDate}</p>
                    <p className="text-sm font-bold text-blue-400">Score: {payload[0].value}%</p>
                  </div>
                );
              }
              return null;
            }}
          />

          {/* Skill Trends */}
          <div className="rounded-2xl border border-gray-200 dark:border-white/10 bg-gray-100 dark:bg-slate-900/50 overflow-hidden backdrop-blur-md">
            <div className="border-b border-gray-200 dark:border-white/5 bg-white/70 dark:bg-white/5 px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TrendingUp className="text-emerald-400" size={20} />
                <h2 className="text-lg font-bold">
                  Trending Skills in Market
                </h2>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 bg-white/70 dark:bg-white/5 px-2 py-1 rounded-md">
                <Activity size={12} />
                <span>Real-time Insights</span>
              </div>
            </div>
            <div className="p-6 h-[280px] min-h-[280px] w-full">
              {skillTrends.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={skillTrends}
                    layout="vertical"
                    margin={{ left: 20, right: 30 }}
                  >
                    <XAxis type="number" hide />
                    <YAxis
                      dataKey="skill"
                      type="category"
                      stroke="#94a3b8"
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                      width={100}
                    />
                    <RechartsTooltip
                      cursor={{ fill: "rgba(255,255,255,0.05)" }}
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          return (
                            <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-white/10 p-2 rounded shadow-lg text-xs">
                              <span className="font-bold text-emerald-400">
                                {payload[0].value} jobs
                              </span>{" "}
                              requesting this skill
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Bar
                      dataKey="count"
                      radius={[0, 4, 4, 0]}
                      barSize={12}
                    >
                      {skillTrends.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={
                            [
                              "#10b981",
                              "#3b82f6",
                              "#8b5cf6",
                              "#f59e0b",
                              "#ef4444",
                            ][index % 5]
                          }
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-gray-500 dark:text-slate-500">
                  <Briefcase size={40} className="opacity-20 mb-3" />
                  <p className="text-sm">
                    No job data available for trends
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Latest Analysis Summary */}
          <div className="rounded-2xl border border-gray-200 dark:border-white/10 bg-gray-100 dark:bg-slate-900/50 overflow-hidden backdrop-blur-md">
            <div className="border-b border-white/5 bg-white/5 px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Activity className="text-emerald-400" size={20} />
                <h2 className="text-lg font-bold">
                  Latest Analysis Summary
                </h2>
              </div>
              {latestAnalysis && (
                <span className="text-xs font-medium text-slate-400 flex items-center gap-1">
                  <Clock size={14} />
                  {new Date(
                    latestAnalysis.createdAt,
                  ).toLocaleDateString()}
                </span>
              )}
            </div>

            <div className="p-6">
              {!latestAnalysis ? (
                <div className="py-12 flex flex-col items-center justify-center text-center">
                  <div className="h-16 w-16 bg-slate-200 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4 text-gray-500 dark:text-slate-500">
                    <FileText size={32} />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">
                    No analysis data yet
                  </h3>
                  <p className="text-slate-400 max-w-sm mb-6">
                    Upload your resume to see your profile strength,
                    skills analysis, and strategic recommendations.
                  </p>
                  <Link
                    to="/resume-analyzer"
                    className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-3 font-bold text-white transition hover:bg-blue-500 hover:shadow-[0_0_20px_rgba(37,99,235,0.4)]"
                  >
                    <Sparkles size={18} />
                    Start Analyzing Now
                  </Link>
                </div>
              ) : (
                <div className="space-y-8">
                  {/* Score and Level */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div className="flex items-center gap-4 p-4 rounded-xl bg-white/80 dark:bg-slate-800/50 border border-gray-200 dark:border-white/5">
                      <div className="relative h-20 w-20 flex items-center justify-center">
                        <svg
                          className="h-full w-full"
                          viewBox="0 0 36 36"
                        >
                          <path
                            className="stroke-slate-700"
                            strokeWidth="3"
                            fill="none"
                            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                          />
                          <path
                            className={`${latestAnalysis.score >= 70 ? "stroke-emerald-500" : latestAnalysis.score >= 40 ? "stroke-yellow-500" : "stroke-red-500"}`}
                            strokeWidth="3"
                            strokeDasharray={`${latestAnalysis.score}, 100`}
                            strokeLinecap="round"
                            fill="none"
                            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                          />
                        </svg>
                        <span className="absolute text-xl font-black">
                          {latestAnalysis.score}%
                        </span>
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <p className="text-xs font-bold text-gray-500 dark:text-slate-500 uppercase tracking-wider">
                            Overall Score
                          </p>
                          {latestAnalysis.mode === "benchmark" && (
                            <span className="px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 text-[8px] font-black uppercase tracking-tighter border border-blue-500/20">
                              Benchmark
                            </span>
                          )}
                        </div>
                        <p className="text-2xl font-black text-slate-900 dark:text-white">
                          {latestAnalysis.classification}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-col justify-center p-4 rounded-xl bg-white/80 dark:bg-slate-800/50 border border-gray-200 dark:border-white/5">
                      <p className="text-xs font-bold text-gray-500 dark:text-slate-500 uppercase tracking-wider mb-2">
                        Target Skills Match
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {latestAnalysis.skills
                          .slice(0, 5)
                          .map((skill, idx) => (
                            <span
                              key={idx}
                              className="px-2 py-1 rounded-md bg-blue-500/10 text-blue-400 text-[10px] font-bold border border-blue-500/20 uppercase tracking-tight"
                            >
                              {skill}
                            </span>
                          ))}
                        {latestAnalysis.skills.length > 5 && (
                          <span className="text-[10px] text-gray-500 dark:text-slate-500 self-center font-bold">
                            +{latestAnalysis.skills.length - 5} MORE
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Missing Skills */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 text-red-400">
                      <AlertCircle size={18} />
                      <h3 className="font-bold text-sm uppercase tracking-widest">
                        Priority Gaps
                      </h3>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {latestAnalysis.missingSkills.length > 0 ? (
                        latestAnalysis.missingSkills.map((skill, idx) => (
                          <span
                            key={idx}
                            className="px-3 py-1.5 rounded-lg bg-red-500/5 text-red-400 text-xs font-bold border border-red-500/20 uppercase tracking-wide"
                          >
                            {skill}
                          </span>
                        ))
                      ) : (
                        <span className="text-sm text-slate-400 italic">
                          No missing skills identified
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* History Table */}
          <div className="rounded-2xl border border-gray-200 dark:border-white/10 bg-gray-100 dark:bg-slate-900/50 overflow-hidden backdrop-blur-md">
            <div className="border-b border-gray-200 dark:border-white/5 bg-white/70 dark:bg-white/5 px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="text-violet-400" size={20} />
                <h2 className="text-lg font-bold">Analysis History</h2>
              </div>
              <span className="text-xs font-medium text-gray-500 dark:text-slate-500">{history.length} records found</span>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-100 dark:bg-slate-800/30 text-[10px] uppercase tracking-widest text-gray-500 dark:text-slate-500">
                    <th className="px-6 py-4 font-bold w-10">Select</th>
                    <th className="px-6 py-4 font-bold">Date</th>
                    <th className="px-6 py-4 font-bold">Score</th>
                    <th className="px-6 py-4 font-bold">Level</th>
                    <th className="px-6 py-4 font-bold">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-white/5">
                  {history.length > 0 ? (
                    history.map((item, idx) => (
                      <tr 
                        key={idx} 
                        className={`hover:bg-slate-100 dark:hover:bg-white/5 transition-colors group cursor-pointer ${selectedVersions.includes(item._id) ? 'bg-blue-500/10 border-l-2 border-blue-500' : ''}`}
                        onClick={() => toggleVersionSelection(item._id)}
                      >
                        <td className="px-6 py-4 text-center">
                          <input 
                            type="checkbox" 
                            checked={selectedVersions.includes(item._id)}
                            onChange={() => {}} // Handled by tr onClick
                            className="rounded border-gray-600 bg-transparent text-blue-600 focus:ring-blue-500"
                          />
                        </td>
                        <td className="px-6 py-4 text-sm whitespace-nowrap text-gray-700 dark:text-slate-300">
                          {new Date(item.createdAt).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 text-sm font-bold whitespace-nowrap">
                          <span className={`${item.score >= 70 ? "text-emerald-400" : item.score >= 40 ? "text-yellow-400" : "text-red-400"}`}>
                            {item.score}%
                            {item.mode === "benchmark" && (
                              <span className="ml-2 text-[8px] opacity-60 text-blue-400 font-black uppercase">BM</span>
                            )}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm whitespace-nowrap">
                          <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase ${
                            item.classification?.includes("Strong") || item.classification === "Advanced"
                              ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                              : item.classification === "Intermediate"
                              ? "bg-yellow-500/10 text-yellow-400 border border-yellow-500/20"
                              : "bg-red-500/10 text-red-400 border border-red-500/20"
                          }`}>
                            {item.classification}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm whitespace-nowrap">
                            <div className="flex items-center gap-1.5 text-emerald-500">
                              <CheckCircle size={14} />
                              <span className="text-[10px] font-bold uppercase tracking-wide">Processed</span>
                            </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="5" className="px-6 py-12 text-center text-gray-500 dark:text-slate-500 text-sm">
                        No history found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          {/* Smart Suggestions Card */}
          <div className="rounded-2xl border border-gray-200 dark:border-white/10 bg-gray-100 dark:bg-slate-900/50 overflow-hidden backdrop-blur-md">
            <div className="border-b border-white/5 bg-white/5 px-6 py-4 flex items-center gap-2">
              <Target className="text-emerald-400" size={20} />
              <h2 className="text-lg font-bold">Smart Insights</h2>
            </div>
            <div className="p-4 space-y-4">
              {latestAnalysis && latestAnalysis.suggestions?.length > 0 ? (
                latestAnalysis.suggestions.map((suggestion, idx) => (
                  <SuggestionItem key={idx} suggestion={suggestion} />
                ))
              ) : (
                <div className="p-8 text-center text-gray-500 dark:text-slate-500">
                  <Zap size={24} className="mx-auto mb-2 opacity-20" />
                  <p className="text-xs uppercase tracking-widest">
                    No insights generated yet
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Comparison Modal */}
      <VersionComparisonModal 
        isOpen={showComparison}
        onClose={() => setShowComparison(false)}
        versions={compareData}
      />

      {/* Floating Selection Bar */}
      {selectedVersions.length > 0 && !showComparison && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 bg-slate-900 border border-blue-500/30 p-4 rounded-2xl shadow-2xl flex items-center gap-6 animate-slide-up">
          <div className="flex items-center gap-3">
            <div className="flex -space-x-2">
              {selectedVersions.map((_, i) => (
                <div key={i} className="h-8 w-8 rounded-full bg-blue-600 border-2 border-slate-900 flex items-center justify-center text-[10px] font-black">
                  V{i + 1}
                </div>
              ))}
            </div>
            <p className="text-xs font-bold text-white whitespace-nowrap">
              {selectedVersions.length} {selectedVersions.length === 1 ? 'version' : 'versions'} selected
            </p>
          </div>
          <div className="h-8 w-px bg-white/10"></div>
          <div className="flex gap-3">
            <button 
              onClick={() => setSelectedVersions([])}
              className="px-4 py-2 text-xs font-bold uppercase text-slate-400 hover:text-white transition-colors"
            >
              Clear
            </button>
            {selectedVersions.length === 2 && (
              <button
                onClick={() => setShowComparison(true)}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-black uppercase rounded-xl transition-all shadow-lg"
              >
                Compare Now
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentDashboard;
