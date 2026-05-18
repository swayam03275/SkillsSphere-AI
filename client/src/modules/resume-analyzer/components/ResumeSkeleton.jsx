// Skeleton placeholder for resume analysis results

const ResumeSkeleton = () => {
  return (
    <div className="w-full space-y-8 animate-pulse">
      {/* AI Intelligence Banner Skeleton */}
      <div className="flex justify-center">
        <div className="h-10 w-64 bg-slate-800 rounded-full"></div>
      </div>

      {/* Main Score & Metrics Grid (3 columns) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Col 1: Trust Score Card Skeleton */}
        <div className="bg-surface border border-border rounded-[2rem] p-8">
          <div className="flex flex-col items-center">
            <div className="h-16 w-16 bg-slate-700 rounded-full mb-4"></div>
            <div className="h-12 w-20 bg-slate-700 rounded mb-3"></div>
            <div className="h-6 w-24 bg-slate-800 rounded mb-4"></div>
            <div className="h-4 w-32 bg-slate-800 rounded"></div>
          </div>
        </div>

        {/* Col 2: Impact Score Widget Skeleton */}
        <div className="bg-surface border border-border rounded-[2rem] p-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-8 w-8 bg-slate-700 rounded"></div>
            <div className="h-6 w-24 bg-slate-700 rounded"></div>
          </div>
          <div className="h-3 w-full bg-slate-800 rounded mb-3"></div>
          <div className="h-4 w-32 bg-slate-800 rounded"></div>
        </div>

        {/* Col 3: ATS Readiness Checklist Skeleton */}
        <div className="bg-surface border border-border rounded-[2rem] p-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-8 w-8 bg-slate-700 rounded"></div>
            <div className="h-6 w-32 bg-slate-700 rounded"></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-8 bg-slate-800 rounded"></div>
            ))}
          </div>
        </div>
      </div>

      {/* Skill Gap Venn Diagram Skeleton */}
      <div className="bg-surface/50 border border-border rounded-[2rem] p-8">
        <div className="h-8 w-32 bg-slate-700 rounded mb-6"></div>
        <div className="h-64 bg-slate-800 rounded"></div>
      </div>

      {/* Bottom 2-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left: 7 columns */}
        <div className="lg:col-span-7 space-y-8">
          {/* Action Word Suggestions Skeleton */}
          <div className="bg-surface/50 border border-border rounded-[2rem] p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="h-8 w-8 bg-slate-700 rounded"></div>
              <div className="h-6 w-40 bg-slate-700 rounded"></div>
            </div>
            <div className="flex flex-wrap gap-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className="h-8 w-24 bg-slate-800 rounded-full"
                ></div>
              ))}
            </div>
          </div>

          {/* Strategic Improvements Skeleton */}
          <div className="bg-surface/50 border border-border rounded-[2rem] p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="h-8 w-8 bg-slate-700 rounded"></div>
              <div className="h-6 w-40 bg-slate-700 rounded"></div>
            </div>
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-16 bg-slate-800 rounded"></div>
              ))}
            </div>
          </div>
        </div>

        {/* Right: 5 columns */}
        <div className="lg:col-span-5 space-y-8">
          {/* Tech Keyword Gaps Skeleton */}
          <div className="bg-surface/50 border border-border rounded-[2rem] p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="h-8 w-8 bg-slate-700 rounded"></div>
              <div className="h-6 w-40 bg-slate-700 rounded"></div>
            </div>
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-6 bg-slate-800 rounded w-3/4"></div>
              ))}
            </div>
          </div>

          {/* Document Preview Skeleton */}
          <div className="bg-surface/50 border border-border rounded-[2rem] p-8">
            <div className="h-6 w-32 bg-slate-700 rounded mb-4"></div>
            <div className="space-y-3">
              <div className="h-4 bg-slate-800 rounded"></div>
              <div className="h-4 bg-slate-800 rounded w-5/6"></div>
              <div className="h-10 w-32 bg-slate-700 rounded mt-4"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResumeSkeleton;
