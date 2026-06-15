import React from "react";

export interface JobDetailsViewProps {
  job?: any;
  _id?: string;
  title: string;
  description?: string;
  skills?: string;
  requirements?: string;
  responsibilities?: string;
  keywords?: string;
  experienceRequired?: number;
  jobLevel?: any;
  status?: any;
  location?: any;
  city?: string;
  state?: string;
  country?: string;
  remote?: boolean;
  salary?: any;
  min?: number;
  max?: number;
  currency?: string;
  isNegotiable?: boolean;
  recruiter?: any;
  name?: string;
  email?: string;
  company?: string;
  createdAt?: string;
  viewerRole?: any;
  onEdit?: (...args: any[]) => any;
  onDelete?: (...args: any[]) => any;
  onApply?: (...args: any[]) => any;
  onBack?: (...args: any[]) => any;
  isApplied?: boolean;
  className?: string;
}


// ─── Helpers ──────────────────────────────────────────────────────────────────

const formatLocation = (loc) => {
  if (!loc) return "Not specified";
  const parts = [loc.city, loc.state, loc.country].filter(Boolean);
  return loc.remote ? `${parts.join(", ")} · Remote` : parts.join(", ");
};

const formatSalary = (sal) => {
  if (!sal) return "Not specified";
  const { min, max, currency, isNegotiable } = sal;
  if (isNegotiable) return `Negotiable (${currency || "INR"})`;
  if (min == null && max == null) return "Not disclosed";
  const fmt = (n) =>
    n != null ? Number(n).toLocaleString("en-IN", { maximumFractionDigits: 0 }) : "–";
  return `${currency || "INR"} ${fmt(min)} – ${fmt(max)} / yr`;
};

const formatDate = (dateString) => {
  if (!dateString) return "–";
  return new Date(dateString).toLocaleDateString("en-IN", {
    year: "numeric", month: "short", day: "numeric",
  });
};

// Matches schema enum
const JOB_LEVEL_COLORS = {
  "Internship": "blue", "Entry Level": "blue",
  "Associate": "purple", "Mid-Senior Level": "purple",
  "Director": "yellow", "Executive": "yellow",
};

// ─── Sub-components ───────────────────────────────────────────────────────────

