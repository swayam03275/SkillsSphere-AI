import React from 'react';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Tooltip } from 'recharts';

const TopSkillsChart = ({ data }) => {
  return (
    <div className="rounded-xl border border-white/10 bg-slate-900/70 p-4 sm:p-5 shadow-xl backdrop-blur h-full flex flex-col">
      <h3 className="text-lg font-semibold text-white mb-4">Top Skills</h3>
      <div className="flex-1 w-full min-h-[250px] flex items-center justify-center">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart cx="50%" cy="50%" outerRadius="70%" data={data}>
            <PolarGrid stroke="#1e293b" />
            <PolarAngleAxis dataKey="skill" tick={{ fill: '#94a3b8', fontSize: 12 }} />
            <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: '#64748b', fontSize: 10 }} />
            <Tooltip 
              contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '0.5rem', color: '#f8fafc' }}
            />
            <Radar name="Proficiency" dataKey="proficiency" stroke="#10b981" fill="#10b981" fillOpacity={0.4} />
          </RadarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default TopSkillsChart;
