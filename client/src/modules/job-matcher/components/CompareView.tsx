// @ts-nocheck

import { useState, useEffect } from "react";
import { useSelector } from "react-redux";
import { ArrowLeft, Loader2 } from "lucide-react";
import { apiRequest } from "../../../services/apiClient";
import MatchScoreCard from "./MatchScoreCard";
import MissingSkillsList from "./MissingSkillsList";

export default function CompareView({ jobId, resumeSource, onBack }) {
  const { token } = useSelector((state) => state.auth);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);

  useEffect(() => {
    const fetchDetailedScore = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await apiRequest(
          `/api/matching/detailed-score?jobId=${jobId}&resumeSource=${resumeSource}`,
          { token }
        );
        setData(response.data);
      } catch (err) {
        setError(err.message || "Failed to load detailed match score.");
      } finally {
        setLoading(false);
      }
    };
    fetchDetailedScore();
  }, [jobId, resumeSource, token]);

  return (
    <div className="space-y-6">
      <button
        onClick={onBack}
        className="inline-flex items-center gap-2 text-sm text-blue-500 hover:text-blue-400 transition-colors"
      >
        <ArrowLeft size={16} />
        Back to Recommendations
      </button>

      {loading ? (
        <div className="flex items-center justify-center p-12">
          <Loader2 size={32} className="animate-spin text-blue-500" />
        </div>
      ) : error ? (
        <div className="max-w-lg mx-auto text-center p-10 bg-gray-100 dark:bg-slate-900/50 rounded-2xl border border-red-500/20">
          <p className="text-red-600 dark:text-red-300 font-medium">{error}</p>
        </div>
      ) : data ? (
        <>
          <MatchScoreCard score={data.matchScore} />

          <div className="bg-white dark:bg-white/10 backdrop-blur-lg border border-gray-200 dark:border-white/20 p-5 rounded-2xl shadow-xl text-gray-900 dark:text-white">
            <h3 className="text-lg font-semibold mb-4 text-emerald-600 dark:text-emerald-300 flex items-center gap-2">
              ✓ Matching Skills
            </h3>
            <div className="flex flex-wrap gap-3">
              {data.matchingSkills.map((skill, i) => (
                <span
                  key={i}
                  className="px-4 py-1.5 text-sm rounded-full bg-emerald-500/15 border border-emerald-500/25 text-emerald-700 dark:text-emerald-300"
                >
                  {skill}
                </span>
              ))}
            </div>
          </div>

          <MissingSkillsList skills={data.missingSkills} />
        </>
      ) : null}
    </div>
  );
}
