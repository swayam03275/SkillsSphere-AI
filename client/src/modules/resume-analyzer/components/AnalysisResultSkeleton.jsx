import { ErrorState } from "../../../shared/components";

const AnalysisResultSkeleton = ({ error, onRetry }) => {
  if (error) {
    return (
      <div className="w-full bg-white dark:bg-[#121214] rounded-3xl border border-red-200 dark:border-red-900/50 p-8 shadow-sm">
        <ErrorState
          title="Analysis Failed"
          description={error}
          onRetry={onRetry}
        />
      </div>
    );
  }

  return (
    <div className="w-full space-y-4 animate-pulse">

      {/* ATS Score + Match Score row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

        {/* ATS Score skeleton */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <p className="text-xs uppercase tracking-widest text-gray-400 mb-4 font-medium">
            ATS Score
          </p>
          <div className="flex items-center gap-4">
            {/* Circle ring placeholder */}
            <div className="w-[72px] h-[72px] rounded-full bg-gray-200 flex-shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="h-3.5 bg-gray-200 rounded w-3/5" />
              <div className="h-2.5 bg-gray-200 rounded w-2/5" />
            </div>
          </div>
        </div>

        {/* Match Score skeleton */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <p className="text-xs uppercase tracking-widest text-gray-400 mb-4 font-medium">
            Match Score
          </p>
          <div className="flex items-center gap-4">
            <div className="w-[72px] h-[72px] rounded-full bg-gray-200 flex-shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="h-3.5 bg-gray-200 rounded w-3/5" />
              <div className="h-2.5 bg-gray-200 rounded w-2/5" />
            </div>
          </div>
        </div>

      </div>

      {/* Skills skeleton — horizontal bars */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5">
        <p className="text-xs uppercase tracking-widest text-gray-400 mb-4 font-medium">
          Skills
        </p>
        <div className="flex flex-wrap gap-2">
          {[72, 96, 60, 88, 64, 80].map((w, i) => (
            <div
              key={i}
              className="h-7 bg-gray-200 rounded-full w-[var(--tw-width)]"
              style={{ '--tw-width': w }}
            />
          ))}
        </div>
      </div>

      {/* Keywords skeleton — tag-shaped blobs */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5">
        <p className="text-xs uppercase tracking-widest text-gray-400 mb-4 font-medium">
          Keywords
        </p>
        <div className="flex flex-wrap gap-2">
          {[80, 64, 104, 72, 56, 90].map((w, i) => (
            <div
              key={i}
              className="h-6 bg-gray-200 rounded-full w-[var(--tw-width)]"
              style={{ '--tw-width': w }}
            />
          ))}
        </div>
      </div>

      {/* Experience skeleton — bar */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5">
        <p className="text-xs uppercase tracking-widest text-gray-400 mb-4 font-medium">
          Experience
        </p>
        <div className="space-y-2.5">
          <div className="h-3.5 bg-gray-200 rounded w-11/12" />
          <div className="h-3.5 bg-gray-200 rounded w-3/4" />
          <div className="h-3.5 bg-gray-200 rounded w-4/5" />
        </div>
      </div>

    </div>
  );
};

export default AnalysisResultSkeleton;