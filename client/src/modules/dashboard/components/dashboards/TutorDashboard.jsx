import React, { useState, useEffect } from "react";
import { Users, BarChart3, CheckCircle } from "lucide-react";
import StatCard from "../StatCard";
import DashboardSkeleton from "../DashboardSkeleton";
import { getRoleAnalytics } from "../../services/dashboardService";

const TutorDashboard = ({ token }) => {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const analyticsRes = await getRoleAnalytics(token);
        if (analyticsRes.success) setAnalytics(analyticsRes.data);
      } catch (error) {
        console.error("Failed to fetch tutor dashboard data:", error);
      } finally {
        setLoading(false);
      }
    };
    if (token) fetchData();
  }, [token]);

  if (loading) return <DashboardSkeleton />;

  return (
    <div className="space-y-6 animate-fade-in">
      {analytics && (
        <section className="grid gap-4 sm:gap-6 md:grid-cols-3 grid-cols-1">
          <StatCard icon={Users} label="Active Students" value={analytics.activeStudents} color="blue" />
          <StatCard icon={BarChart3} label="Platform Avg Score" value={`${analytics.averagePlatformScore}%`} color="emerald" />
          <StatCard icon={CheckCircle} label="Total Interviews" value={analytics.totalMockInterviewsCompleted} color="violet" />
        </section>
      )}
    </div>
  );
};

export default TutorDashboard;
