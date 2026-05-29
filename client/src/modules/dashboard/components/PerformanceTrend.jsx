import React from "react";
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip as RechartsTooltip 
} from "recharts";
import { BarChart3, Calendar, Activity } from "lucide-react";
const PerformanceTrend = ({ data, historyLength, customTooltip: CustomTooltip }) => {
  return (
    <div className="rounded-2xl border border-gray-200 dark:border-white/10 bg-gray-100 dark:bg-slate-900/50 overflow-hidden backdrop-blur-md">
      <div className="border-b border-gray-200 dark:border-white/5 bg-gray-50 dark:bg-white/5 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BarChart3 className="text-blue-400" size={20} />
          <h2 className="text-lg font-bold">Performance Trend</h2>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-slate-400 bg-gray-100 dark:bg-white/5 px-2 py-1 rounded-md">
          <Calendar size={12} />
          <span>Last {historyLength} Analyses</span>
        </div>
      </div>
      <div className="p-6 h-[280px] min-h-[280px] w-full">
        {historyLength > 1 ? (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data}>
              <defs>
                <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
              <XAxis 
                dataKey="date" 
                stroke="#94a3b8" 
                fontSize={10} 
                tickLine={false} 
                axisLine={false}
                dy={10}
              />
              <YAxis 
                stroke="#94a3b8" 
                fontSize={10} 
                tickLine={false} 
                axisLine={false}
                domain={[0, 100]}
                tickFormatter={(val) => `${val}%`}
              />
              <RechartsTooltip content={CustomTooltip} />
              <Area 
                type="monotone" 
                dataKey="score" 
                stroke="#3b82f6" 
                strokeWidth={2}
                fillOpacity={1} 
                fill="url(#colorScore)" 
                animationDuration={1500}
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-gray-500 dark:text-slate-500">
            <Activity size={40} className="opacity-20 mb-3" />
            <p className="text-sm">Need at least 2 analyses to show trend</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default PerformanceTrend;
