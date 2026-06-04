import React, { useState, useEffect } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Treemap } from "recharts";
import { TrendingUp, Users, AlertCircle, ArrowLeft, Sparkles } from "lucide-react";
import { useSelector } from "react-redux";
import { Link } from "react-router-dom";
import { apiRequest } from "../../services/apiClient.js";
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
        style={{
          fill: depth < 2 ? (colors ? colors[colorIndex] : "#8884d8") : "none",
          stroke: "#fff",
          strokeWidth: 2 / (depth + 1e-10),
          strokeOpacity: 1 / (depth + 1e-10),
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
  const { token } = useSelector((state) => state.auth);
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const COLORS = ["#8884d8", "#83a6ed", "#8dd1e1", "#82ca9d", "#a4de6c", "#d0ed57"];

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const result = await apiRequest("/api/analytics/skill-gaps", { token });
        if (result.success) {
          setData(result.data);
        } else {
          setError(result.message || "Failed to load data");
        }
      } catch (err) {
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
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900 pt-24">
        <Navbar />
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 text-center text-red-500">
        <AlertCircle className="mx-auto mb-2" />
        <p>{error}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex flex-col">
      <Navbar />
      <div className="flex-1 px-6 pb-6 pt-24 sm:px-10 sm:pb-10">
        <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Header Section */}
        <div className="text-center space-y-4 mb-10 relative">
          {/* Back to Dashboard Link (Left aligned) */}
          <div className="py-6 flex justify-start">
            <Link 
              to="/dashboard" 
              className="inline-flex items-center gap-2 text-sm font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors"
            >
              <ArrowLeft size={16} />
              Back to Dashboard
            </Link>
          </div>

          <div className="hidden md:flex absolute top-16 left-4 xl:left-8 w-14 h-14 bg-purple-50 dark:bg-purple-500/10 border border-purple-100 dark:border-purple-500/20 rounded-2xl items-center justify-center shadow-sm transform -rotate-3 hover:rotate-0 transition-transform">
             <Users className="w-6 h-6 text-purple-600" />
          </div>
          <div className="hidden md:flex absolute top-20 right-4 xl:right-8 w-14 h-14 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-100 dark:border-emerald-500/20 rounded-2xl items-center justify-center shadow-sm transform rotate-3 hover:rotate-0 transition-transform">
             <TrendingUp className="w-6 h-6 text-emerald-600" />
          </div>

          <div className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-purple-50 dark:bg-purple-500/10 border border-purple-100 dark:border-purple-500/20 shadow-sm text-[11px] font-bold text-purple-600 dark:text-purple-400 mx-auto tracking-wide uppercase">
            <Sparkles size={12} className="text-purple-500" /> PERFORMANCE METRICS
          </div>
          
          <h1 className="text-4xl md:text-5xl font-black text-gray-900 dark:text-white tracking-tight">
            <span className="bg-gradient-to-r from-blue-600 via-purple-500 to-teal-400 bg-clip-text text-transparent">Tutor Analytics</span> Dashboard
          </h1>
          
          <p className="text-gray-500 dark:text-gray-400 text-[15px] max-w-2xl mx-auto font-medium">
            Class-wide skill gaps and candidate proficiencies.
          </p>
        </div>

        {/* Top KPIs */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-indigo-100 dark:bg-indigo-900/50 rounded-lg text-indigo-600 dark:text-indigo-400">
                <Users size={24} />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Total Skills Evaluated</p>
                <h3 className="text-2xl font-bold text-slate-900 dark:text-white">{data.reduce((acc, curr) => acc + curr.count, 0)}</h3>
              </div>
            </div>
          </div>
          
          <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-emerald-100 dark:bg-emerald-900/50 rounded-lg text-emerald-600 dark:text-emerald-400">
                <TrendingUp size={24} />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Top Skill Area</p>
                <h3 className="text-2xl font-bold text-slate-900 dark:text-white">{data[0]?.name || "N/A"}</h3>
              </div>
            </div>
          </div>
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* Heatmap (Treemap) */}
          <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700">
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
          <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700">
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
      </div>
      </div>
      <Footer />
    </div>
  );
};

export default TutorAnalyticsDashboard;
