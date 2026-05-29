// Skeleton placeholder for profile sections

const ProfileSkeleton = () => {
  return (
    <div className="min-h-screen animate-pulse">
      <div className="flex items-center justify-between mb-6">
        <div className="h-6 w-32 bg-gray-200 dark:bg-slate-700 rounded" />
        <div className="h-10 w-28 bg-gray-200 dark:bg-slate-700 rounded" />
      </div>

      <div className="mb-5 overflow-hidden rounded-2xl border border-gray-200 dark:border-border">
        <div className="h-24 bg-gray-200 dark:bg-slate-700" />
        <div className="p-6 space-y-4">
          <div className="h-6 w-40 bg-gray-200 dark:bg-slate-700 rounded mx-auto" />
          <div className="h-4 w-48 bg-gray-300 dark:bg-slate-800 rounded mx-auto" />
          <div className="flex flex-wrap gap-2 justify-center">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="h-6 w-24 bg-gray-300 dark:bg-slate-800 rounded-full"
              />
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-5">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="rounded-2xl border border-gray-200 dark:border-border bg-white dark:bg-surface p-4"
          >
            <div className="h-5 w-16 bg-gray-200 dark:bg-slate-700 rounded mb-2" />
            <div className="h-6 w-12 bg-gray-200 dark:bg-slate-700 rounded mb-2" />
            <div className="h-3 w-20 bg-gray-300 dark:bg-slate-800 rounded" />
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-gray-200 dark:border-border bg-white dark:bg-surface p-6">
        <div className="h-6 w-32 bg-gray-200 dark:bg-slate-700 rounded mb-6" />
        <div className="space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="flex items-center justify-between py-3 border-b border-gray-200 dark:border-border/50"
            >
              <div className="h-4 w-32 bg-gray-200 dark:bg-slate-700 rounded" />
              <div className="h-4 w-40 bg-gray-300 dark:bg-slate-800 rounded" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ProfileSkeleton;
