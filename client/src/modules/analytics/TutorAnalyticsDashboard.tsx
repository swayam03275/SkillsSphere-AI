
import React, { useState, useEffect } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Treemap } from "recharts";
import { TrendingUp, Users, AlertCircle, ArrowLeft, Sparkles } from "lucide-react";
import { useSelector } from "react-redux";
import { Link } from "react-router-dom";
import { apiRequest } from "../../services/apiClient.js";
import { ErrorState } from "../../shared/components";
import Navbar from "../../shared/components/Navbar";
import Footer from "../../shared/components/Footer";

import { useDocumentTitle } from "../../hooks/useDocumentTitle";


import logger from "../../utils/logger";

// Custom Treemap content for better styling
const CustomizedContent = (props) => {
  const { root, depth, x, y, width, height, index, payload, colors, rank, name } = props;
  
  const childCount = root?.children?.length || 1;
  const colorIndex = Math.floor((index / childCount) * 6) % 6;
  
  return (
    <g>
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        className="fill-[var(--tw-fill)] stroke-[var(--tw-stroke)] stroke-[width:var(--tw-stroke-width)] stroke-[opacity:var(--tw-stroke-opacity)]"
        style={{
          '--tw-fill': depth < 2 ? (colors ? colors[colorIndex] : "#8884d8") : "none",
          '--tw-stroke': "#fff",
          '--tw-stroke-width': 2 / (depth + 1e-10),
          '--tw-stroke-opacity': 1 / (depth + 1e-10),
        }}
      />
      {depth === 1 && width > 40 && height > 30 ? (
        <text x={x + 4} y={y + 18} fill="#fff" fontSize={14} fontWeight="bold" fillOpacity={0.9}>
          {name || ""}
        </text>
      ) : null}
      {depth === 1 && width > 40 && height > 50 ? (
        <text x={x + 4} y={y + 34} fill="#fff" fontSize={12} fillOpacity={0.7}>
          {payload?.count || 0} students
        </text>
      ) : null}
    </g>
  );
};

