
import { useSelector } from "react-redux";
import { ArrowRight, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
const CTA = () => {
  const { isAuthenticated, user } = useSelector((state: any) => state.auth);
  const isRecruiter = user?.role === "recruiter";
  const cta = isAuthenticated
    ? {
        label: isRecruiter ? "Manage Jobs" : "Open Dashboard",
        path: isRecruiter ? "/recruiter/jobs" : "/dashboard",
      }
    : {
        label: "Create Free Account",
        path: "/register",
      };

  return (
    <section className="relative overflow-hidden px-4 py-24 sm:py-20 max-sm:py-16">
      <div className="container relative z-10">
        <div className="group relative mx-auto max-w-5xl rounded-3xl border border-[var(--border)] bg-slate-950 p-1 overflow-hidden shadow-2xl transition-all duration-500 hover:shadow-[0_0_80px_-20px_rgba(59,130,246,0.3)]">
          {/* Ambient Background Gradient */}
          <div aria-hidden className="absolute inset-0 z-0 bg-[linear-gradient(to_right,rgba(59,130,246,0.1),rgba(147,51,234,0.1))] opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
          
          {/* Glowing Border Edge Effect */}
          <div aria-hidden className="absolute -inset-[1px] -z-10 rounded-3xl bg-gradient-to-r from-blue-500 via-purple-500 to-indigo-500 opacity-20 blur-sm transition-opacity duration-500 group-hover:opacity-50" />

          {/* Inner Content Box */}
          <div className="relative z-10 flex flex-col items-center justify-center rounded-[22px] bg-slate-950 px-8 py-20 text-center shadow-inner sm:px-6 max-sm:px-4 max-sm:py-12">
            
            {/* Sparkle Badge */}
            <div className="mb-8 inline-flex items-center justify-center gap-2 rounded-full border border-slate-800 bg-slate-900/50 px-4 py-2 text-sm font-medium text-blue-400 shadow-sm backdrop-blur-md transition-all hover:bg-slate-800">
              <Sparkles size={16} className="text-blue-400" />
              <span>Unlock your potential</span>
            </div>

            <h2 className="mb-6 max-w-3xl text-balance text-4xl font-extrabold tracking-tight text-white sm:text-5xl lg:text-6xl">
              {isAuthenticated ? "Continue building your career signal." : "Ready to transform your hiring journey?"}
            </h2>
            
            <p className="mx-auto mb-10 max-w-2xl text-lg leading-relaxed text-slate-400 sm:text-xl">
              {isAuthenticated
                ? "Jump back into your dashboard, review progress, analyze a resume, or keep moving toward your next role."
                : "Join students, tutors, and recruiters using SkillSphere AI to connect learning outcomes with hiring readiness."}
            </p>

            <Link
              to={cta.path}
              className="group/btn relative inline-flex items-center justify-center gap-2 overflow-hidden rounded-full bg-blue-600 px-8 py-4 font-semibold text-white transition-all hover:bg-blue-500 hover:shadow-[0_0_40px_-10px_rgba(59,130,246,0.5)] active:scale-95"
            >
              <span className="relative z-10 flex items-center gap-2">
                {cta.label}
                <ArrowRight size={20} className="transition-transform group-hover/btn:translate-x-1" />
              </span>
              <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent transition-transform duration-500 ease-out group-hover/btn:translate-x-full" />
            </Link>
          </div>
        </div>
      </div>
      
      {/* Background Decorators */}
      <div className="pointer-events-none absolute left-1/2 top-1/2 -z-10 h-[600px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-blue-500/10 blur-[120px]" />
    </section>
  );
};

export default CTA;
