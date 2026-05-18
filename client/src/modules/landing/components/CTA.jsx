import { useSelector } from "react-redux";
import { ArrowRight } from "lucide-react";
import Button from "../../../shared/landing/Button";

// Bubble config: size, position, animation duration, delay, color
const BUBBLES = [
  { w: 80,  h: 80,  top: "10%",  left: "5%",   dur: "12s", delay: "0s",   opacity: 0.06, color: "rgba(124,58,237," },
  { w: 50,  h: 50,  top: "60%",  left: "8%",   dur: "15s", delay: "1.5s", opacity: 0.05, color: "rgba(5,150,105,"  },
  { w: 120, h: 120, top: "5%",   left: "80%",  dur: "18s", delay: "0.5s", opacity: 0.04, color: "rgba(99,102,241," },
  { w: 40,  h: 40,  top: "70%",  left: "88%",  dur: "13s", delay: "2s",   opacity: 0.07, color: "rgba(124,58,237," },
  { w: 65,  h: 65,  top: "40%",  left: "92%",  dur: "16s", delay: "3s",   opacity: 0.05, color: "rgba(5,150,105,"  },
  { w: 35,  h: 35,  top: "80%",  left: "30%",  dur: "11s", delay: "1s",   opacity: 0.06, color: "rgba(99,102,241," },
  { w: 90,  h: 90,  top: "15%",  left: "45%",  dur: "20s", delay: "4s",   opacity: 0.04, color: "rgba(124,58,237," },
  { w: 28,  h: 28,  top: "55%",  left: "55%",  dur: "14s", delay: "2.5s", opacity: 0.07, color: "rgba(5,150,105,"  },
  { w: 55,  h: 55,  top: "25%",  left: "20%",  dur: "17s", delay: "0.8s", opacity: 0.05, color: "rgba(99,102,241," },
  { w: 45,  h: 45,  top: "75%",  left: "65%",  dur: "13s", delay: "3.5s", opacity: 0.06, color: "rgba(124,58,237," },
  { w: 70,  h: 70,  top: "35%",  left: "72%",  dur: "19s", delay: "5s",   opacity: 0.04, color: "rgba(236,72,153," },
  { w: 32,  h: 32,  top: "88%",  left: "15%",  dur: "10s", delay: "6s",   opacity: 0.06, color: "rgba(245,158,11," },
];

const CTA = () => {
  const { isAuthenticated, user } = useSelector((state) => state.auth);
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
    <section className="px-4 py-16 pb-32 sm:py-10 sm:pb-16 max-sm:py-6 max-sm:pb-12">
      <div className="container">
        <div
          className="relative border border-[var(--border)] rounded-lg py-20 px-8 text-center overflow-hidden shadow-[var(--shadow-soft)]
          sm:py-12 sm:px-6 max-sm:py-8 max-sm:px-4"
          style={{
            background: "linear-gradient(135deg, rgba(124,58,237,0.18) 0%, rgba(79,70,229,0.14) 20%, rgba(5,150,105,0.12) 40%, rgba(236,72,153,0.10) 60%, rgba(245,158,11,0.08) 80%, rgba(99,102,241,0.15) 100%)",
            backgroundSize: "300% 300%",
            animation: "ctaBoxShift 18s ease infinite",
          }}
        >
          {/* ── Floating bubble animations ── */}
          {BUBBLES.map((b, i) => (
            <span
              key={i}
              aria-hidden="true"
              className="pointer-events-none absolute rounded-full"
              style={{
                width: b.w,
                height: b.h,
                top: b.top,
                left: b.left,
                background: `radial-gradient(circle at 35% 35%, ${b.color}${b.opacity + 0.1}), ${b.color}${b.opacity}))`,
                border: `1.5px solid ${b.color}${b.opacity + 0.08})`,
                backdropFilter: 'blur(2px)',
                animation: `ctaBubbleFloat ${b.dur} ease-in-out ${b.delay} infinite alternate`,
                transform: 'translateY(0)',
              }}
            />
          ))}

          <h2 className="relative z-10 text-[clamp(1.5rem,4vw,3rem)] font-bold mb-4 leading-tight">
            {isAuthenticated ? "Continue building your career signal." : "Ready to transform your journey?"}
          </h2>
          <p className="relative z-10 text-[var(--text-muted)] text-xl mb-10 max-w-[650px] mx-auto leading-relaxed
            sm:text-base sm:mb-6 max-sm:text-[0.95rem] max-sm:mb-5">
            {isAuthenticated
              ? "Jump back into your dashboard, review progress, analyze a resume, or keep moving toward your next role."
              : "Join students, tutors, and recruiters using SkillsSphere AI to connect learning outcomes with hiring readiness."}
          </p>
          <div className="relative z-10 flex justify-center">
            <Button variant="primary" size="lg" to={cta.path}
              className="max-sm:w-full max-sm:max-w-[300px]">
              {cta.label} <ArrowRight size={20} />
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default CTA;
