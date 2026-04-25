import React from 'react';
import { Link } from 'react-router-dom';
import { FileText, Target, Activity, Star } from 'lucide-react';
import DashboardMetricCard from './DashboardMetricCard';
import SkillProgressChart from './SkillProgressChart';
import TopSkillsChart from './TopSkillsChart';

const MOCK_PROGRESS_DATA = [
  { month: 'Jan', score: 65 },
  { month: 'Feb', score: 68 },
  { month: 'Mar', score: 74 },
  { month: 'Apr', score: 72 },
  { month: 'May', score: 85 },
  { month: 'Jun', score: 88 },
];

const MOCK_SKILLS_DATA = [
  { skill: 'React', proficiency: 90 },
  { skill: 'JavaScript', proficiency: 85 },
  { skill: 'Node.js', proficiency: 75 },
  { skill: 'Python', proficiency: 70 },
  { skill: 'DSA', proficiency: 60 },
];

const StudentDashboardView = ({ user }) => {
  return (
    <div className="flex flex-col gap-6">
      {/* Metrics Row */}
      <section className="grid gap-4 md:grid-cols-3 grid-cols-1 sm:grid-cols-2">
        <DashboardMetricCard 
          title="Average Mock Score" 
          value="88/100" 
          icon={<Target size={20} />} 
          trend="up" 
          trendText="+12% this month" 
          colorClass="bg-blue-500/20 text-blue-300"
        />
        <DashboardMetricCard 
          title="Interviews Completed" 
          value="14" 
          icon={<Activity size={20} />} 
          trend="up" 
          trendText="3 this week"
          colorClass="bg-emerald-500/20 text-emerald-300"
        />
        <DashboardMetricCard 
          title="Top Skill" 
          value="React" 
          icon={<Star size={20} />} 
          colorClass="bg-violet-500/20 text-violet-300"
        />
      </section>

      {/* Charts Row */}
      <section className="grid gap-4 md:grid-cols-2 grid-cols-1">
        <SkillProgressChart data={MOCK_PROGRESS_DATA} />
        <TopSkillsChart data={MOCK_SKILLS_DATA} />
      </section>

      {/* Actions Row */}
      <section className="rounded-xl border border-white/10 bg-slate-900/70 p-4 sm:p-5 shadow-xl backdrop-blur">
        <div className="flex flex-col gap-3 sm:gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg sm:text-xl font-semibold mt-2 sm:mt-0">Continue your workflow</h2>
            <p className="mt-1 text-xs sm:text-sm text-slate-400">
              Pick up your career readiness work from here.
            </p>
          </div>

          <Link
            to="/resume-analyzer"
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-xs sm:text-sm font-semibold text-white transition hover:bg-blue-500 w-full sm:w-auto"
          >
            <FileText size={16} />
            Resume Analyzer
          </Link>
        </div>
      </section>
    </div>
  );
};

export default StudentDashboardView;
