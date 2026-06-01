import React from "react";
import { Video, ArrowRight } from "lucide-react";

export const CreateSessionForm = ({
  title,
  setTitle,
  subject,
  setSubject,
  maxParticipants,
  setMaxParticipants,
  isLoading,
  onSubmit,
}) => {
  return (
    <div className="bg-gray-100 dark:bg-slate-900/60 backdrop-blur-md border border-gray-200 dark:border-slate-800/80 rounded-2xl p-6 shadow-xl">
      <div className="bg-indigo-500/10 w-12 h-12 rounded-xl flex items-center justify-center text-indigo-400 border border-indigo-500/20 mb-6">
        <Video size={24} />
      </div>
      <h2 className="text-2xl font-bold mb-1">Create a Session</h2>
      <p className="text-gray-600 dark:text-slate-400 text-sm mb-6">
        Launch a secure, high-quality audio and video learning room.
      </p>

      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label className="block text-gray-700 dark:text-slate-300 text-xs font-semibold uppercase tracking-wider mb-2">
            Session Title
          </label>
          <input
            type="text"
            placeholder="e.g. Advanced JS Concepts"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full bg-white dark:bg-slate-950/80 border border-gray-200 dark:border-slate-800 rounded-xl px-4 py-3 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
            required
          />
        </div>

        <div>
          <label className="block text-gray-700 dark:text-slate-300 text-xs font-semibold uppercase tracking-wider mb-2">
            Subject / Topic
          </label>
          <input
            type="text"
            placeholder="e.g. Computer Science"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            className="w-full bg-white dark:bg-slate-950/80 border border-gray-200 dark:border-slate-800 rounded-xl px-4 py-3 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
          />
        </div>

        <div>
          <label className="block text-gray-700 dark:text-slate-300 text-xs font-semibold uppercase tracking-wider mb-2">
            Max Participants ({maxParticipants})
          </label>
          <input
            type="type" // keep standard range
            type="range"
            min="2"
            max="100"
            value={maxParticipants}
            onChange={(e) => setMaxParticipants(Number(e.target.value))}
            className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
          />
          <div className="flex justify-between text-[10px] text-gray-500 dark:text-slate-500 font-mono mt-1">
            <span>2</span>
            <span>50</span>
            <span>100</span>
          </div>
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full mt-4 py-3.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 disabled:opacity-50 text-white rounded-xl font-semibold transition-all shadow-[0_4px_20px_rgba(99,102,241,0.25)] flex items-center justify-center space-x-2 active:scale-[0.98] border-none cursor-pointer"
        >
          {isLoading ? (
            <span>Launching Room...</span>
          ) : (
            <>
              <span>Start Session</span>
              <ArrowRight size={18} />
            </>
          )}
        </button>
      </form>
    </div>
  );
};
export default CreateSessionForm;
