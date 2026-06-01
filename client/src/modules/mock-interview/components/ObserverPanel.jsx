import React, { useState } from "react";
import { Users, FileText, Send, Eye } from "lucide-react";
export default function ObserverPanel({ participants, onSendFeedback, isConductor }) {
  const [note, setNote] = useState("");
  const [savedNotes, setSavedNotes] = useState([]);

  const handleSend = () => {
    if (note.trim()) {
      onSendFeedback(note);
      setSavedNotes([...savedNotes, { text: note, time: new Date().toLocaleTimeString() }]);
      setNote("");
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl p-4 ml-6 w-80 flex flex-col h-[calc(100vh-120px)] shadow-2xl shrink-0 animate-fade-in hidden lg:flex">
      <div className="flex items-center gap-2 border-b border-gray-200 dark:border-slate-800 pb-3 mb-4">
        <div className="p-1.5 bg-indigo-500/20 rounded">
          <Eye className="w-4 h-4 text-indigo-400" />
        </div>
        <h3 className="text-gray-900 dark:text-white font-bold">Observer Mode</h3>
      </div>
      
      <div className="mb-6">
        <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Room Participants</h4>
        <div className="space-y-2 max-h-32 overflow-y-auto">
          {participants.length === 0 ? (
            <p className="text-xs text-slate-500 italic">No one else in room</p>
          ) : (
            participants.map(p => (
              <div key={p.socketId} className="flex justify-between items-center bg-gray-50 dark:bg-slate-800/50 p-2 rounded-lg border border-gray-200 dark:border-slate-700/50">
                <span className="text-xs font-bold text-gray-700 dark:text-slate-300 truncate max-w-[150px]">{p.user?.name}</span>
                <span className={`text-[8px] uppercase font-black px-1.5 py-0.5 rounded ${p.user?.role === 'candidate' || p.user?.role === 'student' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-indigo-500/20 text-indigo-400'}`}>
                  {p.user?.role}
                </span>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="flex-1 flex flex-col border-t border-gray-200 dark:border-slate-800 pt-4 mt-auto">
        <h4 className="text-xs font-bold text-slate-400 uppercase mb-2 flex items-center gap-1">
          <FileText className="w-3 h-3" /> Live Notes & Feedback
        </h4>
        
        <div className="flex-1 overflow-y-auto mb-3 space-y-2 pr-1">
           {savedNotes.map((n, i) => (
             <div key={i} className="p-2 bg-gray-50 dark:bg-slate-800/80 rounded-lg border border-gray-200 dark:border-slate-700">
               <span className="text-[8px] text-slate-500 block mb-1">{n.time}</span>
               <p className="text-xs text-gray-700 dark:text-slate-300">{n.text}</p>
             </div>
           ))}
           {savedNotes.length === 0 && (
             <p className="text-xs text-slate-600 italic mt-4 text-center">No notes taken yet.</p>
           )}
        </div>

        <div className="shrink-0">
          <textarea 
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Type private observation notes..."
            className="w-full bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg p-2.5 text-xs text-gray-900 dark:text-white focus:outline-none focus:border-indigo-500 mb-2 resize-none"
            rows={3}
          />
          <button 
            onClick={handleSend}
            disabled={!note.trim()}
            className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:hover:bg-indigo-600 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1 transition-colors"
          >
            <Send className="w-3 h-3" /> Save Note
          </button>
        </div>
      </div>
    </div>
  );
}
