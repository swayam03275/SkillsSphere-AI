// @ts-nocheck

import React from 'react';
import { CheckCircle2, Clock, XCircle, UserCheck, MessageSquare } from 'lucide-react';

export interface StatusTimelineProps {
  history?: any[];
  status: string;
  comment?: string;
  updatedAt?: string;
}


const STATUS_ICONS = {
  pending: { icon: Clock, color: 'text-yellow-400', bg: 'bg-yellow-400/10' },
  reviewed: { icon: MessageSquare, color: 'text-blue-400', bg: 'bg-blue-400/10' },
  shortlisted: { icon: UserCheck, color: 'text-emerald-400', bg: 'bg-emerald-400/10' },
  rejected: { icon: XCircle, color: 'text-red-400', bg: 'bg-red-400/10' },
  withdrawn: { icon: XCircle, color: 'text-slate-400', bg: 'bg-slate-400/10' },
};

const StatusTimeline = ({ history = [] }) => {
  if (!history || history.length === 0) {
    return (
      <div className="text-center py-4 text-slate-500 text-sm italic">
        No status history available.
      </div>
    );
  }

  // Sort history by date descending (newest at top)
  const sortedHistory = [...history].sort((a, b) => 
    new Date(b.updatedAt || b.date) - new Date(a.updatedAt || a.date)
  );

  return (
    <div className="relative space-y-8 before:absolute before:inset-0 before:ml-5 before:-translate-x-px before:h-full before:w-0.5 before:bg-gradient-to-b before:from-blue-500/50 before:via-purple-500/30 before:to-transparent">
      {sortedHistory.map((entry, index) => {
        const config = STATUS_ICONS[entry.status] || STATUS_ICONS.pending;
        const Icon = config.icon;
        const isLatest = index === 0;

        return (
          <div key={entry._id || index} className="relative flex items-start group">
            {/* Timeline Dot/Icon */}
            <div className={`flex items-center justify-center w-10 h-10 rounded-full border border-white/10 ${config.bg} z-10 shrink-0 transition-transform duration-300 group-hover:scale-110 shadow-lg`}>
              <Icon size={18} className={config.color} />
            </div>

            {/* Content */}
            <div className="ml-6 pt-0.5">
              <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 mb-1">
                <span className={`text-sm font-bold uppercase tracking-wider ${config.color}`}>
                  {entry.status}
                </span>
                <span className="text-xs text-slate-500">
                  {new Date(entry.updatedAt || entry.date).toLocaleString('en-IN', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </span>
                {isLatest && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20 uppercase">
                    Current
                  </span>
                )}
              </div>
              
              <div className="bg-slate-900/40 border border-white/5 rounded-xl p-4 mt-2 max-w-xl shadow-inner">
                <p className="text-sm text-slate-300 leading-relaxed italic">
                  &ldquo;{entry.comment || `Application status changed to ${entry.status}.`}&rdquo;
                </p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};


export default StatusTimeline;
