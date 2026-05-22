import {
  CheckCircle2,
  FileSearch,
  FileText,
  LineChart,
  LockKeyhole,
  MailCheck,
  Mic,
  ShieldCheck,
  Upload,
  Video,
} from "lucide-react";
import Card from "../../../shared/landing/Card";

const ClassroomPreview = () => (
  <div className="grid h-36 grid-cols-[1fr_0.72fr] gap-3 rounded-lg border border-[var(--border)] bg-[var(--background)] p-3">
    <div className="relative rounded-lg bg-[var(--surface)] p-3">
      <div className="mb-3 flex items-center gap-2">
        <span className="h-2.5 w-2.5 rounded-full bg-red-400 animate-pulse-soft" />
        <span className="h-2.5 w-2.5 rounded-full bg-[var(--secondary)] animate-pulse-soft" />
        <span className="text-xs font-semibold text-[var(--text-muted)]">Live room</span>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <span className="h-12 rounded-lg bg-[var(--surface-soft)] animate-float-panel" />
        <span className="h-12 rounded-lg bg-[var(--surface-soft)] animate-float-panel [animation-delay:0.35s]" />
      </div>
    </div>
    <div className="space-y-2 rounded-lg bg-[var(--surface)] p-3">
      <span className="block h-3 w-16 rounded-full bg-[var(--surface-soft)]" />
      <span className="block h-3 w-full rounded-full bg-[var(--surface-soft)] animate-grow-width" />
      <span className="block h-3 w-2/3 rounded-full bg-[var(--surface-soft)] animate-grow-width [animation-delay:0.3s]" />
      <span className="block h-8 rounded-lg border border-[var(--border)] bg-[var(--background)]" />
    </div>
  </div>
);

