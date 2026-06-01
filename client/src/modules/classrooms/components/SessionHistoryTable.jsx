import React from "react";
import { BookOpen, Calendar, Power, Clock } from "lucide-react";

export const SessionHistoryTable = ({
  sessions,
  isListLoading,
  onRefresh,
  onEndSession,
  navigate,
}) => {
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="bg-gray-50 dark:bg-slate-900/40 backdrop-blur-md border border-gray-200 dark:border-slate-800/80 rounded-2xl p-6 shadow-xl min-h-[400px] flex flex-col">
      <div className="flex justify-between items-center mb-6 border-b border-gray-200 dark:border-slate-800/80 pb-4">
        <h3 className="text-xl font-bold flex items-center space-x-2">
          <span>Your Classroom Sessions</span>
          <span className="bg-indigo-500/10 text-indigo-400 text-xs px-2.5 py-0.5 rounded-full border border-indigo-500/20 font-mono">
            {sessions.length}
          </span>
        </h3>
        <button 
          onClick={onRefresh}
          disabled={isListLoading}
          className="text-xs text-indigo-400 hover:text-indigo-300 font-medium transition-colors border-none bg-transparent cursor-pointer"
        >
          Refresh List
        </button>
      </div>

      {isListLoading ? (
        <div className="flex-grow flex flex-col items-center justify-center text-gray-500 dark:text-slate-500 py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500 mb-3"></div>
          <p className="text-sm">Loading session history...</p>
        </div>
      ) : sessions.length === 0 ? (
        <div className="flex-grow flex flex-col items-center justify-center text-gray-500 dark:text-slate-500 py-12 text-center">
          <BookOpen size={48} className="text-gray-400 dark:text-slate-700 mb-4" />
          <p className="font-semibold text-gray-600 dark:text-slate-400">No session history</p>
          <p className="text-xs text-gray-500 dark:text-slate-600 max-w-xs mt-1">
            Your created sessions will be saved here so you can easily enter or manage them.
          </p>
        </div>
      ) : (
        <div className="space-y-4 max-h-[480px] overflow-y-auto pr-1">
          {sessions.map((session) => (
            <div 
              key={session.roomId}
              className="bg-gray-100 dark:bg-slate-950/60 border border-gray-200 dark:border-slate-800 hover:border-gray-300 dark:hover:border-slate-700 rounded-xl p-4 transition-all flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 group"
            >
              <div className="space-y-1 max-w-[70%] text-left">
                <div className="flex items-center space-x-2">
                  <h4 className="font-semibold text-gray-800 dark:text-slate-200 truncate">{session.title}</h4>
                  <span className={`text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded ${
                    session.status === "active" 
                      ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" 
                      : "bg-slate-800 text-gray-600 dark:text-slate-400 border border-slate-700/50"
                  }`}>
                    {session.status}
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500 dark:text-slate-500 font-mono">
                  {session.subject && (
                    <span className="flex items-center space-x-1">
                      <BookOpen size={12} className="text-gray-500 dark:text-slate-600" />
                      <span>{session.subject}</span>
                    </span>
                  )}
                  <span className="flex items-center space-x-1">
                    <Calendar size={12} className="text-gray-500 dark:text-slate-600" />
                    <span>{formatDate(session.createdAt)}</span>
                  </span>
                </div>
              </div>

              <div className="flex items-center space-x-2 self-end sm:self-auto flex-shrink-0">
                {session.status === "active" ? (
                  <>
                    <button
                      onClick={() => navigate(`/classrooms/${session.roomId}`)}
                      className="px-3 py-1.5 bg-indigo-500/10 hover:bg-indigo-500 text-indigo-400 hover:text-white rounded-lg text-xs font-semibold border border-indigo-500/20 transition-all flex items-center space-x-1 cursor-pointer"
                    >
                      <span>Enter Room</span>
                    </button>
                    <button
                      onClick={() => onEndSession(session.roomId)}
                      title="End Session"
                      className="p-2 bg-red-500/10 hover:bg-red-500 text-red-400 hover:text-white rounded-lg border border-red-500/20 transition-all cursor-pointer"
                    >
                      <Power size={14} />
                    </button>
                  </>
                ) : (
                  <span className="text-gray-500 dark:text-slate-600 text-xs font-semibold px-3 py-1.5 flex items-center space-x-1 font-mono">
                    <Clock size={12} />
                    <span>Ended</span>
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
export default SessionHistoryTable;
