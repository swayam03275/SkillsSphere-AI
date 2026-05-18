// Skeleton placeholder for interview session loading

const InterviewSessionSkeleton = () => {
  return (
    <div className="session-container animate-pulse">
      {/* Header Bar Skeleton */}
      <div className="session-header">
        <div className="session-meta">
          <div className="h-5 w-24 bg-slate-700 rounded"></div>
          <div className="h-5 w-20 bg-slate-800 rounded-full"></div>
        </div>

        <div className="session-progress">
          <div className="progress-text h-4 w-16 bg-slate-700 rounded mb-2"></div>
          <div className="progress-bar-track">
            <div className="progress-bar-fill h-2 w-1/3 bg-slate-600 rounded"></div>
          </div>
        </div>

        <div className="session-timer h-5 w-12 bg-slate-700 rounded"></div>
      </div>

      {/* Question Area Skeleton */}
      <div className="question-area">
        <div className="question-number h-8 w-12 bg-slate-700 rounded mb-4"></div>
        <div className="space-y-3">
          <div className="h-8 w-3/4 bg-slate-700 rounded"></div>
          <div className="h-6 w-full bg-slate-800 rounded"></div>
          <div className="h-6 w-5/6 bg-slate-800 rounded"></div>
        </div>
      </div>

      {/* Answer Area Skeleton */}
      <div className="answer-area">
        <div className="h-48 bg-slate-800 rounded mb-4"></div>
        <div className="answer-footer flex justify-between items-center">
          <div className="h-4 w-24 bg-slate-800 rounded"></div>
          <div className="h-10 w-32 bg-slate-700 rounded"></div>
        </div>
      </div>
    </div>
  );
};

export default InterviewSessionSkeleton;