const ResumePreview = () => (
  <div className="grid h-36 grid-cols-[0.58fr_1fr] gap-3 overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--background)] p-3">
    <div className="relative min-h-0 overflow-hidden rounded-lg border border-dashed border-[var(--primary)] bg-[var(--surface)] p-3">
      <Upload size={20} className="mb-3 text-[var(--primary)] animate-upload-bounce" />
      <span className="block h-2 w-full rounded-full bg-[var(--surface-soft)]" />
      <span className="mt-2 block h-2 w-3/4 rounded-full bg-[var(--surface-soft)]" />
      <span className="absolute bottom-2 left-2 right-2 rounded-lg bg-[var(--surface-soft)] px-2 py-1 text-center text-[0.7rem] font-bold text-[var(--text-main)] animate-float-panel">
        PDF
      </span>
    </div>
    <div className="rounded-lg bg-[var(--surface)] p-3">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-xs font-bold text-[var(--text-muted)]">ATS score</span>
        <span className="text-lg font-bold text-[var(--secondary)]">86</span>
      </div>
      {["Skills", "Impact", "Keywords"].map((item, index) => (
        <div key={item} className="mb-2">
          <div className="mb-1 flex justify-between text-[0.65rem] text-[var(--text-muted)]">
            <span>{item}</span>
            <span>{82 + index * 4}%</span>
          </div>
          <div className="h-2 rounded-full bg-[var(--surface-soft)]">
            <span
              className="block h-full rounded-full bg-gradient-to-r from-[var(--primary)] to-[var(--secondary)] animate-grow-width"
              style={{ width: `${72 + index * 8}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  </div>
);

const MatcherPreview = () => (
  <div className="h-36 rounded-lg border border-[var(--border)] bg-[var(--background)] p-3">
    <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
      <div className="space-y-2 rounded-lg bg-[var(--surface)] p-3 animate-compare-nudge">
        <span className="block h-3 w-14 rounded-full bg-[var(--surface-soft)]" />
        <span className="block h-6 rounded-lg bg-[var(--surface-soft)]" />
        <span className="block h-6 rounded-lg bg-[var(--surface-soft)]" />
      </div>
      <FileSearch size={24} className="text-[var(--primary)] animate-pulse-soft" />
      <div className="space-y-2 rounded-lg bg-[var(--surface)] p-3 animate-compare-nudge [animation-delay:0.35s]">
        <span className="block h-3 w-16 rounded-full bg-[var(--surface-soft)]" />
        <span className="block h-6 rounded-lg bg-[var(--surface-soft)]" />
        <span className="block h-6 rounded-lg bg-[var(--surface-soft)]" />
      </div>
    </div>
    <div className="mt-3 rounded-lg bg-[var(--surface)] p-2">
      <div className="h-2 overflow-hidden rounded-full bg-[var(--surface-soft)]">
        <span className="block h-full w-[92%] rounded-full bg-gradient-to-r from-[var(--primary)] to-[var(--secondary)] animate-flow-across" />
      </div>
      <p className="mt-2 text-center text-xs font-bold text-[var(--text-main)]">92% role match</p>
    </div>
  </div>
);

const InterviewPreview = () => (
  <div className="h-36 rounded-lg border border-[var(--border)] bg-[var(--background)] p-3">
    <div className="mb-3 rounded-lg bg-[var(--surface)] p-3">
      <div className="mb-2 flex items-center gap-2">
        <Mic size={18} className="text-[var(--accent)] animate-pulse-soft" />
        <span className="text-xs font-bold text-[var(--text-main)]">Tell me about a project...</span>
      </div>
      <div className="flex h-10 items-end gap-1">
        {[18, 30, 22, 38, 26, 34, 20, 32].map((height, index) => (
          <span
            key={index}
            className="w-full rounded-t bg-[var(--accent)] opacity-80 animate-wave-bar"
            style={{ height, animationDelay: `${index * 0.12}s` }}
          />
        ))}
      </div>
    </div>
    <div className="grid grid-cols-3 gap-2">
      {["Clarity", "Depth", "Tone"].map((item) => (
        <span key={item} className="rounded-lg bg-[var(--surface)] px-2 py-2 text-center text-xs font-semibold text-[var(--text-muted)]">
          {item}
        </span>
      ))}
    </div>
  </div>
);

const DashboardPreview = () => (
  <div className="grid h-36 grid-cols-[0.8fr_1fr] gap-3 rounded-lg border border-[var(--border)] bg-[var(--background)] p-3">
    <div className="rounded-lg bg-[var(--surface)] p-3">
      <LineChart size={20} className="mb-3 text-[var(--secondary)]" />
      <div className="flex h-20 items-end gap-2">
        {[28, 46, 38, 62, 74].map((height, index) => (
          <span
            key={index}
            className="w-full rounded-t bg-[var(--secondary)] animate-wave-bar"
            style={{ height, animationDelay: `${index * 0.14}s` }}
          />
        ))}
      </div>
    </div>
    <div className="space-y-2">
      {["Resume", "Interview", "Skills"].map((item, index) => (
        <div key={item} className="rounded-lg bg-[var(--surface)] p-2">
          <div className="mb-1 flex justify-between text-xs text-[var(--text-muted)]">
            <span>{item}</span>
            <span>{70 + index * 9}%</span>
          </div>
          <span className="block h-2 rounded-full bg-[var(--surface-soft)]">
            <span className="block h-full rounded-full bg-[var(--secondary)] animate-grow-width" style={{ width: `${70 + index * 9}%`, animationDelay: `${index * 0.2}s` }} />
          </span>
        </div>
      ))}
    </div>
  </div>
);

const AuthPreview = () => (
  <div className="h-36 rounded-lg border border-[var(--border)] bg-[var(--background)] p-3">
    <div className="mb-3 flex items-center justify-between rounded-lg bg-[var(--surface)] p-3">
      <div className="flex items-center gap-2">
        <LockKeyhole size={18} className="text-[var(--secondary)]" />
        <span className="text-xs font-bold text-[var(--text-main)]">Secure session</span>
      </div>
      <ShieldCheck size={18} className="text-[var(--secondary)] animate-pulse-soft" />
    </div>
    <div className="grid grid-cols-6 gap-2">
      {[1, 2, 3, 4, 5, 6].map((digit) => (
        <span key={digit} className="flex h-10 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--surface)] text-sm font-bold text-[var(--text-main)] animate-otp-pop" style={{ animationDelay: `${digit * 0.12}s` }}>
          {digit}
        </span>
      ))}
    </div>
    <div className="mt-3 flex items-center gap-2 rounded-lg bg-[var(--surface)] px-3 py-2 text-xs font-semibold text-[var(--text-muted)]">
      <MailCheck size={16} className="text-[var(--secondary)]" />
      OTP verified
    </div>
  </div>
);

const previews = {
  classroom: <ClassroomPreview />,
  resume: <ResumePreview />,
  matcher: <MatcherPreview />,
  interview: <InterviewPreview />,
  dashboard: <DashboardPreview />,
  auth: <AuthPreview />,
};

const Features = () => {
  const featuresList = [
    {
      key: "classroom",
      eyebrow: "Collaborative learning",
      accent: "from-sky-500/20 via-cyan-400/10 to-transparent",
      icon: <Video className="text-[var(--primary)]" size={32} />,
      title: "Live Interactive Classrooms",
      description:
        "Run real-time sessions with video, chat, and collaboration so learners can practice while tutors guide them.",
      metric: "Live room",
      stat: "Streaming now",
    },
    {
      key: "resume",
      eyebrow: "Document intelligence",
      accent: "from-fuchsia-500/20 via-violet-400/10 to-transparent",
      icon: <FileText style={{ color: "#A855F7" }} size={32} />,
      title: "AI Resume Analyzer",
      description:
        "Upload a resume, get ATS scoring, identify missing keywords, and see targeted improvement suggestions.",
      metric: "ATS 86",
      stat: "PDF review",
    },
    {
      key: "matcher",
      eyebrow: "Role fit analysis",
      accent: "from-emerald-500/20 via-teal-400/10 to-transparent",
      icon: <FileSearch className="text-[var(--primary)]" size={32} />,
      title: "Resume vs JD Matcher",
      description:
        "Compare a candidate profile with a job description to understand fit, gaps, and role-specific readiness.",
      metric: "92%",
      stat: "Role match",
    },
    {
      key: "interview",
      eyebrow: "Interview practice",
      accent: "from-orange-500/20 via-rose-400/10 to-transparent",
      icon: <Mic style={{ color: "var(--accent)" }} size={32} />,
      title: "AI Mock Interview System",
      description:
        "Practice realistic interview prompts and receive structured feedback on clarity, depth, and confidence.",
      metric: "Ready",
      stat: "Live prompt",
    },
    {
      key: "dashboard",
      eyebrow: "Progress tracking",
      accent: "from-amber-500/20 via-yellow-400/10 to-transparent",
      icon: <LineChart style={{ color: "var(--secondary)" }} size={32} />,
      title: "Skill Tracking Dashboard",
      description:
        "Track progress across learning, resume quality, interview practice, and hiring-readiness signals.",
      metric: "+18%",
      stat: "Momentum",
    },
    {
      key: "auth",
      eyebrow: "Trust and access",
      accent: "from-slate-500/25 via-slate-300/10 to-transparent",
      icon: <ShieldCheck style={{ color: "var(--secondary)" }} size={32} />,
      title: "Secure Auth & Verification",
      description:
        "Support real users with OTP verification, password recovery, protected routes, and role-aware access.",
      metric: "OTP",
      stat: "Verified",
    },
  ];

  const spotlightFeatures = featuresList.slice(0, 2);
  const comparisonFeatures = featuresList.slice(2);

  return (
    <section className="py-28 px-4 bg-[var(--surface)] relative isolate overflow-hidden sm:py-16 max-sm:py-10">
      {/* Light mode gradient background */}
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden -z-0">
        <style>{`
          html:not(.dark) .feat-orb-1 { opacity: 1 !important; }
          html:not(.dark) .feat-orb-2 { opacity: 1 !important; }
          html:not(.dark) .feat-section-bg { background: linear-gradient(160deg, #f6f2ff 0%, #ffffff 42%, #effdf4 100%) !important; }
        `}</style>
        <div className="feat-section-bg absolute inset-0" style={{ opacity: 1 }} />
        <div className="feat-orb-1 absolute -top-24 left-[8%] h-[440px] w-[440px] rounded-full blur-3xl opacity-80"
          style={{ background: 'radial-gradient(circle, rgba(124,58,237,0.16) 0%, rgba(124,58,237,0.06) 38%, transparent 72%)' }}
        />
        <div className="feat-orb-2 absolute -bottom-28 right-[8%] h-[420px] w-[420px] rounded-full blur-3xl opacity-80"
          style={{ background: 'radial-gradient(circle, rgba(16,185,129,0.15) 0%, rgba(59,130,246,0.08) 40%, transparent 74%)' }}
        />
      </div>
      <div className="container relative z-10">
        <div className="text-center mb-16 max-w-[700px] mx-auto sm:mb-12 max-sm:mb-8">
          <h2 className="text-[clamp(1.5rem,4vw,2.5rem)] font-bold mb-4 leading-tight text-slate-950 dark:text-white">
            Core <span className="text-gradient">Features</span>
          </h2>
          <p className="mx-auto max-w-2xl text-slate-700 text-lg leading-relaxed sm:text-base max-sm:text-[0.95rem] dark:text-[var(--text-muted)]">
            Each module moves users from learning to measurable readiness with
            feedback they can act on.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 max-sm:gap-4">
          {spotlightFeatures.map((feature, index) => (
            <Card
              key={feature.key}
              className="feature-card-surface flex min-h-[450px] flex-col p-6 sm:p-6 max-sm:p-5 backdrop-blur-sm"
              hoverEffect={false}
            >
              <div className="relative mb-6 flex items-start justify-between gap-4">
                <div className="inline-flex items-center gap-3 rounded-2xl border border-[var(--border)] bg-[linear-gradient(145deg,var(--surface),rgba(255,255,255,0.03))] px-4 py-3 shadow-[var(--shadow-soft)]">
                  <span className="relative flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--surface-soft)] ring-1 ring-white/10">
                    <span className="absolute inset-0 rounded-2xl bg-gradient-to-br from-white/15 to-transparent opacity-70" aria-hidden />
                    {feature.icon}
                  </span>
                  <div className="space-y-0.5">
                    <p className="text-[0.65rem] font-semibold uppercase tracking-[0.24em] text-[var(--text-muted)]">
                      {feature.eyebrow}
                    </p>
                    <p className="text-xs font-semibold text-[var(--text-main)]">{feature.stat}</p>
                  </div>
                </div>
                <span className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[color-mix(in_srgb,var(--surface)_82%,white_8%)] px-3 py-2 text-xs font-bold text-[var(--text-main)] shadow-[var(--shadow-soft)]">
                  <span className="h-2 w-2 rounded-full bg-[var(--secondary)] animate-pulse-soft" />
                  {feature.metric}
                </span>
              </div>
              <h3 className="relative z-10 text-xl font-semibold mb-3 leading-snug sm:text-lg max-sm:text-base">
                {feature.title}
              </h3>
              <p className="relative z-10 text-[var(--text-muted)] text-[0.95rem] leading-relaxed max-sm:text-sm">
                {feature.description}
              </p>

              <div className="relative mt-auto pt-6">
                <div className="relative overflow-hidden rounded-2xl border border-[var(--border)] bg-[linear-gradient(160deg,var(--background),rgba(255,255,255,0.03))] p-3 shadow-[var(--shadow-soft)]">
                  {previews[feature.key]}
                </div>
              </div>
            </Card>
          ))}
        </div>

        <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-4 md:grid-cols-2 max-sm:gap-4">
          {comparisonFeatures.map((feature, index) => (
            <Card
              key={feature.key}
              className="feature-card-surface flex min-h-[450px] flex-col p-6 sm:p-6 max-sm:p-5 backdrop-blur-sm"
              hoverEffect={false}
            >
              <div className="relative mb-6 flex items-start justify-between gap-4">
                <div className="inline-flex items-center gap-3 rounded-2xl border border-[var(--border)] bg-[linear-gradient(145deg,var(--surface),rgba(255,255,255,0.03))] px-4 py-3 shadow-[var(--shadow-soft)]">
                  <span className="relative flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--surface-soft)] ring-1 ring-white/10">
                    <span className="absolute inset-0 rounded-2xl bg-gradient-to-br from-white/15 to-transparent opacity-70" aria-hidden />
                    {feature.icon}
                  </span>
                  <div className="space-y-0.5">
                    <p className="text-[0.65rem] font-semibold uppercase tracking-[0.24em] text-[var(--text-muted)]">
                      {feature.eyebrow}
                    </p>
                    <p className="text-xs font-semibold text-[var(--text-main)]">{feature.stat}</p>
                  </div>
                </div>
                <span className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[color-mix(in_srgb,var(--surface)_82%,white_8%)] px-3 py-2 text-xs font-bold text-[var(--text-main)] shadow-[var(--shadow-soft)]">
                  <span className="h-2 w-2 rounded-full bg-[var(--secondary)] animate-pulse-soft" />
                  {feature.metric}
                </span>
              </div>
              <h3 className="relative z-10 text-xl font-semibold mb-3 leading-snug sm:text-lg max-sm:text-base">
                {feature.title}
              </h3>
              <p className="relative z-10 text-[var(--text-muted)] text-[0.95rem] leading-relaxed max-sm:text-sm">
                {feature.description}
              </p>

              <div className="relative mt-auto pt-6">
                <div className="relative overflow-hidden rounded-2xl border border-[var(--border)] bg-[linear-gradient(160deg,var(--background),rgba(255,255,255,0.03))] p-3 shadow-[var(--shadow-soft)]">
                  {previews[feature.key]}
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Features;
