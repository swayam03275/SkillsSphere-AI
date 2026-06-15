import React from "react";
const StatCard = ({ icon: Icon, label, value, color, className = "" }) => {
  const colorVariants = {
    blue: "border-blue-500/30 from-blue-500/5 text-blue-400 bg-blue-500/20",
    emerald: "border-emerald-500/30 from-emerald-500/5 text-emerald-400 bg-emerald-500/20",
    violet: "border-violet-500/30 from-violet-500/5 text-violet-400 bg-violet-500/20",
    amber: "border-amber-500/30 from-amber-500/5 text-amber-400 bg-amber-500/20",
  };

  const selectedColor = colorVariants[color] || colorVariants.blue;

  return (
    <div className={`group relative rounded-2xl border border-gray-200 dark:border-white/10 bg-gray-100 dark:bg-slate-900/50 p-5 shadow-2xl backdrop-blur-md transition-all hover:${selectedColor.split(' ')[0]} ${className}`}>
      <div className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${selectedColor.split(' ')[1]} to-transparent opacity-0 group-hover:opacity-100 transition-opacity`}></div>
      <div className="relative">
        <div className={`mb-4 flex h-12 w-12 items-center justify-center rounded-xl ${selectedColor.split(' ').slice(3).join(' ')} group-hover:scale-110 transition-transform`}>
          <Icon size={24} />
        </div>
        <p className="text-xs font-semibold text-gray-500 dark:text-slate-500 uppercase tracking-widest">{label}</p>
        <p className="mt-1 font-bold text-lg text-gray-900 dark:text-slate-100 break-words">{value}</p>
      </div>
    </div>
  );
};

export default StatCard;
