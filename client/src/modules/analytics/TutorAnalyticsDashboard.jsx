import React, { useState, useEffect } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Treemap } from "recharts";
import { TrendingUp, Users, AlertCircle } from "lucide-react";
import { useSelector } from "react-redux";
import { apiRequest } from "../../services/apiClient.js";
import Navbar from "../../shared/landing/Navbar";

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
        console.error(err);
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
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 px-6 pb-6 pt-24 sm:px-10 sm:pb-10 sm:pt-28">
      
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Header Section */}
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Tutor Analytics Dashboard</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-2">Class-wide skill gaps and candidate proficiencies.</p>
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
  );
};

export default TutorAnalyticsDashboard;
