// Skeleton placeholder for dashboard widgets and analytics

const DashboardSkeleton = () => {
  return (
    <div className="w-full space-y-6 animate-pulse">
      {/* Header Section Skeleton */}
      <div className="flex flex-col gap-3 sm:gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="h-4 w-48 bg-slate-700 rounded mb-3"></div>
          <div className="h-10 w-64 bg-slate-700 rounded"></div>
        </div>
        <div className="h-10 w-24 bg-slate-700 rounded"></div>
      </div>

      {/* User Stats Grid - 3 Cards */}
      <div className="grid gap-4 sm:gap-6 md:grid-cols-3 grid-cols-1 sm:grid-cols-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="rounded-2xl border bg-gray-100 dark:bg-slate-900/50 p-5"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="h-8 w-8 bg-slate-700 rounded"></div>
              <div className="h-4 w-24 bg-slate-700 rounded"></div>
            </div>
            <div className="h-6 w-32 bg-slate-700 rounded"></div>
          </div>
        ))}
      </div>

      {/* Recruiter Stats Grid Skeleton (3 Cards) */}
      <div className="grid gap-4 sm:gap-6 md:grid-cols-3 grid-cols-1">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="rounded-2xl border bg-gray-100 dark:bg-slate-900/50 p-5"
          >
            <div className="h-4 w-20 bg-slate-700 rounded mb-3"></div>
            <div className="h-8 w-12 bg-slate-700 rounded mb-3"></div>
            <div className="h-3 w-32 bg-slate-800 rounded"></div>
          </div>
        ))}
      </div>

      {/* Analytics Section - 2 Column Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: 2 columns */}
        <div className="lg:col-span-2 space-y-6">
          {/* Performance Trend Chart Skeleton */}
          <div className="rounded-2xl border bg-gray-100 dark:bg-slate-900/50 overflow-hidden">
            <div className="p-6 flex items-center gap-3 border-b border-border">
              <div className="h-6 w-6 bg-slate-700 rounded"></div>
              <div className="h-5 w-40 bg-slate-700 rounded"></div>
            </div>
            <div className="p-6 h-72 flex items-center justify-center">
              <div className="w-full h-full bg-slate-800 rounded"></div>
            </div>
          </div>

          {/* Skill Trends Bar Chart Skeleton */}
          <div className="rounded-2xl border bg-gray-100 dark:bg-slate-900/50 overflow-hidden">
            <div className="p-6 flex items-center gap-3 border-b border-border">
              <div className="h-6 w-6 bg-slate-700 rounded"></div>
              <div className="h-5 w-40 bg-slate-700 rounded"></div>
            </div>
            <div className="p-6 h-72 bg-slate-800 rounded"></div>
          </div>

          {/* Recent Job Postings Skeleton */}
          <div className="rounded-2xl border bg-gray-100 dark:bg-slate-900/50 overflow-hidden">
            <div className="p-6 flex items-center gap-3 border-b border-border">
              <div className="h-6 w-6 bg-slate-700 rounded"></div>
              <div className="h-5 w-40 bg-slate-700 rounded"></div>
            </div>
            <div className="p-6 space-y-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-16 bg-slate-800 rounded"></div>
              ))}
            </div>
          </div>

          {/* Latest Analysis Summary Skeleton */}
          <div className="rounded-2xl border bg-gray-100 dark:bg-slate-900/50 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-6 w-6 bg-slate-700 rounded"></div>
              <div className="h-5 w-40 bg-slate-700 rounded"></div>
            </div>
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-4 w-full bg-slate-800 rounded"></div>
              ))}
              <div className="h-4 w-3/4 bg-slate-800 rounded"></div>
            </div>
          </div>
        </div>

        {/* Right: 1 column */}
        <div className="space-y-6">
          {/* Recommendations/Suggestions Card Skeleton */}
          <div className="rounded-2xl border bg-gray-100 dark:bg-slate-900/50 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-6 w-6 bg-slate-700 rounded"></div>
              <div className="h-5 w-32 bg-slate-700 rounded"></div>
            </div>
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-12 bg-slate-800 rounded"></div>
              ))}
            </div>
          </div>

          {/* Quick Actions Card Skeleton */}
          <div className="rounded-2xl border bg-gray-100 dark:bg-slate-900/50 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-6 w-6 bg-slate-700 rounded"></div>
              <div className="h-5 w-32 bg-slate-700 rounded"></div>
            </div>
            <div className="flex flex-col gap-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-10 bg-slate-800 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardSkeleton;