const Badge = ({ children, color = "slate" }) => {
  const colors = {
    blue: "bg-blue-100 text-blue-900 border-blue-300 dark:bg-blue-500/15 dark:text-blue-300 dark:border-blue-500/25",
    emerald: "bg-emerald-100 text-emerald-900 border-emerald-300 dark:bg-emerald-500/15 dark:text-emerald-300 dark:border-emerald-500/25",
    yellow: "bg-yellow-100 text-yellow-900 border-yellow-300 dark:bg-yellow-500/15 dark:text-yellow-300 dark:border-yellow-500/25",
    purple: "bg-purple-100 text-purple-900 border-purple-300 dark:bg-purple-500/15 dark:text-purple-300 dark:border-purple-500/25",
    slate: "bg-gray-200 text-gray-900 border-gray-400 dark:bg-slate-700/60 dark:text-slate-300 dark:border-slate-600/40",
  };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${colors[color] || colors.slate}`}>
      {children}
    </span>
  );
};

const StatusBadge = ({ status }) => {
  const map = { open: "emerald", draft: "yellow", closed: "slate" };
  return <Badge color={map[status] || "slate"}>{status.charAt(0).toUpperCase() + status.slice(1)}</Badge>;
};

const InfoItem = ({ icon, label, value }) => (
  <div className="flex items-start gap-3">
    <span className="mt-0.5 text-slate-500 shrink-0">{icon}</span>
    <div>
      <p className="text-xs text-slate-500 mb-0.5">{label}</p>
      <div className="text-sm text-slate-200 font-medium">{value || "–"}</div>
    </div>
  </div>
);

const TagList = ({ items, color = "blue" }) => {
  if (!items || items.length === 0)
    return <p className="text-sm text-slate-500 italic">None listed</p>;
  return (
    <div className="flex flex-wrap gap-2">
      {items.map((item, i) => <Badge key={i} color={color}>{item}</Badge>)}
    </div>
  );
};

const BulletList = ({ items }) => {
  if (!items || items.length === 0)
    return <p className="text-sm text-slate-500 italic">None listed</p>;
  return (
    <ul className="space-y-1.5">
      {items.map((item, i) => (
        <li key={i} className="flex items-start gap-2 text-sm text-slate-300">
          <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />
          {item}
        </li>
      ))}
    </ul>
  );
};

const Section = ({ title, children }) => (
  <div className="border-t border-white/5 pt-5">
    <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">{title}</h4>
    {children}
  </div>
);

const Icons = {
  location: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" /><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z" /></svg>,
  salary: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0 1 15.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 0 1 3 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 0 0-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 0 1-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 0 0 3 15h-.75" /></svg>,
  experience: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M20.25 14.15v4.25c0 1.094-.787 2.036-1.872 2.18-2.087.277-4.216.42-6.378.42s-4.291-.143-6.378-.42c-1.085-.144-1.872-1.086-1.872-2.18v-4.25m16.5 0a2.18 2.18 0 0 0 .75-1.661V8.706c0-1.081-.768-2.015-1.837-2.175a48.114 48.114 0 0 0-3.413-.387m4.5 8.006c-.194.165-.42.295-.673.38A23.978 23.978 0 0 1 12 15.75c-2.648 0-5.195-.429-7.577-1.22a2.016 2.016 0 0 1-.673-.38m0 0A2.18 2.18 0 0 1 3 12.489V8.706c0-1.081.768-2.015 1.837-2.175a48.111 48.111 0 0 1 3.413-.387m7.5 0V5.25A2.25 2.25 0 0 0 13.5 3h-3a2.25 2.25 0 0 0-2.25 2.25v.894m7.5 0a48.667 48.667 0 0 0-7.5 0" /></svg>,
  level: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M4.26 10.147a60.438 60.438 0 0 0-.491 6.347A48.62 48.62 0 0 1 12 20.904a48.62 48.62 0 0 1 8.232-4.41 60.46 60.46 0 0 0-.491-6.347m-15.482 0a50.636 50.636 0 0 0-2.658-.813A59.906 59.906 0 0 1 12 3.493a59.903 59.903 0 0 1 10.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.717 50.717 0 0 1 12 13.489a50.702 50.702 0 0 1 3.741-3.342M6.75 15a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Zm0 0v-3.675A55.378 55.378 0 0 1 12 8.443m-7.007 11.55A5.981 5.981 0 0 0 6.75 15.75v-1.5" /></svg>,
  back: <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" /></svg>,
  edit: <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125" /></svg>,
  delete: <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" /></svg>,
  check: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" /></svg>,
};

// ─── Main Component ───────────────────────────────────────────────────────────

/**
 * JobDetailsView — reusable read-only job detail panel.
 * All fields match the JobPosting Mongoose schema exactly.
 *
 * Usage:
 *   // Recruiter
 *   <JobDetailsView job={job} viewerRole="recruiter" onEdit={fn} onDelete={fn} onBack={fn} />
 *
 *   // Student
 *   <JobDetailsView job={job} viewerRole="student" onApply={fn} onBack={fn} isApplied={false} />
 */
const JobDetailsView = ({
  job,
  viewerRole = "student",
  onEdit,
  onDelete,
  onApply,
  onBack,
  isApplied = false,
  className = "",
}) => {
  if (!job) return null;

  const {
    title, description, skills, requirements, responsibilities,
    keywords, experienceRequired, jobLevel, status,
    location, salary, recruiter, createdAt,
  } = job;

  const canApply = status === "open";

  return (
    <div className={`bg-slate-900/80 border border-white/10 rounded-2xl shadow-2xl backdrop-blur overflow-hidden ${className}`}>

      {/* Header */}
      <div className="px-6 pt-6 pb-5 border-b border-white/5 bg-gradient-to-br from-slate-800/60 to-transparent">
        {onBack && (
          <button onClick={onBack} className="mb-4 flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 transition-colors">
            {Icons.back} Back to listings
          </button>
        )}

        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-2">
              <StatusBadge status={status} />
              {jobLevel && <Badge color={JOB_LEVEL_COLORS[jobLevel] || "slate"}>{jobLevel}</Badge>}
            </div>
            <h2 className="text-xl font-bold text-white leading-tight">{title}</h2>
            {/* recruiter populated via .populate("recruiter", "name email company") in service */}
            {recruiter?.company && (
              <p className="mt-1 text-sm text-slate-400 font-medium">{recruiter.company}</p>
            )}
          </div>

          {/* Recruiter actions */}
          {viewerRole === "recruiter" && (
            <div className="flex gap-2 shrink-0">
              {onEdit && (
                <button onClick={() => onEdit(job)} className="flex items-center gap-1.5 px-3.5 py-1.5 text-sm rounded-lg border border-slate-600 text-slate-300 hover:bg-slate-800 hover:border-slate-500 transition-all">
                  {Icons.edit} Edit
                </button>
              )}
              {onDelete && (
                <button onClick={() => onDelete(job)} className="flex items-center gap-1.5 px-3.5 py-1.5 text-sm rounded-lg border border-red-500/30 text-red-400 hover:bg-red-500/10 hover:border-red-500/50 transition-all">
                  {Icons.delete} Delete
                </button>
              )}
            </div>
          )}

          {/* Student apply button */}
          {viewerRole === "student" && (
            <div className="shrink-0">
              {isApplied ? (
                <span className="flex items-center gap-1.5 px-4 py-2 text-sm rounded-lg bg-emerald-500/15 border border-emerald-500/25 text-emerald-300 font-medium">
                  {Icons.check} Applied
                </span>
              ) : canApply ? (
                <button onClick={() => onApply?.(job)} className="px-5 py-2 text-sm font-semibold rounded-lg bg-blue-600 hover:bg-blue-500 text-white transition-colors shadow-lg shadow-blue-500/20">
                  Apply Now
                </button>
              ) : (
                <span className="px-4 py-2 text-sm rounded-lg bg-slate-800 border border-slate-700 text-slate-500 font-medium">
                  Applications Closed
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Body */}
      <div className="px-6 py-5 space-y-5">

        {/* Meta grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-4">
          <InfoItem icon={Icons.location} label="Location" value={formatLocation(location)} />
          <InfoItem icon={Icons.salary} label="Compensation" value={formatSalary(salary)} />
          <InfoItem
            icon={Icons.experience}
            label="Experience Required"
            value={experienceRequired != null ? `${experienceRequired} yr${experienceRequired !== 1 ? "s" : ""}` : "–"}
          />
          {jobLevel && <InfoItem icon={Icons.level} label="Job Level" value={jobLevel} />}
        </div>

        <Section title="About the Role">
          <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-line">
            {description || "No description provided."}
          </p>
        </Section>

        <Section title="Required Skills">
          <TagList items={skills} color="blue" />
        </Section>

        {responsibilities && responsibilities.length > 0 && (
          <Section title="Responsibilities">
            <BulletList items={responsibilities} />
          </Section>
        )}

        {requirements && requirements.length > 0 && (
          <Section title="Requirements">
            <BulletList items={requirements} />
          </Section>
        )}

        {keywords && keywords.length > 0 && (
          <Section title="Keywords">
            <TagList items={keywords} color="slate" />
          </Section>
        )}

        <div className="border-t border-white/5 pt-4 text-xs text-slate-500">
          Posted on {formatDate(createdAt)}
        </div>
      </div>
    </div>
  );
};


export default JobDetailsView;