import React, { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { Target, Briefcase, CheckCircle, Clock, LayoutDashboard, PlusCircle } from "lucide-react";
import StatCard from "../StatCard";
import DashboardSkeleton from "../DashboardSkeleton";
import { getRoleAnalytics } from "../../services/dashboardService";
import { getRecruiterJobs } from "../../../recruiter-jobs/services/jobPostingService";
import logger from "../../../../utils/logger";

const RecruiterDashboard = ({ token }) => {
  const [analytics, setAnalytics] = useState(null);
  const [recruiterJobs, setRecruiterJobs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [analyticsRes, jobsRes] = await Promise.all([
          getRoleAnalytics(token),
          getRecruiterJobs(token)
        ]);

        if (analyticsRes.success) setAnalytics(analyticsRes.data);
        if (jobsRes.success) setRecruiterJobs(jobsRes.jobs || []);
      } catch (error: any) {
        logger.error("Failed to fetch recruiter dashboard data:", error);
      } finally {
        setLoading(false);
      }
    };
    if (token) fetchData();

    const handleRefresh = () => {
      fetchData();
    };

    window.addEventListener("dashboard:refresh", handleRefresh);
    return () => window.removeEventListener("dashboard:refresh", handleRefresh);
  }, [token]);

  const jobStats = useMemo(() => {
    const jobs = Array.isArray(recruiterJobs) ? recruiterJobs : [];
    return {
      total: jobs.length,
      open: jobs.filter(
        (j) => j.status === "open" || j.status === "active" || !j.status,
      ).length,
      closed: jobs.filter((j) => j.status === "closed").length,
      draft: jobs.filter((j) => j.status === "draft").length,
    };
  }, [recruiterJobs]);

  if (loading) return <DashboardSkeleton />;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Dynamic Role-Specific Analytics */}
      {analytics && (
        <section className="grid gap-4 sm:gap-6 md:grid-cols-3 grid-cols-1">
          <StatCard icon={Target} label="Elite Candidates (>80%)" value={analytics.totalEliteCandidates} color="emerald" />
          <div className="col-span-1 sm:col-span-2 bg-gray-100 dark:bg-slate-900/50 p-5 rounded-2xl border border-gray-200 dark:border-white/10 shadow-2xl backdrop-blur-md">
            <h3 className="text-xs font-bold text-gray-500 dark:text-slate-500 mb-3 uppercase tracking-widest">Talent Pool Density Map</h3>
            <div className="flex flex-wrap gap-2">
                {analytics.talentDensity?.map(t => (
                  <span key={t.topic} className="px-3 py-1 bg-emerald-500/20 text-emerald-400 text-xs font-bold rounded-lg border border-emerald-500/30 uppercase tracking-widest">{t.topic}: {t.skilledCandidates}</span>
                ))}
                {(!analytics.talentDensity || analytics.talentDensity.length === 0) && <span className="text-xs text-slate-500">No density data yet</span>}
            </div>
          </div>
        </section>
      )}

      {/* Recruiter Specific Stats Grid */}
      <section className="grid gap-4 sm:gap-6 md:grid-cols-3 grid-cols-1">
        <div className="group relative rounded-2xl border border-gray-200 dark:border-white/10 bg-gray-100 dark:bg-slate-900/50 p-5 shadow-2xl backdrop-blur-md transition-all hover:border-blue-500/30">
          <div className="relative">
            <div className="mb-2 flex items-center justify-between">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/20 text-blue-400">
                <Briefcase size={20} />
              </div>
              <span className="text-2xl font-black text-slate-900 dark:text-white">
                {jobStats?.total || 0}
              </span>
            </div>
            <p className="text-xs font-semibold text-gray-500 dark:text-slate-500 uppercase tracking-widest">
              Total Jobs Posted
            </p>
          </div>
        </div>

        <div className="group relative rounded-2xl border border-gray-200 dark:border-white/10 bg-gray-100 dark:bg-slate-900/50 p-5 shadow-2xl backdrop-blur-md transition-all hover:border-emerald-500/30">
          <div className="relative">
            <div className="mb-2 flex items-center justify-between">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-400">
                <CheckCircle size={20} />
              </div>
              <span className="text-2xl font-black text-slate-900 dark:text-white">
                {jobStats?.open || 0}
              </span>
            </div>
            <p className="text-xs font-semibold text-gray-500 dark:text-slate-500 uppercase tracking-widest">
              Active Postings
            </p>
          </div>
        </div>

        <div className="group relative rounded-2xl border border-gray-200 dark:border-white/10 bg-gray-100 dark:bg-slate-900/50 p-5 shadow-2xl backdrop-blur-md transition-all hover:border-amber-500/30">
          <div className="relative">
            <div className="mb-2 flex items-center justify-between">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/20 text-amber-400">
                <Clock size={20} />
              </div>
              <span className="text-2xl font-black text-slate-900 dark:text-white">
                {(jobStats?.draft || 0) + (jobStats?.closed || 0)}
              </span>
            </div>
            <p className="text-xs font-semibold text-gray-500 dark:text-slate-500 uppercase tracking-widest">
              Drafts / Closed
            </p>
          </div>
        </div>
      </section>

      {/* Recruiter Jobs List Preview */}
      <div className="rounded-2xl border border-gray-200 dark:border-white/10 bg-gray-100 dark:bg-slate-900/50 overflow-hidden backdrop-blur-md">
        <div className="border-b border-gray-100 dark:border-white/5 bg-gray-50 dark:bg-white/5 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <LayoutDashboard className="text-blue-400" size={20} />
            <h2 className="text-lg font-bold">Recent Job Postings</h2>
          </div>
          <Link
            to="/recruiter/jobs"
            className="text-xs font-medium text-blue-400 hover:underline"
          >
            View All
          </Link>
        </div>

        <div className="p-6">
          {recruiterJobs.length === 0 ? (
            <div className="py-12 flex flex-col items-center justify-center text-center">
              <div className="h-16 w-16 bg-slate-800 rounded-full flex items-center justify-center mb-4 text-gray-500 dark:text-slate-500">
                <Briefcase size={32} />
              </div>
              <h3 className="text-xl font-semibold mb-2">
                No jobs posted yet
              </h3>
              <p className="text-slate-400 max-w-sm mb-6">
                Start recruiting top talent by posting your first job
                opening today.
              </p>
              <Link
                to="/recruiter/jobs/new"
                className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-3 font-bold text-white transition hover:bg-blue-500"
              >
                <PlusCircle size={18} />
                Post a New Job
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {recruiterJobs.slice(0, 3).map((job, idx) => (
                <div
                  key={job.id || idx}
                  className="flex items-center justify-between p-4 rounded-xl bg-white/80 dark:bg-slate-800/50 border border-gray-200 dark:border-white/5 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-400">
                      <Target size={20} />
                    </div>
                    <div>
                      <h4 className="font-bold text-gray-900 dark:text-slate-100">
                        {job.title || job.designation}
                      </h4>
                      <p className="text-xs text-gray-500 dark:text-slate-500">
                        {typeof job.location === "object"
                          ? `${job.location.city || ""}${job.location.city && job.location.state ? ", " : ""}${job.location.state || ""} ${job.location.remote ? "(Remote)" : ""}`.trim() ||
                            "Remote"
                          : job.location || "Remote"}{" "}
                        •{" "}
                        {new Date(job.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                      job.status === "open" || job.status === "active"
                        ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                        : "bg-slate-200 dark:bg-slate-700 text-gray-700 dark:text-slate-300"
                    }`}
                  >
                    {job.status || "Active"}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default RecruiterDashboard;
