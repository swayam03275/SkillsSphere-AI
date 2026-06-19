import React, { useState } from "react";
import PropTypes from "prop-types";
import {
  MapPin,
  IndianRupee,
  Clock,
  Briefcase,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  CheckCircle2,
  Pencil,
  Trash2,
  BarChart3,
  Globe,
  Users,
  Bookmark,
  Sparkles,
} from "lucide-react";
import Button from "./Button";

// ─── Formatting Helpers ───────────────────────────────────────────────────────

/**
 * Format nested location object from the JobPosting schema.
 * Handles optional `remote` flag and missing fields gracefully.
 */
const formatLocation = (loc) => {
  if (!loc) return "Not specified";
  const parts = [loc.city, loc.state, loc.country].filter(Boolean);
  if (parts.length === 0) return loc.remote ? "Remote" : "Not specified";
  return loc.remote ? `${parts.join(", ")} · Remote` : parts.join(", ");
};

/**
 * Format nested salary object from the JobPosting schema.
 * Supports `isNegotiable` flag and INR locale formatting.
 */
const formatSalary = (sal) => {
  if (!sal) return "Not disclosed";
  const { min, max, currency = "INR", isNegotiable } = sal;
  if (isNegotiable) return `Negotiable (${currency})`;
  if (min == null && max == null) return "Not disclosed";
  const fmt = (n) =>
    n != null
      ? Number(n).toLocaleString("en-IN", { maximumFractionDigits: 0 })
      : "–";
  return `${currency} ${fmt(min)} – ${fmt(max)}`;
};

/**
 * Returns a human-readable relative time string (e.g. "3d ago", "Just now").
 */
const getTimeAgo = (date) => {
  if (!date) return "–";
  const seconds = Math.floor((new Date() - new Date(date)) / 1000);
  if (seconds < 0) return "Just now";

  const intervals = [
    { label: "y", seconds: 31536000 },
    { label: "mo", seconds: 2592000 },
    { label: "d", seconds: 86400 },
    { label: "h", seconds: 3600 },
    { label: "min", seconds: 60 },
  ];

  for (const { label, seconds: s } of intervals) {
    const count = Math.floor(seconds / s);
    if (count >= 1) return `${count}${label} ago`;
  }

  return "Just now";
};

/**
 * Formats a date string as a locale-friendly short date.
 */
