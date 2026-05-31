import { CheckCircle2, FileSearch, LineChart, MessageSquareText, Sparkles, Video } from "lucide-react";
import Button from "../../../modules/landing/components/Button";
const headingGradientStyle = {
  backgroundImage: "linear-gradient(135deg, #7C3AED 0%, #4F46E5 50%, #059669 100%)",
  WebkitBackgroundClip: "text",
  backgroundClip: "text",
  WebkitTextFillColor: "transparent",
  color: "transparent",
};

const renderAnimatedChars = (text, startDelay = 0, stepDelay = 80) =>
  Array.from(text).map((character, index) => (
    <span
      key={`${text}-${index}`}
      className="animate-heading-char"
      style={{
        ["--char-delay"]: `${startDelay + index * stepDelay}ms`,
        ...headingGradientStyle,
      }}
    >
      {character === " " ? "\u00A0" : character}
    </span>
  ));

const Hero = () => {
  return (
    <section className="relative min-h-[92vh] max-sm:min-h-[72vh] flex items-center px-4 pt-28 pb-16 overflow-visible animate-slide-up sm:pt-28 sm:pb-14">
      {/* Light mode gradient orbs */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-32 -left-32 w-[600px] h-[600px] rounded-full opacity-0 dark:opacity-0"
          style={{ background: 'radial-gradient(circle, rgba(124,58,237,0.18) 0%, rgba(79,70,229,0.08) 40%, transparent 70%)', filter: 'blur(60px)' }}
        />
        <div className="absolute top-1/2 -right-40 w-[500px] h-[500px] rounded-full opacity-0 dark:opacity-0"
          style={{ background: 'radial-gradient(circle, rgba(5,150,105,0.15) 0%, rgba(16,185,129,0.06) 40%, transparent 70%)', filter: 'blur(60px)' }}
        />
        {/* Only show in light mode */}
        <style>{`
          html:not(.dark) .hero-orb-purple { opacity: 1 !important; }
          html:not(.dark) .hero-orb-green  { opacity: 1 !important; }

          .orb-float {
            animation: orbFloat 10s ease-in-out infinite;
            will-change: transform, opacity;
          }

          @keyframes orbFloat {
            0% { transform: translateY(0) translateX(0) scale(1); opacity: 0.95; }
            50% { transform: translateY(-18px) translateX(8px) scale(1.03); opacity: 1; }
            100% { transform: translateY(0) translateX(0) scale(1); opacity: 0.95; }
          }

          .animate-heading-char {
            display: inline-block;
            opacity: 0;
            transform: translateY(10px) rotateX(8deg);
            animation: charIn 480ms var(--char-delay) cubic-bezier(.2,.9,.3,1) forwards;
          }

          @keyframes charIn {
            to { opacity: 1; transform: none; }
          }

          @media (prefers-reduced-motion: reduce) {
            .orb-float,
            .animate-heading-char,
            .motion-safe\:animate-cockpit-glow,
            .motion-safe\:animate-shimmer-sweep,
            .motion-safe\:animate-scan-line,
            .motion-safe\:animate-flow-across {
              animation: none !important;
              transition: none !important;
            }
          }
        `}</style>
        <div className="hero-orb-purple orb-float absolute -top-32 -left-32 w-[600px] h-[600px] rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(124,58,237,0.18) 0%, rgba(79,70,229,0.08) 40%, transparent 70%)', filter: 'blur(60px)', opacity: 0 }}
        />
        <div className="hero-orb-green orb-float absolute top-1/2 -right-40 w-[500px] h-[500px] rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(5,150,105,0.15) 0%, rgba(16,185,129,0.06) 40%, transparent 70%)', filter: 'blur(60px)', opacity: 0 }}
        />
      </div>
      <div className="container grid grid-cols-[minmax(0,0.82fr)_minmax(540px,1.18fr)] items-center gap-12 max-[1050px]:grid-cols-1 max-[1050px]:gap-10">
        <div className="max-w-2xl relative max-[1050px]:text-center max-[1050px]:mx-auto">
          {/* decorative radial glow behind heading for reliable halo */}
          <div aria-hidden className="pointer-events-none absolute left-0 top-6 -z-20 w-[520px] h-[260px] max-[1050px]:hidden" style={{ background: 'radial-gradient(closest-side, rgba(0,0,0,0.18), rgba(0,0,0,0.08) 40%, transparent 70%)', filter: 'blur(34px)', opacity: 0.8, transform: 'translateX(-20px)' }} />
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface)] px-4 py-2 text-sm font-semibold text-[var(--text-muted)] shadow-[var(--shadow-soft)]">
            <Sparkles size={16} className="text-[var(--primary)]" />
            AI learning, evaluation, and career readiness
          </div>

          <h1 className="text-[clamp(2.35rem,4.4vw,4.25rem)] font-bold mb-6 tracking-normal leading-[1.05] max-sm:text-[clamp(2.15rem,11vw,3.35rem)]" aria-label="SkillSphere AI turns skills into career proof.">
            <span className="sr-only">SkillSphere AI turns skills into career proof.</span>

            <span aria-hidden className="block whitespace-nowrap relative overflow-visible animate-heading-line hero-heading-line">
              <span className="relative z-10 underline decoration-sky-500/30">
                {renderAnimatedChars("SkillSphere AI")}
              </span>
            </span>

            <span aria-hidden className="block relative mt-2 overflow-visible animate-heading-line hero-heading-line" style={{ ["--line-delay"]: "420ms" }}>
              <span className="relative z-10" style={{ filter: 'drop-shadow(0 12px 18px rgba(0,0,0,0.26)) drop-shadow(0 10px 14px rgba(255,255,255,0.22))' }}>
                {renderAnimatedChars("turns skills into career proof.", 420)}
              </span>
            </span>
          </h1>

          <p className="text-lg text-[var(--text-muted)] mb-10 max-w-[42rem] leading-relaxed max-[1050px]:mx-auto sm:text-base sm:mb-8">
            Learn in live classrooms, analyze resumes against real roles, practice
            interviews, and track progress in one full-stack AI platform for
            students, tutors, and recruiters.
          </p>


          <div className="mt-8 grid grid-cols-3 gap-3 max-w-xl max-[1050px]:mx-auto max-sm:grid-cols-1">
            {["Live classes", "ATS scoring", "Mock interviews"].map((item) => (
              <div key={item} className="flex items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm font-medium text-[var(--text-muted)]">
                <CheckCircle2 size={16} className="text-[var(--secondary)]" />
                {item}
              </div>
            ))}
          </div>

          <div className="mt-8 flex gap-4 max-[1050px]:justify-center">
            <Button variant="primary" size="lg" to="/register">Get Started</Button>
          </div>
        </div>

        <div className="animated-gradient-box relative justify-self-end hero-demo-grid w-full max-w-[760px] rounded-[18px] p-5 overflow-hidden max-[1050px]:justify-self-center backdrop-blur-md border border-[rgba(255,255,255,0.06)] shadow-[0_20px_50px_-20px_rgba(0,0,0,0.6)] transition-transform duration-300 will-change-transform hover:-translate-y-1 bg-[linear-gradient(145deg,rgba(255,255,255,0.08),rgba(255,255,255,0.03))] dark:bg-[linear-gradient(145deg,rgba(255,255,255,0.05),rgba(255,255,255,0.015))]">
          {/* Ambient glow + shimmer */}
          <div aria-hidden className="pointer-events-none absolute -inset-6 opacity-80 dark:opacity-95 blur-3xl motion-safe:animate-cockpit-glow"
            style={{
              background:
                "radial-gradient(circle at 20% 20%, rgba(124,58,237,0.26) 0%, transparent 58%), radial-gradient(circle at 80% 35%, rgba(79,70,229,0.24) 0%, transparent 58%), radial-gradient(circle at 55% 85%, rgba(5,150,105,0.22) 0%, transparent 60%)",
            }}
          />
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 rounded-[18px] opacity-90 dark:opacity-100"
            style={{
              padding: "1px",
              background:
                "linear-gradient(135deg, rgba(124,58,237,0.35), rgba(79,70,229,0.28), rgba(5,150,105,0.30))",
              WebkitMask:
                "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
              WebkitMaskComposite: "xor",
              maskComposite: "exclude",
            }}
          />
          <div aria-hidden className="pointer-events-none absolute inset-0 opacity-0 hover:opacity-100 transition-opacity duration-500">
            <div className="absolute -inset-10 bg-gradient-to-r from-transparent via-white/12 to-transparent blur-xl motion-safe:animate-shimmer-sweep" />
          </div>

          <div className="relative rounded-[14px] bg-[transparent] p-5">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <p className="text-base font-semibold text-[var(--text-main)]">Career cockpit</p>
                <p className="text-sm text-[var(--text-muted)]">From learning signal to hiring readiness</p>
              </div>
              <div className="hidden sm:flex items-center gap-2 rounded-full border border-[var(--border)] bg-[linear-gradient(135deg,var(--surface),rgba(79,70,229,0.05))] dark:bg-[linear-gradient(135deg,rgba(255,255,255,0.04),rgba(16,185,129,0.05))] px-3 py-1 text-xs font-semibold text-[var(--secondary)]">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="absolute inline-flex h-full w-full rounded-full bg-[var(--secondary)] opacity-75 motion-safe:animate-ping" />
                  <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-[var(--secondary)] motion-safe:animate-pulse-soft" />
                </span>
                AI active
              </div>
            </div>

            <div className="grid grid-cols-[0.72fr_1.28fr] gap-5 max-sm:grid-cols-1">
              <div className="space-y-3">
                {[
                  { icon: Video, label: "Learn", value: "Live class running" },
                  { icon: FileSearch, label: "Evaluate", value: "Resume parsed" },
                  { icon: MessageSquareText, label: "Practice", value: "Interview feedback" },
                ].map((item, index) => {
                  const Icon = item.icon;
                  return (
                    <div
                      key={item.label}
                      className="group rounded-xl border border-[var(--border)] bg-[linear-gradient(145deg,var(--surface),rgba(124,58,237,0.05))] dark:bg-[linear-gradient(145deg,rgba(255,255,255,0.03),rgba(79,70,229,0.06))] p-4 shadow-[var(--shadow-soft)] transition-transform duration-300 hover:-translate-y-0.5 motion-safe:animate-float-panel"
                      style={{ animationDelay: `${index * 0.45}s`, animationDuration: "5.6s" }}
                    >
                      <div className="flex items-center gap-3">
                        <span className="relative flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--surface-soft)] text-[var(--primary)] overflow-hidden">
                          <span aria-hidden className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                            style={{ background: "radial-gradient(circle at 30% 30%, rgba(79,70,229,0.25), transparent 60%)" }}
                          />
                          <Icon size={20} />
                        </span>
                        <div>
                          <p className="text-sm font-semibold text-[var(--text-main)]">{item.label}</p>
                          <p className="text-xs text-[var(--text-muted)]">{item.value}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="relative min-h-[390px] max-sm:min-h-[260px] rounded-xl border border-[var(--border)] bg-[linear-gradient(145deg,var(--surface),rgba(16,185,129,0.04))] dark:bg-[linear-gradient(145deg,rgba(255,255,255,0.03),rgba(124,58,237,0.08))] p-5 overflow-hidden">
                <div aria-hidden className="absolute inset-0 opacity-70"
                  style={{
                    background:
                      "radial-gradient(circle at 25% 15%, rgba(124,58,237,0.12) 0%, transparent 58%), radial-gradient(circle at 80% 40%, rgba(16,185,129,0.12) 0%, transparent 62%), radial-gradient(circle at 55% 85%, rgba(79,70,229,0.08) 0%, transparent 60%)",
                  }}
                />
                <div className="absolute left-0 right-0 top-0 h-14 bg-gradient-to-b from-[var(--surface-soft)] to-transparent" />
                <div className="motion-safe:animate-scan-line absolute left-4 right-4 top-10 h-1 rounded-full bg-[var(--secondary)] opacity-70 shadow-[0_0_22px_var(--secondary)]" />
                <div className="relative z-10 space-y-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm font-semibold text-[var(--text-main)]">AI match engine</p>
                      <p className="text-xs text-[var(--text-muted)]">Resume, role, and interview signals combined</p>
                    </div>
                    <LineChart size={20} className="text-[var(--secondary)]" />
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    {[
                      ["ATS", "86"],
                      ["Role fit", "92%"],
                      ["Growth", "+18%"],
                    ].map(([label, value]) => (
                      <div key={label} className="group rounded-xl border border-[var(--border)] bg-[linear-gradient(145deg,var(--background),rgba(79,70,229,0.06))] dark:bg-[linear-gradient(145deg,rgba(0,0,0,0.10),rgba(16,185,129,0.07))] p-3 text-center transition-transform duration-300 hover:-translate-y-0.5">
                        <p className="text-lg font-bold text-[var(--text-main)]">{value}</p>
                        <p className="text-[0.7rem] font-semibold uppercase text-[var(--text-muted)]">{label}</p>
                      </div>
                    ))}
                  </div>

                  <div className="space-y-3">
                    {[
                      ["React", "92%"],
                      ["Node.js", "84%"],
                      ["Communication", "78%"],
                    ].map(([label, value], index) => (
                      <div key={label}>
                        <div className="mb-1 flex justify-between text-xs text-[var(--text-muted)]">
                          <span>{label}</span>
                          <span>{value}</span>
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-[var(--surface-soft)]">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-[var(--primary)] to-[var(--secondary)] motion-safe:animate-flow-across"
                            style={{ width: value, animationDelay: `${index * 0.35}s` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="rounded-xl border border-[var(--border)] bg-[linear-gradient(145deg,var(--background),rgba(124,58,237,0.05))] dark:bg-[linear-gradient(145deg,rgba(0,0,0,0.10),rgba(79,70,229,0.08))] p-4">
                    <p className="text-xs font-semibold uppercase text-[var(--text-muted)]">Suggested next step</p>
                    <p className="mt-2 text-sm font-semibold text-[var(--text-main)]">Practice behavioral interview round</p>
                    <div className="mt-4 grid grid-cols-[1fr_auto] items-center gap-3">
                      <div className="h-2 overflow-hidden rounded-full bg-[var(--surface-soft)]">
                        <span className="block h-full w-3/4 rounded-full bg-gradient-to-r from-[var(--primary)] to-[var(--secondary)] motion-safe:animate-flow-across" />
                      </div>
                      <button
                        type="button"
                        className="relative rounded-lg bg-[var(--surface-soft)] px-3 py-2 text-xs font-bold text-[var(--text-main)] shadow-[0_10px_30px_-18px_rgba(79,70,229,0.6)] transition-transform duration-300 hover:-translate-y-0.5 hover:shadow-[0_18px_45px_-22px_rgba(79,70,229,0.8)]"
                      >
                        <span aria-hidden className="pointer-events-none absolute -inset-1 rounded-lg opacity-0 hover:opacity-100 transition-opacity duration-300"
                          style={{ background: "linear-gradient(135deg, rgba(124,58,237,0.22), rgba(16,185,129,0.18))", filter: "blur(10px)" }}
                        />
                        <span className="relative">Start</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
