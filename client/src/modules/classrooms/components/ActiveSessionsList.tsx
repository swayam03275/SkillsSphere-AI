// @ts-nocheck

import React from "react";
import { BookOpen, Users, ArrowRight } from "lucide-react";

export const ActiveSessionsList = ({
  sessions,
  isListLoading,
  onRefresh,
  navigate,
}) => {
  return (
    <div className="bg-gray-50 dark:bg-slate-900/40 backdrop-blur-md border border-gray-200 dark:border-slate-800/80 rounded-2xl p-6 shadow-xl min-h-[400px] flex flex-col">
      <div className="flex justify-between items-center mb-6 border-b border-gray-200 dark:border-slate-800/80 pb-4">
        <h3 className="text-xl font-bold flex items-center space-x-2">
          <span>Active Live Classrooms</span>
          <span className="bg-indigo-500/10 text-indigo-400 text-xs px-2.5 py-0.5 rounded-full border border-indigo-500/20 font-mono animate-[pulse_2s_infinite]">
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
          <p className="text-sm">Scanning for active learning rooms...</p>
        </div>
      ) : sessions.length === 0 ? (
        <div className="flex-grow flex flex-col space-y-6">
          <div className="flex flex-col items-center justify-center text-gray-500 dark:text-slate-500 py-6 text-center">
            <BookOpen size={48} className="text-gray-400 dark:text-slate-700 mb-4" />
            <p className="font-semibold text-gray-600 dark:text-slate-400">No active classrooms right now</p>
            <p className="text-xs text-gray-500 dark:text-slate-600 max-w-xs mt-1">
              Tutors haven't started any public classes yet. Check out the guidelines on the left to join a custom room.
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-4 max-h-[480px] overflow-y-auto pr-1">
          {sessions.map((session) => (
            <div 
              key={session.roomId}
              className="bg-gray-100 dark:bg-slate-950/60 border border-gray-200 dark:border-slate-800 hover:border-gray-300 dark:hover:border-slate-700 rounded-xl p-4 transition-all flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 group hover:shadow-[0_0_15px_rgba(99,102,241,0.1)]"
            >
              <div className="space-y-2 max-w-[70%] text-left">
                <div className="flex items-center space-x-2">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                  <h4 className="font-semibold text-gray-800 dark:text-slate-200 truncate">{session.title}</h4>
                </div>

                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500 dark:text-slate-500 font-mono">
                  {session.subject && (
                    <span className="flex items-center space-x-1">
                      <BookOpen size={12} className="text-gray-500 dark:text-slate-600" />
                      <span>{session.subject}</span>
                    </span>
                  )}
                  <span className="flex items-center space-x-1">
                    <Users size={12} className="text-gray-500 dark:text-slate-600" />
                    <span>Max {session.maxParticipants} students</span>
                  </span>
                </div>

                {/* Host/Tutor details */}
                {session.host && (
                  <div className="flex items-center space-x-2 pt-1">
                    {session.host.profilePic ? (
                      <img 
                        src={session.host.profilePic} 
                        alt={session.host.name} 
                        className="w-5 h-5 rounded-full object-cover border border-gray-200 dark:border-slate-800"
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.src = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(session.host.name)}`;
                        }}
                      />
                    ) : (
                      <div className="w-5 h-5 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center text-[10px] font-bold border border-indigo-500/10">
                        {session.host.name?.charAt(0)?.toUpperCase()}
                      </div>
                    )}
                    <span className="text-xs text-gray-600 dark:text-slate-400">
                      Hosted by <span className="text-gray-700 dark:text-slate-300 font-medium">{session.host.name}</span>
                    </span>
                    <span className="text-[9px] bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-1.5 py-0.2 rounded uppercase tracking-wider font-semibold font-mono scale-90 origin-left">
                      Tutor
                    </span>
                  </div>
                )}
              </div>

              <div className="flex items-center space-x-2 self-end sm:self-auto flex-shrink-0">
                <button
                  onClick={() => navigate(`/classrooms/${session.roomId}`)}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold shadow-[0_2px_10px_rgba(99,102,241,0.2)] hover:shadow-[0_4px_15px_rgba(99,102,241,0.3)] transition-all flex items-center space-x-1 active:scale-[0.97] border-none cursor-pointer"
                >
                  <span>Enter Room</span>
                  <ArrowRight size={12} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
export default ActiveSessionsList;
