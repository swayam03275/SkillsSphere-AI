import { ErrorState } from "../../../shared/components";
import { Loader2 } from "lucide-react";

export default function MatchScoreCard({ score, error, isLoading, onRetry }) {
  if (error) {
    return (
      <div className="bg-white dark:bg-white/10 backdrop-blur-lg border border-red-200 dark:border-red-900/50 p-6 rounded-2xl shadow-xl text-center">
        <ErrorState
          title="Score Unavailable"
          description={error}
          onRetry={onRetry}
        />
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-white/10 backdrop-blur-lg border border-gray-200 dark:border-white/20 p-6 rounded-2xl shadow-xl flex flex-col items-center justify-center min-h-[160px]">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500 mb-4" />
        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Calculating Score...</p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-white/10 backdrop-blur-lg border border-gray-200 dark:border-white/20 p-6 rounded-2xl shadow-xl text-gray-900 dark:text-white text-center">

      {/* Heading */}
      <h3 className="text-lg font-semibold mb-4 text-indigo-600 dark:text-indigo-300">
        🎯 Match Score
      </h3>

      {/* Score Number */}
      <div className="text-5xl font-bold bg-gradient-to-r from-blue-500 dark:from-blue-400 to-indigo-500 dark:to-indigo-400 text-transparent bg-clip-text">
        {score}%
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-gray-200 dark:bg-gray-700 h-2 rounded mt-4">
        <div
          className="bg-gradient-to-r from-blue-500 to-indigo-500 h-2 rounded transition-all duration-500 w-[var(--tw-width)]"
          style={{ '--tw-width': `${score}%` }}
        />
      </div>

    </div>
  );
}