const formatDate = (dateString) => {
  if (!dateString) return "–";
  return new Date(dateString).toLocaleDateString("en-IN", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

// ─── Status badge color map ───────────────────────────────────────────────────

const STATUS_STYLES = {
  open: "bg-emerald-100 text-emerald-900 border-emerald-300 dark:bg-emerald-500/15 dark:text-emerald-300 dark:border-emerald-500/25",
  draft: "bg-yellow-100 text-yellow-900 border-yellow-300 dark:bg-yellow-500/15 dark:text-yellow-300 dark:border-yellow-500/25",
  closed: "bg-gray-200 text-gray-900 border-gray-400 dark:bg-slate-700/60 dark:text-slate-400 dark:border-slate-600/40",
  archived: "bg-slate-200 text-slate-900 border-slate-400 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-600/60",
};

const JOB_LEVEL_STYLES = {
  Internship: "bg-blue-100 text-blue-900 border-blue-300 dark:bg-blue-500/15 dark:text-blue-300 dark:border-blue-500/25",
  "Entry Level": "bg-blue-100 text-blue-900 border-blue-300 dark:bg-blue-500/15 dark:text-blue-300 dark:border-blue-500/25",
  Associate: "bg-purple-100 text-purple-900 border-purple-300 dark:bg-purple-500/15 dark:text-purple-300 dark:border-purple-500/25",
  "Mid-Senior Level": "bg-purple-100 text-purple-900 border-purple-300 dark:bg-purple-500/15 dark:text-purple-300 dark:border-purple-500/25",
  Director: "bg-yellow-100 text-yellow-900 border-yellow-300 dark:bg-yellow-500/15 dark:text-yellow-300 dark:border-yellow-500/25",
  Executive: "bg-yellow-100 text-yellow-900 border-yellow-300 dark:bg-yellow-500/15 dark:text-yellow-300 dark:border-yellow-500/25",
};

// ─── Component ────────────────────────────────────────────────────────────────

/**
 * JobViewerCard — Shared expandable job card for list views.
 *
 * Renders a compact summary that expands to show full job details.
 * Conditionally renders role-specific actions via `viewerRole`.
 *
 * Data shape matches the JobPosting Mongoose schema exactly:
 *   - salary  → { min, max, currency, isNegotiable }
 *   - location → { city, state, country, remote }
 *
 * Usage:
 *   // Student view
 *   <JobViewerCard job={job} viewerRole="student" onApply={fn} />
 *
 *   // Recruiter view
 *   <JobViewerCard job={job} viewerRole="recruiter" onEdit={fn} onViewStats={fn} />
 */
const JobViewerCard = ({
  job,
  viewerRole = "student",
  onApply,
  onEdit,
  onDelete,
  onViewStats,
  onViewApplicants,
  isApplied = false,
  isSaved = false,
  isSaving = false,
  onToggleSave,
  className = "",
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!job) return null;

  const {
    title,
    description,
    skills,
    requirements,
    responsibilities,
    keywords,
    experienceRequired,
    jobLevel,
    status = "open",
    location,
    salary,
    recruiter,
    createdAt,
    type,
    openings,
  } = job;

  const companyName = recruiter?.company || job.company || "SkillSphere Partner";
  const companyWebsite = recruiter?.companyWebsite || job.companyWebsite;
  const recruiterName = recruiter?.name;
  const recruiterLinkedIn = recruiter?.linkedinUrl;

  const canApply = status === "open" && !isApplied;

  return (
    <div
      id={`job-card-${job._id || job.id}`}
      className={`group w-full max-w-full transition-all duration-300 border backdrop-blur-md rounded-2xl overflow-hidden ${
        isExpanded
          ? "bg-white dark:bg-slate-900/80 border-blue-500/30 shadow-[0_0_30px_rgba(59,130,246,0.15)]"
          : "bg-white dark:bg-slate-900/40 border-gray-200 dark:border-white/5 hover:border-blue-300 dark:hover:border-white/10 shadow-sm"
      } ${className}`}
    >
      {/* ── Collapsed Header ── */}
      <div
        className="cursor-pointer p-4 sm:p-5 md:p-6"
        onClick={() => setIsExpanded(!isExpanded)}
        role="button"
        tabIndex={0}
        aria-expanded={isExpanded}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setIsExpanded(!isExpanded);
          }
        }}
      >
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:gap-5">
          {/* Company Logo Placeholder */}
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-blue-100 dark:border-white/5 bg-blue-50 dark:bg-blue-500/20 transition-transform duration-300 group-hover:scale-105 sm:h-14 sm:w-14 md:group-hover:scale-110">
            <Briefcase size={28} className="text-blue-600 dark:text-blue-400 max-sm:h-6 max-sm:w-6" />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="mb-1 flex min-w-0 flex-wrap items-start gap-2">
                  <h3 className="min-w-0 break-words text-lg font-bold leading-snug text-gray-900 dark:text-white transition-colors group-hover:text-blue-600 dark:group-hover:text-blue-400 sm:text-xl md:truncate">
                    {title}
                  </h3>
                  {/* Status badge — visible for recruiters, or when status is not "open" */}
                  {(viewerRole === "recruiter" || status !== "open") && (
                    <span
                      className={`inline-flex max-w-full shrink-0 items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${
                        STATUS_STYLES[status] || STATUS_STYLES.closed
                      }`}
                    >
                      {status.charAt(0).toUpperCase() + status.slice(1)}
                    </span>
                  )}
                  {jobLevel && (
                    <span
                      className={`inline-flex max-w-full items-center rounded-full border px-2.5 py-0.5 text-xs font-medium sm:shrink-0 ${
                        JOB_LEVEL_STYLES[jobLevel] || "bg-slate-700/60 text-slate-300 border-slate-600/40"
                      }`}
                    >
                      {jobLevel}
                    </span>
                  )}
                </div>
                <p className="mt-0.5 min-w-0 break-words text-sm font-medium text-gray-500 dark:text-slate-400 sm:text-base md:truncate">
                  {companyWebsite ? (
                    <a
                      href={companyWebsite}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex max-w-full items-center gap-1.5 break-words text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 hover:underline"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <span className="min-w-0 break-words md:truncate">{companyName}</span>
                      <ExternalLink size={14} className="shrink-0" />
                    </a>
                  ) : (
                    companyName
                  )}
                </p>
                {/* Recruiter identity */}
                {recruiterName && (
                  <p className="mt-1 text-xs text-gray-400 dark:text-slate-500">
                    Posted by:{" "}
                    {recruiterLinkedIn ? (
                      <a
                        href={recruiterLinkedIn}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 hover:underline font-medium"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {recruiterName}
                      </a>
                    ) : (
                      <span className="font-medium text-gray-500 dark:text-slate-400">{recruiterName}</span>
                    )}
                  </p>
                )}
              </div>
              {viewerRole === "student" && onToggleSave && (
                <button
                  type="button"
                  aria-label={isSaved ? "Remove from saved jobs" : "Save job"}
                  aria-pressed={isSaved}
                  disabled={isSaving}
                  className={`shrink-0 rounded-xl border p-2.5 transition-colors ${
                    isSaved
                      ? "border-blue-300 bg-blue-100 text-blue-700 dark:border-blue-500/40 dark:bg-blue-500/15 dark:text-blue-300"
                      : "border-gray-200 bg-white text-gray-500 hover:border-blue-300 hover:text-blue-600 dark:border-white/10 dark:bg-slate-900 dark:text-slate-400"
                  } disabled:cursor-wait disabled:opacity-60`}
                  onClick={(event) => {
                    event.stopPropagation();
                    onToggleSave(job);
                  }}
                >
                  <Bookmark size={19} fill={isSaved ? "currentColor" : "none"} />
                </button>
              )}
              <div className="mt-1 shrink-0 text-blue-500 transition-colors group-hover:text-blue-600 dark:group-hover:text-blue-400">
                <ChevronDown size={20} className={`transform transition-transform ${isExpanded ? "rotate-180" : "-rotate-90"}`} />
              </div>
            </div>

            {/* Meta strip */}
            <div className="mt-4 flex min-w-0 flex-col gap-2 text-sm text-gray-500 dark:text-slate-400 sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-6 sm:gap-y-2">
              <div className="flex min-w-0 items-start gap-1.5 sm:items-center">
                <MapPin size={16} className="text-gray-400 dark:text-slate-500 shrink-0" />
                <span className="min-w-0 break-words sm:truncate">{formatLocation(location)}</span>
              </div>
              <div className="flex min-w-0 items-start gap-1.5 sm:items-center">
                <IndianRupee size={16} className="text-gray-400 dark:text-slate-500 shrink-0" />
                <span className="min-w-0 break-words">{formatSalary(salary)}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Clock size={16} className="text-gray-400 dark:text-slate-500 shrink-0" />
                <span>{getTimeAgo(createdAt)}</span>
              </div>
              {location?.remote && (
                <div className="flex items-center gap-1.5">
                  <Globe size={16} className="text-emerald-500 shrink-0" />
                  <span className="text-emerald-400">Remote</span>
                </div>
              )}
            </div>

            {viewerRole === "student" && job.matchScore != null && (
              <div className="mt-4 flex flex-col gap-2 rounded-xl border border-emerald-200 bg-emerald-50/80 p-3 dark:border-emerald-500/20 dark:bg-emerald-500/10 sm:flex-row sm:items-center">
                <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-emerald-600 px-2.5 py-1 text-xs font-bold text-white">
                  <Sparkles size={13} />
                  {Math.round(job.matchScore)}% match
                </span>
                <p className="text-xs font-medium leading-relaxed text-emerald-800 dark:text-emerald-200 sm:text-sm">
                  {job.relevanceInsights || "Recommended based on the skills and experience in your resume."}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Expanded Detail Panel ── */}
      <div
        className={`transition-all duration-500 ease-in-out overflow-hidden ${
          isExpanded ? "max-h-[2000px] border-t border-gray-200 dark:border-white/5" : "max-h-0"
        }`}
      >
        <div className="bg-gray-50 dark:bg-slate-950/30 p-4 sm:p-6 md:p-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left — Description, Skills, Requirements, Responsibilities */}
            <div className="lg:col-span-2 space-y-6">
              {/* Description */}
              <div>
                <h4 className="text-sm font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wider mb-3">
                  About the Role
                </h4>
                <p className="break-words text-sm leading-relaxed text-gray-700 dark:text-slate-300 whitespace-pre-line sm:text-base">
                  {description || "No detailed description provided for this position."}
                </p>
              </div>

              {/* Skills */}
              {skills && skills.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wider mb-3">
                    Required Skills
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {skills.map((skill, idx) => (
                      <span
                        key={idx}
                        className="inline-flex max-w-full items-center rounded-full border border-blue-200 dark:border-blue-500/25 bg-blue-50 dark:bg-blue-500/15 px-3 py-1 text-xs font-medium text-blue-700 dark:text-blue-300 break-words"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Requirements */}
              {requirements && requirements.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wider mb-3">
                    Requirements
                  </h4>
                  <ul className="space-y-2">
                    {requirements.map((req, idx) => (
                      <li key={idx} className="flex items-start gap-3 text-gray-700 dark:text-slate-300">
                        <CheckCircle2 size={16} className="text-green-500 dark:text-green-400 mt-1 shrink-0" />
                        <span className="min-w-0 break-words">{req}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Responsibilities */}
              {responsibilities && responsibilities.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wider mb-3">
                    Responsibilities
                  </h4>
                  <ul className="space-y-2">
                    {responsibilities.map((item, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-sm text-gray-700 dark:text-slate-300">
                        <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />
                        <span className="min-w-0 break-words">{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Keywords */}
              {keywords && keywords.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wider mb-3">
                    Keywords
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {keywords.map((kw, idx) => (
                      <span
                        key={idx}
                        className="inline-flex max-w-full items-center rounded-full border border-gray-200 dark:border-slate-600/40 bg-gray-100 dark:bg-slate-700/60 px-2.5 py-0.5 text-xs font-medium text-gray-700 dark:text-slate-300 break-words"
                      >
                        {kw}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Right — Quick Details + Actions */}
            <div className="lg:col-span-1 space-y-6">
              <div className="rounded-2xl border border-gray-200 dark:border-white/5 bg-white dark:bg-slate-800/40 p-4 sm:p-6 shadow-sm dark:shadow-none">
                <h4 className="text-sm font-semibold text-gray-900 dark:text-slate-200 mb-4">
                  Quick Details
                </h4>
                <div className="space-y-4">
                  <div className="flex flex-col gap-1 text-sm sm:flex-row sm:justify-between sm:gap-4">
                    <span className="shrink-0 text-gray-500 dark:text-slate-500">Location</span>
                    <span className="min-w-0 break-words font-medium text-gray-900 dark:text-slate-200 sm:max-w-[60%] sm:text-right">
                      {formatLocation(location)}
                    </span>
                  </div>
                  <div className="flex flex-col gap-1 text-sm sm:flex-row sm:justify-between sm:gap-4">
                    <span className="shrink-0 text-gray-500 dark:text-slate-500">Salary</span>
                    <span className="min-w-0 break-words font-medium text-gray-900 dark:text-slate-200 sm:text-right">{formatSalary(salary)}</span>
                  </div>
                  {experienceRequired != null && (
                    <div className="flex flex-col gap-1 text-sm sm:flex-row sm:justify-between sm:gap-4">
                      <span className="shrink-0 text-gray-500 dark:text-slate-500">Experience</span>
                      <span className="font-medium text-gray-900 dark:text-slate-200 sm:text-right">
                        {experienceRequired} yr{experienceRequired !== 1 ? "s" : ""}
                      </span>
                    </div>
                  )}
                  {jobLevel && (
                    <div className="flex flex-col gap-1 text-sm sm:flex-row sm:justify-between sm:gap-4">
                      <span className="shrink-0 text-gray-500 dark:text-slate-500">Level</span>
                      <span className="min-w-0 break-words font-medium text-gray-900 dark:text-slate-200 sm:text-right">{jobLevel}</span>
                    </div>
                  )}
                  <div className="flex flex-col gap-1 text-sm sm:flex-row sm:justify-between sm:gap-4">
                    <span className="shrink-0 text-gray-500 dark:text-slate-500">Job Type</span>
                    <span className="min-w-0 break-words font-medium text-gray-900 dark:text-slate-200 sm:text-right">{type || "Full-time"}</span>
                  </div>
                  {openings != null && (
                    <div className="flex flex-col gap-1 text-sm sm:flex-row sm:justify-between sm:gap-4">
                      <span className="shrink-0 text-gray-500 dark:text-slate-500">Openings</span>
                      <span className="font-medium text-gray-900 dark:text-slate-200 sm:text-right">{openings} Position{openings !== 1 ? "s" : ""}</span>
                    </div>
                  )}
                  <div className="flex flex-col gap-1 text-sm sm:flex-row sm:justify-between sm:gap-4">
                    <span className="shrink-0 text-gray-500 dark:text-slate-500">Posted</span>
                    <span className="font-medium text-gray-900 dark:text-slate-200 sm:text-right">{formatDate(createdAt)}</span>
                  </div>
                  {/* Recruiter info in Quick Details */}
                  {recruiterName && (
                    <div className="flex flex-col gap-1 text-sm sm:flex-row sm:justify-between sm:gap-4">
                      <span className="shrink-0 text-gray-500 dark:text-slate-500">Recruiter</span>
                      <span className="min-w-0 break-words font-medium text-gray-900 dark:text-slate-200 sm:text-right">
                        {recruiterLinkedIn ? (
                          <a
                            href={recruiterLinkedIn}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 hover:underline"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {recruiterName}
                          </a>
                        ) : (
                          recruiterName
                        )}
                      </span>
                    </div>
                  )}
                </div>

                {/* ── Role-specific Actions ── */}

                {/* Student actions */}
                {viewerRole === "student" && (
                  <div className="mt-6">
                    {isApplied ? (
                      <div className="flex items-center justify-center gap-2 w-full py-2.5 rounded-lg bg-emerald-500/15 border border-emerald-500/25 text-emerald-300 text-sm font-medium">
                        <CheckCircle2 size={16} />
                        Applied
                      </div>
                    ) : canApply ? (
                      <Button
                        fullWidth
                        className="bg-blue-600 text-center hover:bg-blue-500"
                        onClick={(e) => {
                          e.stopPropagation();
                          onApply?.(job);
                        }}
                      >
                        <span className="flex items-center justify-center gap-2 whitespace-normal">
                          Apply for this position
                          <ExternalLink size={16} className="shrink-0" />
                        </span>
                      </Button>
                    ) : (
                      <div className="flex items-center justify-center w-full py-2.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-500 text-sm font-medium">
                        Applications Closed
                      </div>
                    )}
                  </div>
                )}

                {/* Recruiter actions */}
                {viewerRole === "recruiter" && (
                  <div className="mt-6 space-y-2">
                    {onViewStats && (
                      <Button
                        fullWidth
                        className="flex items-center justify-center gap-2 whitespace-normal bg-blue-600 text-center hover:bg-blue-500"
                        onClick={(e) => {
                          e.stopPropagation();
                          onViewStats(job);
                        }}
                      >
                        <BarChart3 size={16} />
                        View Recommendations
                      </Button>
                    )}
                    {onViewApplicants && (
                      <Button
                        fullWidth
                        className="flex items-center justify-center gap-2 whitespace-normal bg-purple-600 text-center hover:bg-purple-500"
                        onClick={(e) => {
                          e.stopPropagation();
                          onViewApplicants(job);
                        }}
                      >
                        <Users size={16} />
                        View Applicants
                      </Button>
                    )}
                    <div className="flex flex-col gap-2 sm:flex-row">
                      {onEdit && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1 border-slate-700 text-slate-300 hover:bg-slate-800 flex items-center justify-center gap-1.5"
                          onClick={(e) => {
                            e.stopPropagation();
                            onEdit(job);
                          }}
                        >
                          <Pencil size={14} />
                          Edit
                        </Button>
                      )}
                      {onDelete && (
                        <Button
                          variant="danger"
                          size="sm"
                          className="flex-1 flex items-center justify-center gap-1.5"
                          onClick={(e) => {
                            e.stopPropagation();
                            onDelete(job);
                          }}
                        >
                          <Trash2 size={14} />
                          Delete
                        </Button>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Disclaimer for students */}
              {viewerRole === "student" && canApply && (
                <p className="text-[11px] text-slate-500 text-center px-4">
                  By clicking apply, you agree to share your SkillSphere profile
                  with the recruiter for this position.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── PropTypes — matches JobPosting Mongoose schema ───────────────────────────

JobViewerCard.propTypes = {
  /** The job object — shape matches the JobPosting Mongoose schema. */
  job: PropTypes.shape({
    _id: PropTypes.string,
    id: PropTypes.string,
    title: PropTypes.string.isRequired,
    description: PropTypes.string,
    skills: PropTypes.arrayOf(PropTypes.string),
    requirements: PropTypes.arrayOf(PropTypes.string),
    responsibilities: PropTypes.arrayOf(PropTypes.string),
    keywords: PropTypes.arrayOf(PropTypes.string),
    experienceRequired: PropTypes.number,
    jobLevel: PropTypes.oneOf([
      "Internship",
      "Entry Level",
      "Associate",
      "Mid-Senior Level",
      "Director",
      "Executive",
    ]),
    status: PropTypes.oneOf(["draft", "open", "closed", "archived"]),
    location: PropTypes.shape({
      city: PropTypes.string,
      state: PropTypes.string,
      country: PropTypes.string,
      remote: PropTypes.bool,
    }),
    salary: PropTypes.shape({
      min: PropTypes.number,
      max: PropTypes.number,
      currency: PropTypes.string,
      isNegotiable: PropTypes.bool,
    }),
    recruiter: PropTypes.shape({
      name: PropTypes.string,
      email: PropTypes.string,
      company: PropTypes.string,
      companyWebsite: PropTypes.string,
      linkedinUrl: PropTypes.string,
    }),
    createdAt: PropTypes.string,
    // Legacy / optional fields some views may pass
    company: PropTypes.string,
    companyWebsite: PropTypes.string,
    type: PropTypes.string,
    openings: PropTypes.number,
    matchScore: PropTypes.number,
    relevanceInsights: PropTypes.string,
  }).isRequired,

  /** Determines which action buttons to render. */
  viewerRole: PropTypes.oneOf(["student", "recruiter"]),

  /** Student: called with the job object when "Apply" is clicked. */
  onApply: PropTypes.func,

  /** Recruiter: called with the job object when "Edit" is clicked. */
  onEdit: PropTypes.func,

  /** Recruiter: called with the job object when "Delete" is clicked. */
  onDelete: PropTypes.func,

  /** Recruiter: called with the job object when "View Recommendations" is clicked. */
  onViewStats: PropTypes.func,

  /** Recruiter: called with the job object when "View Applicants" is clicked. */
  onViewApplicants: PropTypes.func,

  /** Student: whether the user has already applied to this job. */
  isApplied: PropTypes.bool,
  isSaved: PropTypes.bool,
  isSaving: PropTypes.bool,
  onToggleSave: PropTypes.func,

  /** Additional CSS classes for the outer container. */
  className: PropTypes.string,
};

export default JobViewerCard;
