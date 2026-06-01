import React from "react";
import { UserCheck, Rocket, GraduationCap, Handshake, Briefcase } from "lucide-react";
const PERSONAS = [
  {
    id: "friendly",
    name: "Friendly Mentor",
    description: "Supportive and beginner-focused. Great for building confidence.",
    icon: <Handshake size={20} />,
    color: "from-emerald-400 to-teal-500",
    bgLight: "bg-emerald-50 text-emerald-600",
    bgDark: "dark:bg-emerald-500/10 dark:text-emerald-400",
    borderActive: "border-emerald-500/50 shadow-[0_0_20px_rgba(16,185,129,0.2)]"
  },
  {
    id: "faang",
    name: "FAANG Interviewer",
    description: "Fast-paced and optimization-heavy. Focuses on edge cases.",
    icon: <Briefcase size={20} />,
    color: "from-blue-500 to-indigo-600",
    bgLight: "bg-blue-50 text-blue-600",
    bgDark: "dark:bg-blue-500/10 dark:text-blue-400",
    borderActive: "border-blue-500/50 shadow-[0_0_20px_rgba(59,130,246,0.2)]"
  },
  {
    id: "startup",
    name: "Startup CTO",
    description: "Practical engineering discussion and architecture focused.",
    icon: <Rocket size={20} />,
    color: "from-purple-500 to-fuchsia-600",
    bgLight: "bg-purple-50 text-purple-600",
    bgDark: "dark:bg-purple-500/10 dark:text-purple-400",
    borderActive: "border-purple-500/50 shadow-[0_0_20px_rgba(168,85,247,0.2)]"
  },
  {
    id: "hr",
    name: "HR Behavioral",
    description: "Focuses on leadership, teamwork, and communication skills.",
    icon: <GraduationCap size={20} />,
    color: "from-amber-400 to-orange-500",
    bgLight: "bg-amber-50 text-amber-600",
    bgDark: "dark:bg-amber-500/10 dark:text-amber-400",
    borderActive: "border-amber-500/50 shadow-[0_0_20px_rgba(245,158,11,0.2)]"
  }
];

const PersonaSelector = ({ selectedPersona, onSelect }) => {
  return (
    <div className="group relative rounded-3xl bg-white/70 dark:bg-slate-900/60 p-6 sm:p-8 border border-white/20 dark:border-slate-800 shadow-[0_20px_40px_rgba(0,0,0,0.08)] dark:shadow-[0_20px_40px_rgba(0,0,0,0.4)] backdrop-blur-xl transition-all duration-300 hover:shadow-[0_20px_50px_rgba(168,85,247,0.1)] hover:border-purple-500/30">
      <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-fuchsia-500/5 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      
      <div className="relative z-10">
        <h3 className="text-xl font-bold flex items-center gap-3 mb-6 text-slate-800 dark:text-slate-100">
          <span className="flex items-center justify-center w-10 h-10 rounded-xl bg-purple-500/10 text-purple-500 dark:bg-purple-500/20 dark:text-purple-400">
            <UserCheck size={22} />
          </span>
          Interviewer Persona
        </h3>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {PERSONAS.map((persona) => {
            const isSelected = selectedPersona === persona.id;
            return (
              <div
                key={persona.id}
                onClick={() => onSelect(persona.id)}
                className={`relative flex items-start gap-4 p-4 rounded-2xl cursor-pointer transition-all duration-300 border ${
                  isSelected 
                    ? `bg-white dark:bg-slate-800 ${persona.borderActive} scale-[1.02]`
                    : "bg-white/50 dark:bg-slate-900/50 border-white/40 dark:border-slate-700/50 hover:bg-white hover:dark:bg-slate-800 hover:scale-[1.01]"
                }`}
              >
                {/* Active Indicator Glow */}
                {isSelected && (
                  <div className="absolute inset-0 rounded-2xl opacity-20 bg-gradient-to-br transition-all duration-500 blur-md pointer-events-none -z-10" />
                )}
                
                <div className={`flex shrink-0 items-center justify-center w-12 h-12 rounded-xl transition-colors duration-300 ${isSelected ? `bg-gradient-to-br ${persona.color} text-white shadow-lg` : `${persona.bgLight} ${persona.bgDark}`}`}>
                  {persona.icon}
                </div>
                
                <div className="flex-1">
                  <h4 className={`font-bold text-sm mb-1 transition-colors ${isSelected ? "text-slate-900 dark:text-white" : "text-slate-700 dark:text-slate-300"}`}>
                    {persona.name}
                  </h4>
                  <p className={`text-[11px] leading-snug transition-colors ${isSelected ? "text-slate-600 dark:text-slate-400 font-medium" : "text-slate-500 dark:text-slate-500"}`}>
                    {persona.description}
                  </p>
                </div>
                
                {/* Selected Checkmark */}
                <div className={`absolute top-3 right-3 w-4 h-4 rounded-full border-2 transition-all duration-300 flex items-center justify-center ${
                  isSelected ? "border-transparent bg-gradient-to-br scale-100 " + persona.color : "border-slate-300 dark:border-slate-600 scale-75"
                }`}>
                  {isSelected && <span className="w-1.5 h-1.5 bg-white rounded-full" />}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default PersonaSelector;