const TutorAnalyticsDashboard = () => {
  useDocumentTitle("Tutor Analytics");
  const { token } = useSelector((state: any) => state.auth);
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const COLORS = ["#8884d8", "#83a6ed", "#8dd1e1", "#82ca9d", "#a4de6c", "#d0ed57"];

  useEffect(() => {
    const fetchAnalytics = async () => {
      setLoading(true);
      setError("");
      try {
        const result = await apiRequest("/api/analytics/skill-gaps", { token });
        if (result.success) {
          setData(result.data);
        } else {
          setError(result.message || "Failed to load data");
        }
      } catch (err: any) {
        logger.error(err);
        setError("Network error occurred while fetching analytics");
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, [token]);

  if (loading) {
    return (
      <main className="min-h-screen bg-[var(--background)] dark:bg-[radial-gradient(circle_at_top_left,#0f172a,#020617)] text-gray-900 dark:text-slate-100 flex flex-col pt-24">
        <Navbar />
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
        </div>
        <Footer />
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-screen bg-[var(--background)] dark:bg-[radial-gradient(circle_at_top_left,#0f172a,#020617)] text-gray-900 dark:text-slate-100 flex flex-col pt-24">
        <Navbar />
        <div className="flex-1 flex flex-col items-center justify-center p-6">
          <div className="w-full max-w-lg bg-white dark:bg-[#121214] p-8 rounded-3xl shadow-sm border border-gray-100 dark:border-white/5">
            <ErrorState
              title="Analytics Unavailable"
              description={error}
              onRetry={() => {
                setLoading(true);
                setError("");
                apiRequest("/api/analytics/skill-gaps", { token }).then(result => {
                  if (result.success) setData(result.data);
                  else setError(result.message || "Failed to load data");
                }).catch(err => {
                  logger.error(err);
                  setError("Network error occurred while fetching analytics");
                }).finally(() => setLoading(false));
              }}
            />
          </div>
        </div>
        <Footer />
      </main>
    );
  }

  const hasData = data && data.length > 0;
  const totalSkills = hasData ? data.reduce((acc, curr) => acc + curr.count, 0) : 0;
  const topSkill = hasData ? data[0]?.name : "No Data Yet";

  return (
    <main className="min-h-screen bg-[var(--background)] dark:bg-[radial-gradient(circle_at_top_left,#0f172a,#020617)] text-gray-900 dark:text-slate-100 flex flex-col pt-24">
      <Navbar />
      <div className="container mx-auto px-4 pb-12 flex-1 relative">
        <div className="w-full max-w-[1200px] mx-auto relative z-10">
          
          {/* Back to Dashboard Link */}
          <div className="py-6">
            <Link 
              to="/dashboard" 
              className="inline-flex items-center gap-2 text-sm font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors"
            >
              <ArrowLeft size={16} />
              Back to Dashboard
            </Link>
          </div>

          {/* Hero Section */}
          <div className="text-center space-y-4 mb-10 relative">
            <div className="hidden md:flex absolute top-4 left-4 xl:left-8 w-14 h-14 bg-purple-50 dark:bg-purple-500/10 border border-purple-100 dark:border-purple-500/20 rounded-2xl items-center justify-center shadow-sm transform -rotate-3 hover:rotate-0 transition-transform">
               <Users className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            </div>
            <div className="hidden md:flex absolute top-8 right-4 xl:right-8 w-14 h-14 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-100 dark:border-emerald-500/20 rounded-2xl items-center justify-center shadow-sm transform rotate-3 hover:rotate-0 transition-transform">
               <TrendingUp className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
            </div>

            <div className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-purple-50 dark:bg-purple-500/10 border border-purple-100 dark:border-purple-500/20 shadow-sm text-[11px] font-bold text-purple-600 dark:text-purple-400 mx-auto tracking-wide uppercase">
              <Sparkles size={12} className="text-purple-500" /> PERFORMANCE METRICS
            </div>
            
            <h1 className="text-4xl md:text-5xl font-black text-gray-900 dark:text-white tracking-tight">
              <span className="bg-gradient-to-r from-blue-600 via-purple-500 to-teal-400 bg-clip-text text-transparent">Analytics</span> Dashboard
            </h1>
            
            <p className="text-gray-500 dark:text-gray-400 text-[15px] max-w-2xl mx-auto font-medium">
              Class-wide skill gaps and candidate proficiencies.
            </p>
          </div>

          {/* Top KPIs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-8">
            <div className="bg-white dark:bg-[#121214] p-6 sm:p-8 rounded-3xl shadow-sm border border-gray-100 dark:border-white/5">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-indigo-100 dark:bg-indigo-900/50 rounded-lg text-indigo-600 dark:text-indigo-400">
                  <Users size={24} />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Total Skills Evaluated</p>
                  <h3 className="text-2xl font-bold text-slate-900 dark:text-white">{totalSkills}</h3>
                </div>
              </div>
            </div>
            
            <div className="bg-white dark:bg-[#121214] p-6 sm:p-8 rounded-3xl shadow-sm border border-gray-100 dark:border-white/5">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-emerald-100 dark:bg-emerald-900/50 rounded-lg text-emerald-600 dark:text-emerald-400">
                  <TrendingUp size={24} />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Top Skill Area</p>
                  <h3 className="text-2xl font-bold text-slate-900 dark:text-white">{topSkill}</h3>
                </div>
              </div>
            </div>
          </div>

          {/* Charts Grid */}
          {!hasData ? (
            <div className="bg-white dark:bg-[#121214] p-12 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgba(0,0,0,0.2)] border border-gray-100 dark:border-white/5 text-center">
              <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertCircle className="w-8 h-8 text-slate-400" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">No Analytics Data Yet</h3>
              <p className="text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                Once your students start uploading resumes and taking mock interviews, you will see a detailed breakdown of their skills and critical gaps here.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Heatmap (Treemap) */}
              <div className="bg-white dark:bg-[#121214] p-6 sm:p-8 rounded-3xl shadow-sm border border-gray-100 dark:border-white/5">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-6">Skill Distribution Heatmap</h3>
                <div className="h-[400px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <Treemap
                      data={data}
                      dataKey="count"
                      aspectRatio={4 / 3}
                      stroke="#fff"
                      content={<CustomizedContent colors={COLORS} />}
                    />
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Bar Chart (Gap Scores) */}
              <div className="bg-white dark:bg-[#121214] p-6 sm:p-8 rounded-3xl shadow-sm border border-gray-100 dark:border-white/5">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-6">Critical Skill Gaps (Severity)</h3>
                <div className="h-[400px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.slice(0, 10)} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                      <XAxis type="number" />
                      <YAxis dataKey="name" type="category" width={100} />
                      <Tooltip />
                      <Bar dataKey="gapScore" fill="#ef4444" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      <Footer />
    </main>
  );
};

export default TutorAnalyticsDashboard;
