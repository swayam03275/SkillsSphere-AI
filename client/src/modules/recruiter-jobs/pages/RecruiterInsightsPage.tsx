
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { ArrowLeft, Search, Filter, TrendingUp, Users, Award, Briefcase, Sparkles } from "lucide-react";
import Navbar from "../../../shared/components/Navbar";
import Button from "../../../shared/components/Button";
import Input from "../../../shared/components/Input";
import LoadingState from "../../../shared/components/LoadingState";
import ErrorState from "../../../shared/components/ErrorState";
import EmptyState from "../../../shared/components/EmptyState";
import { Pagination } from "../../../shared/components";
import Footer from "../../../shared/components/Footer";
import { apiRequest } from "../../../services/apiClient";
import { useDocumentTitle } from "../../../hooks/useDocumentTitle";

const STATUS_FILTERS = [
  { value: "all", label: "All Statuses" },
  { value: "pending", label: "Pending" },
  { value: "reviewed", label: "Reviewed" },
  { value: "shortlisted", label: "Shortlisted" },
  { value: "rejected", label: "Rejected" },
];

const CATEGORY_FILTERS = [
  { value: "all", label: "All Match Types" },
  { value: "Excellent Match", label: "Excellent Match" },
  { value: "Moderate Match", label: "Moderate Match" },
  { value: "Growth Potential", label: "Growth Potential" },
  { value: "Weak Alignment", label: "Weak Alignment" },
];

