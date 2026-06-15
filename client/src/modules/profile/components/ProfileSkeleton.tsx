// Skeleton placeholder for profile sections — matches all-sections-visible layout

const ProfileSkeleton = () => {
  return (
    <div className="min-h-screen animate-pulse">
      {/* Top Navigation Skeleton */}
      <div className="flex items-center justify-between mb-6">
        <div className="h-6 w-32 bg-gray-200 dark:bg-slate-700 rounded"></div>
        <div className="h-10 w-28 bg-gray-200 dark:bg-slate-700 rounded"></div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-5">
        <aside>
          {/* Hero Card Skeleton */}
          <div className="mb-5 overflow-hidden rounded-2xl border border-gray-200 dark:border-border">
            {/* Gradient Banner Skeleton */}
            <div className="h-24 bg-gray-200 dark:bg-slate-700"></div>

            <div className="border-t border-gray-100 dark:border-white/5" />

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

            {/* Activity */}
            <div className="px-5 py-4">
              <div className="h-3 w-16 bg-gray-200 dark:bg-slate-700 rounded mb-3" />
              <div className="grid grid-cols-2 gap-2.5">
                {Array.from({ length: 2 }).map((_, i) => (
                  <div key={i} className="bg-gray-50 dark:bg-slate-800/50 rounded-xl p-3 text-center border border-gray-100 dark:border-white/5">
                    <div className="h-5 w-8 bg-gray-200 dark:bg-slate-700 rounded mx-auto mb-1" />
                    <div className="h-3 w-14 bg-gray-100 dark:bg-slate-800 rounded mx-auto" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </aside>

        {/* Right Column — All Sections */}
        <div className="flex flex-col gap-5">
          {/* Header */}
          <div className="flex items-center justify-between bg-white dark:bg-slate-900 p-4 rounded-2xl border border-gray-200 dark:border-white/10 shadow-sm">
            <div className="h-5 w-28 bg-gray-200 dark:bg-slate-700 rounded" />
            <div className="h-9 w-28 bg-gray-200 dark:bg-slate-700 rounded-lg" />
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

          {/* Account Details Card */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-white/10 shadow-sm p-6">
            <div className="h-4 w-28 bg-gray-200 dark:bg-slate-700 rounded mb-5" />
            <div className="flex flex-col divide-y divide-gray-100 dark:divide-white/5">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex items-start gap-3 py-3.5">
                  <div className="h-4 w-4 bg-gray-200 dark:bg-slate-700 rounded mt-0.5" />
                  <div className="flex-1">
                    <div className="h-3 w-20 bg-gray-100 dark:bg-slate-800 rounded mb-1.5" />
                    <div className="h-4 w-48 bg-gray-200 dark:bg-slate-700 rounded" />
                  </div>
                </div>
              ))}
            </div>
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
      </div>
    </div>
  );
};

export default ProfileSkeleton;
