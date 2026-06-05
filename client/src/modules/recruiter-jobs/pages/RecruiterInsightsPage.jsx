import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { ArrowLeft, Search, Filter, TrendingUp, Users, Award, Briefcase } from "lucide-react";
import Navbar from "../../../shared/landing/Navbar";
import Button from "../../../shared/components/Button";
import Input from "../../../shared/components/Input";
import LoadingState from "../../../shared/components/LoadingState";
import ErrorState from "../../../shared/components/ErrorState";
import EmptyState from "../../../shared/components/EmptyState";
import { Pagination } from "../../../shared/components";
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
  const { token } = useSelector((state) => state.auth);
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
    } catch (err) {
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
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,#0f172a,#020617)] p-3 sm:p-5 pt-20 sm:pt-28 text-slate-100">
      <Navbar />

      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 py-8">
        <div className="flex flex-col gap-4">
          <button
            type="button"
            onClick={() => navigate("/recruiter/jobs")}
            className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-slate-200 transition-colors"
          >
            <ArrowLeft size={16} />
            Back to Jobs
          </button>

          <div className="flex flex-col gap-3">
            <h1 className="text-3xl font-bold text-white">
              Recruiter Insights
            </h1>
            <p className="text-slate-400 max-w-3xl">
              Ranked candidates for {job?.title || "this job posting"}.
            </p>
          </div>
        </div>

        {loading ? (
          <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-6 shadow-lg shadow-black/10">
            <LoadingState message="Loading ranked candidates..." />
          </div>
        ) : error ? (
          <ErrorState message={error} onRetry={() => fetchInsights(1)} />
        ) : !job ? (
          <EmptyState
            icon={<Users size={48} className="text-slate-600" />}
            title="No job found"
            description="The selected job could not be loaded."
            action={
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
              <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-5 shadow-lg shadow-black/10">
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

              <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-5 shadow-lg shadow-black/10">
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

              <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-5 shadow-lg shadow-black/10">
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
              className="flex flex-col gap-4 rounded-xl border border-white/10 bg-slate-900/60 p-4 shadow-lg shadow-black/10 lg:flex-row lg:flex-wrap lg:items-end"
            >
              <div className="relative w-full lg:max-w-sm">
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
                <Button
                  type="submit"
                  variant="primary"
                  className="bg-blue-600 hover:bg-blue-500"
                >
                  Apply Filters
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  className="border border-slate-700 bg-slate-800/80 text-slate-200 hover:bg-slate-700"
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
                    className="rounded-2xl border border-white/10 bg-slate-900/60 p-5 shadow-lg shadow-black/10"
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
                          <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold text-slate-300">
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
                            <span className="rounded-full bg-slate-500/10 px-3 py-1 text-slate-300">
                              Resume attached
                            </span>
                          )}
                        </div>

                        <div className="grid gap-3 sm:grid-cols-2">
                          <div className="rounded-xl border border-white/10 bg-slate-950/30 p-3">
                            <p className="text-xs uppercase tracking-widest text-slate-500">Insights</p>
                            <ul className="mt-2 space-y-1 text-sm text-slate-300">
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
                            <ul className="mt-2 space-y-1 text-sm text-slate-300">
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

                      <div className="min-w-[180px] rounded-2xl border border-white/10 bg-slate-950/40 p-4 text-center">
                        <p className="text-xs uppercase tracking-widest text-slate-500">Candidate Score</p>
                        <p className="mt-3 text-4xl font-black text-white">
                          {candidate.aiMatchScore != null ? candidate.aiMatchScore : 0}
                        </p>
                        <p className="mt-1 text-xs text-slate-400">out of 100</p>
                        <div className="mt-4 rounded-xl bg-slate-800/70 px-3 py-2 text-xs text-slate-300">
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
  );
};

export default RecruiterInsightsPage;