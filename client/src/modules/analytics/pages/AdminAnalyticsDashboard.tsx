import React, { useState, useEffect } from "react";
import { Activity, Users, FileText, LayoutDashboard } from "lucide-react";
import Navbar from "../../../shared/components/Navbar";
import Footer from "../../../shared/components/Footer";
import AuditChart from "../components/AuditChart";
import api from "../../../services/api";

const AdminAnalyticsDashboard = () => {
  const [data, setData] = useState({ chartData: [], actions: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [chartType, setChartType] = useState("line");

  useEffect(() => {
    const fetchAuditLogs = async () => {
      try {
        const response = await api.get("/analytics/admin-dashboard");
        if (response.data && response.data.data) {
          setData(response.data.data);
        }
      } catch (err) {
        console.error("Failed to fetch audit data:", err);
        setError("Unable to load activity logs. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    fetchAuditLogs();
  }, []);

  return (
    <div className="min-h-screen bg-[var(--background)] flex flex-col">
      <Navbar />
      
      <main className="flex-1 pt-24 pb-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
        <div className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white flex items-center gap-3 mb-2">
              <LayoutDashboard className="w-8 h-8 text-blue-600 dark:text-blue-500" />
              Platform Analytics & Audit Logs
            </h1>
            <p className="text-slate-600 dark:text-slate-400 max-w-2xl">
              Monitor real-time system activity, user logins, and feature usage to understand platform engagement across all user roles.
            </p>
          </div>
          <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-lg self-start">
            <button
              onClick={() => setChartType("line")}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                chartType === "line" 
                  ? "bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm" 
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              Trend View
            </button>
            <button
              onClick={() => setChartType("bar")}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                chartType === "bar" 
                  ? "bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm" 
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              Volume View
            </button>
          </div>
        </div>

        {/* Top KPI Cards (Placeholders for broader admin metrics) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-50 dark:bg-blue-900/30 rounded-lg">
                <Activity className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Total Activity (30d)</p>
                <h3 className="text-2xl font-bold text-slate-900 dark:text-white">
                  {data.chartData.reduce((acc, day) => {
                    return acc + data.actions.reduce((sum, act) => sum + (day[act] || 0), 0);
                  }, 0)}
                </h3>
              </div>
            </div>
          </div>
          
          <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-emerald-50 dark:bg-emerald-900/30 rounded-lg">
                <Users className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Active Sessions</p>
                <h3 className="text-2xl font-bold text-slate-900 dark:text-white">Live</h3>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-purple-50 dark:bg-purple-900/30 rounded-lg">
                <FileText className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Tracked Events</p>
                <h3 className="text-2xl font-bold text-slate-900 dark:text-white">{data.actions.length}</h3>
              </div>
            </div>
          </div>
        </div>

        {/* Main Chart Section */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm p-6">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-6">Activity Audit Trail (Last 30 Days)</h2>
          
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

      </main>
      
      <Footer />
    </div>
  );
};

export default AdminAnalyticsDashboard;