const RecruiterInsightsPage = ({ jobId: propJobId }) => {
  useDocumentTitle("Recruiter Insights");
  const navigate = useNavigate();
  const { token } = useSelector((state: any) => state.auth);
  const [job, setJob] = useState(null);
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [minScore, setMinScore] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  const jobId = propJobId;

  const fetchInsights = async (page = 1) => {
    if (!jobId) {
      setLoading(false);
      setError("Missing job id for insights view.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      params.append("view", "insights");
      params.append("page", String(page));
      params.append("limit", "8");

      if (searchTerm) {
        params.append("search", searchTerm);
      }

      if (statusFilter !== "all") {
        params.append("status", statusFilter);
      }

      if (categoryFilter !== "all") {
        params.append("matchCategory", categoryFilter);
      }

      if (minScore) {
        params.append("minScore", minScore);
      }

      const response = await apiRequest(`/api/jobs/${jobId}/applications?${params.toString()}`, {
        token,
      });

      setJob(response.job || null);
      setCandidates(response.candidates || []);
      setCurrentPage(response.currentPage || page);
      setTotalPages(response.totalPages || 1);
      setTotalCount(response.totalCount || 0);
    } catch (err: any) {
      setError(err.message || "Failed to load recruiter insights.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInsights(1);
  }, [jobId]);

  const handleApplyFilters = (event) => {
    event.preventDefault();
    setCurrentPage(1);
    fetchInsights(1);
  };

  const handlePageChange = (nextPage) => {
    setCurrentPage(nextPage);
    fetchInsights(nextPage);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const averageScore = candidates.length > 0
    ? Math.round(candidates.reduce((sum, candidate) => sum + (candidate.aiMatchScore || 0), 0) / candidates.length)
    : 0;

  return (
    <div className="min-h-screen bg-gray-50/50 dark:bg-[#09090b] text-gray-900 dark:text-text-main font-sans pt-20 flex flex-col">
      <Navbar />

      <main className="flex-grow flex flex-col items-center justify-start px-4 sm:px-6 lg:px-8 pb-12 animate-fade-in relative overflow-hidden w-full">
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
          <div className="absolute -top-[10%] -left-[5%] w-[40%] h-[40%] rounded-full bg-blue-100/40 dark:bg-blue-900/10 blur-[120px]" />
          <div className="absolute top-[20%] -right-[5%] w-[35%] h-[35%] rounded-full bg-purple-100/40 dark:bg-purple-900/10 blur-[100px]" />
          <div className="absolute top-[5%] right-[20%] w-[35%] h-[35%] rounded-full bg-teal-50/40 dark:bg-teal-900/10 blur-[100px]" />
        </div>

        <div className="w-full max-w-[1200px] relative z-10 flex flex-col gap-6">
          <div className="py-6">
            <button
              type="button"
              onClick={() => navigate("/recruiter/jobs")}
              className="inline-flex items-center gap-2 text-sm font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors"
            >
              <ArrowLeft size={16} />
              Back to Jobs
            </button>
          </div>

          <div className="text-center space-y-4 mb-6 relative">
            <div className="hidden md:flex absolute top-4 left-4 xl:left-8 w-14 h-14 bg-purple-50 dark:bg-purple-500/10 border border-purple-100 dark:border-purple-500/20 rounded-2xl items-center justify-center shadow-sm transform -rotate-3 hover:rotate-0 transition-transform">
               <Briefcase className="w-6 h-6 text-purple-600" />
            </div>
            <div className="hidden md:flex absolute top-8 right-4 xl:right-8 w-14 h-14 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-100 dark:border-emerald-500/20 rounded-2xl items-center justify-center shadow-sm transform rotate-3 hover:rotate-0 transition-transform">
               <Award className="w-6 h-6 text-emerald-600" />
            </div>

            <div className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-purple-50 dark:bg-purple-500/10 border border-purple-100 dark:border-purple-500/20 shadow-sm text-[11px] font-bold text-purple-600 dark:text-purple-400 mx-auto tracking-wide uppercase">
              <Sparkles size={12} className="text-purple-500" /> CANDIDATE MATCHING
            </div>
            
            <h1 className="text-4xl md:text-5xl font-black text-gray-900 dark:text-white tracking-tight">
              <span className="bg-gradient-to-r from-blue-600 via-purple-500 to-teal-400 bg-clip-text text-transparent">Recruiter</span> Insights
            </h1>
            
            <p className="text-gray-500 dark:text-gray-400 text-[15px] max-w-2xl mx-auto font-medium">
              Ranked candidates for <span className="text-indigo-600 dark:text-indigo-400 font-bold">{job?.title || "this job posting"}</span>.
            </p>
          </div>

        {loading ? (
          <div className="rounded-3xl border border-gray-100 dark:border-white/5 bg-white dark:bg-[#121214] p-6 shadow-sm">
            {/* @ts-expect-error TODO: Fix pervasive types */}
            <LoadingState message="Loading ranked candidates..." />
          </div>
        ) : error ? (
          <ErrorState description={error} onRetry={() => fetchInsights(1)} />
        ) : !job ? (
          <EmptyState
            icon={<Users size={48} className="text-slate-600" />}
            title="No job found"
            description="The selected job could not be loaded."
            action={
              // @ts-expect-error TODO: Fix pervasive types
              <Button
                variant="primary"
                className="bg-blue-600 hover:bg-blue-500 mt-4"
                onClick={() => navigate("/recruiter/jobs")}
              >
                Back to Jobs
              </Button>
            }
          />
        ) : (
          <>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="rounded-3xl border border-gray-100 dark:border-white/5 bg-white dark:bg-[#121214] p-5 shadow-sm">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-xs uppercase tracking-widest text-slate-500">Total Candidates</p>
                    <p className="mt-2 text-3xl font-black text-white">{totalCount}</p>
                  </div>
                  <div className="rounded-xl bg-blue-500/10 p-3 text-blue-300">
                    <Users size={20} />
                  </div>
                </div>
              </div>

              <div className="rounded-3xl border border-gray-100 dark:border-white/5 bg-white dark:bg-[#121214] p-5 shadow-sm">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-xs uppercase tracking-widest text-slate-500">Average Score</p>
                    <p className="mt-2 text-3xl font-black text-white">{averageScore}%</p>
                  </div>
                  <div className="rounded-xl bg-emerald-500/10 p-3 text-emerald-300">
                    <TrendingUp size={20} />
                  </div>
                </div>
              </div>

              <div className="rounded-3xl border border-gray-100 dark:border-white/5 bg-white dark:bg-[#121214] p-5 shadow-sm">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-xs uppercase tracking-widest text-slate-500">Top Ranked</p>
                    <p className="mt-2 text-3xl font-black text-white">{candidates[0]?.rank || 0}</p>
                  </div>
                  <div className="rounded-xl bg-amber-500/10 p-3 text-amber-300">
                    <Award size={20} />
                  </div>
                </div>
              </div>
            </div>

            <form
              onSubmit={handleApplyFilters}
              className="flex flex-col gap-4 rounded-3xl border border-gray-100 dark:border-white/5 bg-white dark:bg-[#121214] p-4 shadow-sm lg:flex-row lg:flex-wrap lg:items-end"
            >
              <div className="relative w-full lg:max-w-sm">
                {/* @ts-expect-error TODO: Fix pervasive types */}
                <Input
                  id="candidate-search"
                  placeholder="Search by name, email, notes..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  leftIcon={<Search size={18} />}
                />
              </div>

              <div className="flex w-full flex-col gap-2 sm:w-auto">
                <label className="text-xs font-semibold uppercase tracking-widest text-slate-500">
                  Status
                </label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="rounded-lg border border-slate-700 bg-slate-800/80 px-3 py-2 text-sm text-slate-100 outline-none"
                >
                  {STATUS_FILTERS.map((filter) => (
                    <option key={filter.value} value={filter.value}>
                      {filter.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex w-full flex-col gap-2 sm:w-auto">
                <label className="text-xs font-semibold uppercase tracking-widest text-slate-500">
                  Match Type
                </label>
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="rounded-lg border border-slate-700 bg-slate-800/80 px-3 py-2 text-sm text-slate-100 outline-none"
                >
                  {CATEGORY_FILTERS.map((filter) => (
                    <option key={filter.value} value={filter.value}>
                      {filter.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex w-full flex-col gap-2 sm:w-auto">
                <label className="text-xs font-semibold uppercase tracking-widest text-slate-500">
                  Min Score
                </label>
                {/* @ts-expect-error TODO: Fix pervasive types */}
                <Input
                  id="min-score"
                  type="number"
                  min="0"
                  max="100"
                  placeholder="0"
                  value={minScore}
                  onChange={(e) => setMinScore(e.target.value)}
                  leftIcon={<Filter size={18} />}
                />
              </div>

              <div className="flex gap-2">
                {/* @ts-expect-error TODO: Fix pervasive types */}
                <Button
                  type="submit"
                  variant="primary"
                  className="bg-blue-600 hover:bg-blue-500"
                >
                  Apply Filters
                </Button>
                {/* @ts-expect-error TODO: Fix pervasive types */}
                <Button
                  type="button"
                  variant="secondary"
                  className="border border-slate-700 bg-slate-800/80 text-slate-500 dark:text-slate-200 hover:bg-slate-700"
                  onClick={() => {
                    setSearchTerm("");
                    setStatusFilter("all");
                    setCategoryFilter("all");
                    setMinScore("");
                    setCurrentPage(1);
                    fetchInsights(1);
                  }}
                >
                  Reset
                </Button>
              </div>
            </form>

            {candidates.length === 0 ? (
              // @ts-expect-error TODO: Fix pervasive types
              <EmptyState
                icon={<Briefcase size={48} className="text-slate-600" />}
                title="No ranked candidates found"
                description="Try adjusting the filters to surface more candidates."
              />
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {candidates.map((candidate) => (
                  <article
                    key={candidate._id}
                    className="rounded-3xl border border-gray-100 dark:border-white/5 bg-white dark:bg-[#121214] p-5 shadow-sm"
                  >
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div className="space-y-3">
                        <div className="flex flex-wrap items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10 text-blue-300 font-bold">
                            #{candidate.rank}
                          </div>
                          <div>
                            <h3 className="text-lg font-bold text-white">
                              {candidate.applicant?.name || "Unknown Candidate"}
                            </h3>
                            <p className="text-sm text-slate-400">
                              {candidate.applicant?.email || "No email available"}
                            </p>
                          </div>
                          <span className="rounded-full border border-white/10 bg-gray-50 dark:bg-white/5 px-3 py-1 text-xs font-semibold text-slate-600 dark:text-slate-300">
                            {candidate.status}
                          </span>
                        </div>

                        <div className="flex flex-wrap gap-2 text-xs font-semibold">
                          <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-emerald-300">
                            {candidate.aiMatchScore != null ? `${candidate.aiMatchScore}% Match` : "No score yet"}
                          </span>
                          {candidate.matchCategory && (
                            <span className="rounded-full bg-blue-500/10 px-3 py-1 text-blue-300">
                              {candidate.matchCategory}
                            </span>
                          )}
                          {candidate.resume?.fileName && (
                            <span className="rounded-full bg-slate-500/10 px-3 py-1 text-slate-600 dark:text-slate-300">
                              Resume attached
                            </span>
                          )}
                        </div>

                        <div className="grid gap-3 sm:grid-cols-2">
                          <div className="rounded-xl border border-white/10 bg-slate-950/30 p-3">
                            <p className="text-xs uppercase tracking-widest text-slate-500">Insights</p>
                            <ul className="mt-2 space-y-1 text-sm text-slate-600 dark:text-slate-300">
                              {(candidate.aiRecruiterInsights || []).slice(0, 3).map((item, index) => (
                                <li key={index}>• {item}</li>
                              ))}
                              {(candidate.aiRecruiterInsights || []).length === 0 && (
                                <li>No recruiter insights available.</li>
                              )}
                            </ul>
                          </div>

                          <div className="rounded-xl border border-white/10 bg-slate-950/30 p-3">
                            <p className="text-xs uppercase tracking-widest text-slate-500">Weaknesses</p>
                            <ul className="mt-2 space-y-1 text-sm text-slate-600 dark:text-slate-300">
                              {(candidate.aiWeaknesses || []).slice(0, 3).map((item, index) => (
                                <li key={index}>• {item}</li>
                              ))}
                              {(candidate.aiWeaknesses || []).length === 0 && (
                                <li>No weaknesses flagged.</li>
                              )}
                            </ul>
                          </div>
                        </div>
                      </div>

                      <div className="min-w-[180px] rounded-2xl border border-white/10 bg-gray-50 dark:bg-slate-950/40 p-4 text-center">
                        <p className="text-xs uppercase tracking-widest text-slate-500">Candidate Score</p>
                        <p className="mt-3 text-4xl font-black text-white">
                          {candidate.aiMatchScore != null ? candidate.aiMatchScore : 0}
                        </p>
                        <p className="mt-1 text-xs text-slate-400">out of 100</p>
                        <div className="mt-4 rounded-xl bg-slate-800/70 px-3 py-2 text-xs text-slate-600 dark:text-slate-300">
                          Applied {candidate.createdAt ? new Date(candidate.createdAt).toLocaleDateString() : "recently"}
                        </div>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}

            {totalPages > 1 && (
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={handlePageChange}
              />
            )}
          </>
        )}
      </div>
      </main>
      <Footer />
    </div>
  );
};

export default RecruiterInsightsPage;