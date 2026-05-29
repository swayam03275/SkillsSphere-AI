// Skeleton placeholder for interview results

const InterviewResultsSkeleton = () => {
  return (
    <div className="results-container animate-pulse">
      {/* Header Section Skeleton */}
      <div className="results-header mb-8">
        <div className="h-8 w-48 bg-gray-200 dark:bg-slate-700 rounded mb-4"></div>
        <div className="results-meta flex gap-2">
          <div className="h-6 w-24 bg-gray-300 dark:bg-slate-800 rounded-full"></div>
          <div className="h-6 w-24 bg-gray-300 dark:bg-slate-800 rounded-full"></div>
          <div className="h-6 w-24 bg-gray-300 dark:bg-slate-800 rounded-full"></div>
        </div>
      </div>

      {/* Overall Score Ring Card Skeleton */}
      <div className="overall-score-card bg-white dark:bg-surface border border-gray-200 dark:border-border rounded-[2rem] p-8 mb-8">
        <div className="flex flex-col items-center mb-8">
          <div className="w-32 h-32 rounded-full bg-gray-200 dark:bg-slate-800 mb-4"></div>
          <div className="h-6 w-20 bg-gray-200 dark:bg-slate-700 rounded"></div>
        </div>

        {/* Score Breakdown - 3 Items */}
        <div className="score-breakdown grid grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="text-center">
              <div className="h-8 w-8 bg-gray-200 dark:bg-slate-700 rounded-full mx-auto mb-2"></div>
              <div className="h-6 w-12 bg-gray-200 dark:bg-slate-700 rounded mx-auto mb-2"></div>
              <div className="h-4 w-16 bg-gray-300 dark:bg-slate-800 rounded mx-auto"></div>
            </div>
          ))}
        </div>
      </div>

      {/* Weak Concepts Card Skeleton */}
      <div className="weak-concepts-card bg-white dark:bg-surface border border-gray-200 dark:border-border rounded-[2rem] p-8 mb-8">
        <div className="flex items-center gap-3 mb-4">
          <div className="h-6 w-6 bg-gray-200 dark:bg-slate-700 rounded"></div>
          <div className="h-6 w-32 bg-gray-200 dark:bg-slate-700 rounded"></div>
        </div>
        <div className="concept-badges flex flex-wrap gap-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-8 w-24 bg-gray-300 dark:bg-slate-800 rounded-full"></div>
          ))}
        </div>
      </div>

      {/* Per-Question Breakdown - Expandable Cards */}
      <div className="space-y-4">
        {Array.from({ length: 4 }).map((_, idx) => (
          <div
            key={idx}
            className="answer-card bg-white dark:bg-surface border border-gray-200 dark:border-border rounded-[2rem] p-6"
          >
            {/* Card Header */}
            <div className="answer-card-header flex justify-between items-center mb-4">
              <div className="flex-1">
                <div className="h-5 w-3/4 bg-gray-200 dark:bg-slate-700 rounded mb-2"></div>
                <div className="h-4 w-1/2 bg-gray-300 dark:bg-slate-800 rounded"></div>
              </div>
              <div className="flex items-center gap-4">
                <div className="h-6 w-12 bg-gray-200 dark:bg-slate-700 rounded"></div>
                <div className="h-6 w-6 bg-gray-300 dark:bg-slate-800 rounded"></div>
              </div>
            </div>

            {/* Expanded Content Skeleton */}
            <div className="answer-card-body pt-4 border-t border-gray-200 dark:border-border/50">
              <div className="h-4 w-full bg-gray-300 dark:bg-slate-800 rounded mb-3"></div>
              <div className="h-4 w-5/6 bg-gray-300 dark:bg-slate-800 rounded mb-4"></div>

              {/* Score Pills Row */}
              <div className="answer-scores-row flex gap-3 mt-4">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div
                    key={i}
                    className="h-8 w-24 bg-gray-300 dark:bg-slate-800 rounded-full"
                  ></div>
                ))}
              </div>

              {/* Concept Badges */}
              <div className="flex flex-wrap gap-2 mt-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div
                    key={i}
                    className="h-6 w-20 bg-gray-300 dark:bg-slate-800 rounded-full"
                  ></div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Action Buttons Skeleton */}
      <div className="results-actions flex gap-4 mt-8">
        <div className="h-10 w-40 bg-gray-200 dark:bg-slate-700 rounded-lg"></div>
        <div className="h-10 w-40 bg-gray-300 dark:bg-slate-800 rounded-lg"></div>
      </div>
    </div>
  );
};

export default InterviewResultsSkeleton;
