import React from "react";
import { Users, ArrowRight } from "lucide-react";

export const JoinSessionForm = ({
  joinRoomId,
  setJoinRoomId,
  onSubmit,
}) => {
  return (
    <div className="bg-gray-100 dark:bg-slate-900/60 backdrop-blur-md border border-gray-200 dark:border-slate-800/80 rounded-2xl p-8 shadow-xl">
      <div className="bg-purple-500/10 w-12 h-12 rounded-xl flex items-center justify-center text-purple-400 border border-purple-500/20 mb-6">
        <Users size={24} />
      </div>
      <h2 className="text-2xl font-bold mb-1">Join a Session</h2>
      <p className="text-gray-600 dark:text-slate-400 text-sm mb-6">
        Paste the unique Room ID provided by your tutor to join an ongoing classroom.
      </p>

      <form onSubmit={onSubmit} className="space-y-4">
        <input
          type="text"
          placeholder="e.g. 123e4567-e89b-12d3..."
          value={joinRoomId}
          onChange={(e) => setJoinRoomId(e.target.value)}
          className="w-full bg-white dark:bg-slate-950/80 border border-gray-200 dark:border-slate-800 rounded-xl px-4 py-4 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors font-mono text-sm"
          required
        />
        <button
          type="submit"
          className="w-full py-3.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white rounded-xl font-semibold transition-all shadow-[0_4px_20px_rgba(99,102,241,0.25)] flex items-center justify-center space-x-2 active:scale-[0.98] border-none cursor-pointer"
        >
          <span>Join Classroom</span>
          <ArrowRight size={18} />
        </button>
      </form>
    </div>
  );
};
export default JoinSessionForm;
