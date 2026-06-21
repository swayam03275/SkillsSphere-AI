import React, { useState, useEffect } from "react";
import { useSelector } from "react-redux";
import { Link } from "react-router-dom";
import { Activity, Users, FileText, LayoutDashboard, ArrowLeft, Sparkles, TrendingUp, BarChart3 } from "lucide-react";
import Navbar from "../../../shared/components/Navbar";
import Footer from "../../../shared/components/Footer";
import AuditChart from "../components/AuditChart";
import { apiRequest } from "../../../services/apiClient";

const SummaryMetricCard = ({ icon: Icon, color, bg, hoverBorder, label, value }) => (
  <div className={`group relative rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-slate-900/40 p-5 shadow-2xl backdrop-blur-md transition-all hover:${hoverBorder} duration-300`}>
    <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-white/[0.01] to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
    <div className="relative">
      <div className="mb-2 flex items-center justify-between">
        <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${bg} ${color} group-hover:scale-110 transition-transform duration-300`}>
          <Icon size={18} />
        </div>
        <span className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">{value}</span>
      </div>
      <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">{label}</p>
    </div>
  </div>
);

const AdminAnalyticsDashboard = () => {
  const { token } = useSelector((state: any) => state.auth);
  const [data, setData] = useState({ chartData: [], actions: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [chartType, setChartType] = useState("line");

  useEffect(() => {
    const fetchAuditLogs = async () => {
      try {
        const response = await apiRequest("/api/analytics/admin-dashboard", { token });
        if (response && response.data) {
          setData(response.data);
        }
      } catch (err) {
        console.error("Failed to fetch audit data:", err);
        setError("Unable to load activity logs. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    if (token) {
      fetchAuditLogs();
    }
  }, [token]);

  return (
    <div className="min-h-screen bg-gray-50/50 dark:bg-[#09090b] text-gray-900 dark:text-text-main font-sans pt-20 flex flex-col">
      <Navbar />
      
      <main className="flex-grow flex flex-col items-center justify-start px-4 sm:px-6 lg:px-8 pb-12 animate-fade-in relative overflow-hidden w-full">
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
          <div className="absolute -top-[10%] -left-[5%] w-[40%] h-[40%] rounded-full bg-blue-100/40 dark:bg-blue-900/10 blur-[120px]" />
          <div className="absolute top-[20%] -right-[5%] w-[35%] h-[35%] rounded-full bg-purple-100/40 dark:bg-purple-900/10 blur-[100px]" />
          <div className="absolute top-[5%] right-[20%] w-[35%] h-[35%] rounded-full bg-teal-50/40 dark:bg-teal-900/10 blur-[100px]" />
        </div>

        <div id="analytics-dashboard" className="w-full max-w-[1200px] relative z-10 flex flex-col gap-8">
          
          <div className="py-6 flex justify-between items-center">
            <Link 
              to="/dashboard" 
              className="inline-flex items-center gap-2 text-sm font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors"
            >
              <ArrowLeft size={16} />
              Back to Dashboard
            </Link>
          </div>

          {/* Header Block */}
          <div className="text-center space-y-4 mb-6 relative">
            <div className="hidden md:flex absolute top-4 left-4 xl:left-8 w-14 h-14 bg-blue-50 dark:bg-blue-500/10 border border-blue-100 dark:border-blue-500/20 rounded-2xl items-center justify-center shadow-sm transform -rotate-3 hover:rotate-0 transition-transform">
               <LayoutDashboard className="w-6 h-6 text-blue-600" />
            </div>
            <div className="hidden md:flex absolute top-8 right-4 xl:right-8 w-14 h-14 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-100 dark:border-emerald-500/20 rounded-2xl items-center justify-center shadow-sm transform rotate-3 hover:rotate-0 transition-transform">
               <Sparkles className="w-6 h-6 text-emerald-600" />
            </div>

            <div className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-blue-50 dark:bg-blue-500/10 border border-blue-100 dark:border-blue-500/20 shadow-sm text-[11px] font-bold text-blue-600 dark:text-blue-400 mx-auto tracking-wide uppercase">
              <Sparkles size={12} className="text-blue-500" /> PLATFORM INTELLIGENCE
            </div>
            
            <h1 className="text-4xl md:text-5xl font-black text-gray-900 dark:text-white tracking-tight">
              <span className="bg-gradient-to-r from-blue-600 via-purple-500 to-teal-400 bg-clip-text text-transparent">Platform</span> Analytics & Audit Logs
            </h1>
            
            <p className="text-gray-500 dark:text-gray-400 text-[15px] max-w-2xl mx-auto font-medium">
              Monitor real-time system activity, user logins, and feature usage to understand platform engagement across all user roles.
            </p>

            <div className="pt-6 flex justify-center">
              <div className="flex border border-gray-200 dark:border-white/5 p-1 bg-white dark:bg-slate-900/30 backdrop-blur-md rounded-2xl w-full sm:w-max">
                <button
                  onClick={() => setChartType("line")}
                  className={`flex items-center gap-2 flex-1 sm:flex-initial px-6 py-2.5 text-xs font-extrabold tracking-wider uppercase rounded-xl transition-all duration-300 ${
                    chartType === "line"
                      ? "bg-blue-600 text-white shadow-[0_0_15px_rgba(37,99,235,0.4)]"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
                  }`}
                >
                  <TrendingUp size={14} /> Trend View
                </button>
                <button
                  onClick={() => setChartType("bar")}
                  className={`flex items-center gap-2 flex-1 sm:flex-initial px-6 py-2.5 text-xs font-extrabold tracking-wider uppercase rounded-xl transition-all duration-300 ${
                    chartType === "bar"
                      ? "bg-blue-600 text-white shadow-[0_0_15px_rgba(37,99,235,0.4)]"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
                  }`}
                >
                  <BarChart3 size={14} /> Volume View
                </button>
              </div>
            </div>
          </div>

          {/* High-Level Overview Metrics */}
          <section className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-3">
            <SummaryMetricCard
              icon={Activity}
              color="text-blue-400"
              bg="bg-blue-500/20"
              hoverBorder="border-blue-500/30"
              label="Total Activity (30d)"
              value={data.chartData.reduce((acc, day) => {
                return acc + data.actions.reduce((sum, act) => sum + (day[act] || 0), 0);
              }, 0)}
            />
            <SummaryMetricCard
              icon={Users}
              color="text-emerald-400"
              bg="bg-emerald-500/20"
              hoverBorder="border-emerald-500/30"
              label="Active Sessions"
              value="Live"
            />
            <SummaryMetricCard
              icon={FileText}
              color="text-purple-400"
              bg="bg-purple-500/20"
              hoverBorder="border-purple-500/30"
              label="Tracked Events"
              value={data.actions.length}
            />
          </section>

          {/* Main Chart Section */}
          <div className="rounded-2xl border border-gray-200 dark:border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900/50 overflow-hidden backdrop-blur-md shadow-2xl p-6">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
               <TrendingUp size={20} className="text-emerald-500" /> Activity Audit Trail (Last 30 Days)
            </h2>
            
            {loading ? (
              <div className="flex items-center justify-center h-96">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : error ? (
              <div className="flex items-center justify-center h-96 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
                <p className="text-red-600 dark:text-red-400">{error}</p>
              </div>
            ) : (
              <AuditChart data={data.chartData} actions={data.actions} type={chartType} />
            )}
          </div>

        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default AdminAnalyticsDashboard;
