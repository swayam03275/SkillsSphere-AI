import { BookOpen, Briefcase, CheckCircle2, Users } from "lucide-react";
import Card from "../../../shared/landing/Card";
const TargetUsers = () => {
  const users = [
    {
      icon: <BookOpen className="text-[var(--primary)]" size={34} />,
      role: "Students",
      description:
        "Build skills, improve resumes, practice interviews, and see exactly where to focus next.",
      points: ["Learn in live sessions", "Improve ATS score", "Practice interviews"],
    },
    {
      icon: <Users style={{ color: "var(--secondary)" }} size={34} />,
      role: "Tutors",
      description:
        "Guide learners through interactive classes while tracking growth and readiness signals.",
      points: ["Host live cohorts", "Review student progress", "Support career prep"],
    },
    {
      icon: <Briefcase style={{ color: "var(--accent)" }} size={34} />,
      role: "Recruiters",
      description:
        "Discover candidates with clearer skill evidence, resume fit, and role-aligned readiness.",
      points: ["Post role requirements", "Match candidate profiles", "Shortlist with context"],
    },
  ];

  return (
    <section className="py-28 px-4 relative sm:py-16 max-sm:py-8">
      <div className="container">
        <div className="mb-14 max-w-[760px] sm:mb-10">
          <h2 className="text-[clamp(1.5rem,4vw,2.5rem)] font-bold mb-4 leading-tight">
            Built For The <span className="text-gradient">Ecosystem</span>
          </h2>
          <p className="text-[var(--text-muted)] text-lg leading-relaxed sm:text-base max-sm:text-[0.95rem]">
            SkillSphere AI connects the people who learn, teach, and hire
            through one shared readiness layer.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {users.map((user, index) => (
            <Card key={user.role} className="p-7" hoverEffect={true}>
              <div className="mb-6 flex items-start justify-between gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--surface-soft)]">
                {user.icon}
              </div>
                <span className="text-xs font-bold text-[var(--text-muted)]">
                  0{index + 1}
                </span>
              </div>
              <h3 className="mb-3 text-2xl font-bold leading-snug sm:text-xl">
                {user.role}
              </h3>
              <p className="mb-6 text-base leading-relaxed text-[var(--text-muted)] max-sm:text-[0.9rem]">
                {user.description}
              </p>
              <ul className="space-y-3">
                {user.points.map((point) => (
                  <li key={point} className="flex items-start gap-2 text-sm font-semibold text-[var(--text-muted)]">
                    <CheckCircle2 size={16} className="mt-0.5 flex-shrink-0 text-[var(--secondary)]" />
                    <span>{point}</span>
                  </li>
                ))}
              </ul>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};

export default TargetUsers;
