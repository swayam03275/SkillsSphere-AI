// Skeleton placeholder for profile sections

const ProfileSkeleton = () => {
  return (
    <div className="min-h-screen animate-pulse">
      {/* Top Navigation Skeleton */}
      <div className="flex items-center justify-between mb-6">
        <div className="h-6 w-32 bg-gray-200 dark:bg-slate-700 rounded"></div>
        <div className="h-10 w-28 bg-gray-200 dark:bg-slate-700 rounded"></div>
      </div>

      {/* Hero Card Skeleton */}
      <div className="mb-5 overflow-hidden rounded-2xl border border-gray-200 dark:border-border">
        {/* Gradient Banner Skeleton */}
        <div className="h-24 bg-gray-200 dark:bg-slate-700"></div>

        <div className="px-6 pb-6">
          {/* Avatar + Info (Centered) */}
          <div className="flex flex-col items-center text-center -mt-14 mb-4">
            {/* Avatar Skeleton */}
            <div className="h-28 w-28 rounded-full bg-slate-700 mb-3"></div>

            {/* Name + Email */}
            <div className="mt-3 w-full">
              <div className="h-6 w-40 bg-slate-700 rounded mx-auto mb-2"></div>
              <div className="h-4 w-48 bg-gray-300 dark:bg-slate-800 rounded mx-auto"></div>
            </div>

            {/* Badges - 3 badges */}
            <div className="flex flex-wrap gap-2 justify-center mt-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div
                  key={i}
                  className="h-6 w-24 bg-gray-300 dark:bg-slate-800 rounded-full"
                ></div>
              ))}
            </div>

            {/* Edit / Save / Cancel Buttons Skeleton */}
            <div className="flex gap-2 mt-4">
              <div className="h-10 w-28 bg-slate-700 rounded"></div>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Row - 3 Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-5">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="rounded-2xl border border-gray-200 dark:border-border bg-white dark:bg-surface p-4"
          >
            <div className="flex items-center gap-2 mb-2">
              <div className="h-5 w-5 bg-slate-700 rounded"></div>
              <div className="h-3 w-16 bg-slate-700 rounded"></div>
            </div>
            <div className="h-6 w-12 bg-slate-700 rounded mb-2"></div>
            <div className="h-3 w-20 bg-gray-300 dark:bg-slate-800 rounded"></div>
          </div>
        ))}
      </div>

      {/* Tab Navigation Skeleton - 3 Tabs */}
      <div className="flex gap-1 p-1 rounded-xl bg-slate-100 dark:bg-slate-800/60 mb-5">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg h-10 bg-slate-700"
          ></div>
        ))}
      </div>

      {/* Tab Content - Profile Info Card Skeleton */}
      <div className="rounded-2xl border border-gray-200 dark:border-border bg-white dark:bg-surface p-6">
        <div className="h-6 w-32 bg-slate-700 rounded mb-6"></div>

        {/* Info Rows */}
        <div className="space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="flex items-center justify-between py-3 border-b border-gray-200 dark:border-border/50"
            >
              <div className="flex items-center gap-3">
                <div className="h-5 w-5 bg-slate-700 rounded"></div>
                <div className="h-4 w-32 bg-slate-700 rounded"></div>
              </div>
              <div className="h-4 w-40 bg-gray-300 dark:bg-slate-800 rounded"></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ProfileSkeleton;
