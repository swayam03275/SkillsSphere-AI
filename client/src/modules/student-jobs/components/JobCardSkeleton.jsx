// Skeleton placeholder card displayed during jobs loading state

const JobCardSkeleton = () => {
  return (
    <div className="animate-pulse rounded-2xl border border-white/5 bg-slate-900/40 p-6">
      <div className="flex justify-between items-start mb-5">
        <div className="space-y-3 w-2/3">
          <div className="h-5 bg-slate-700 rounded w-3/4"></div>
          <div className="h-4 bg-slate-800 rounded w-1/2"></div>
        </div>

        <div className="h-10 w-24 bg-slate-700 rounded-lg"></div>
      </div>

      <div className="space-y-3 mb-5">
        <div className="h-4 bg-slate-800 rounded"></div>
        <div className="h-4 bg-slate-800 rounded w-5/6"></div>
      </div>

      <div className="flex gap-3">
        <div className="h-8 w-20 bg-slate-700 rounded-full"></div>
        <div className="h-8 w-24 bg-slate-700 rounded-full"></div>
      </div>
    </div>
  );
};

export default JobCardSkeleton;