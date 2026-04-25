import React from 'react';

const DashboardMetricCard = ({ title, value, icon, trend, trendText, colorClass = "bg-blue-500/20 text-blue-300" }) => {
  return (
    <div className="rounded-xl border border-white/10 bg-slate-900/70 p-4 sm:p-5 shadow-xl backdrop-blur flex flex-col justify-between h-full">
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm font-medium text-slate-400">{title}</p>
        <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${colorClass}`}>
          {icon}
        </div>
      </div>
      <div>
        <p className="text-2xl sm:text-3xl font-bold text-white mb-1">{value}</p>
        {trendText && (
          <p className={`text-xs sm:text-sm font-medium ${trend === 'up' ? 'text-emerald-400' : trend === 'down' ? 'text-red-400' : 'text-slate-400'}`}>
            {trend === 'up' && '↑ '}
            {trend === 'down' && '↓ '}
            {trendText}
          </p>
        )}
      </div>
    </div>
  );
};

export default DashboardMetricCard;
