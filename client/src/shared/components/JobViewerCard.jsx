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

  const canApply = status === "open" && !isApplied;

  return (
    <div
      id={`job-card-${job._id || job.id}`}
      className={`group transition-all duration-300 border backdrop-blur-md rounded-2xl overflow-hidden ${
        isExpanded
          ? "bg-slate-900/80 border-blue-500/30 shadow-[0_0_30px_rgba(59,130,246,0.15)]"
          : "bg-slate-900/40 border-white/5 hover:border-white/10 hover:bg-slate-900/60"
      } ${className}`}
    >
      {/* ── Collapsed Header ── */}
      <div
        className="p-6 cursor-pointer"
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
        <div className="flex flex-col md:flex-row md:items-center gap-5">
          {/* Company Logo Placeholder */}
          <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 border border-white/5 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform duration-300">
            <Briefcase size={28} className="text-blue-400" />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <h3 className="text-xl font-bold text-white group-hover:text-blue-400 transition-colors truncate">
                    {title}
                  </h3>
                  {/* Status badge — visible for recruiters, or when status is not "open" */}
                  {(viewerRole === "recruiter" || status !== "open") && (
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border shrink-0 ${
                        STATUS_STYLES[status] || STATUS_STYLES.closed
                      }`}
                    >
                      {status.charAt(0).toUpperCase() + status.slice(1)}
                    </span>
                  )}
                  {jobLevel && (
                    <span
                      className={`hidden sm:inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border shrink-0 ${
                        JOB_LEVEL_STYLES[jobLevel] || "bg-slate-700/60 text-slate-300 border-slate-600/40"
                      }`}
                    >
                      {jobLevel}
                    </span>
                  )}
                </div>
                <p className="text-slate-400 font-medium mt-0.5 truncate">
                  {recruiter?.company || job.company || "SkillSphere Partner"}
                </p>
              </div>
              <div className="text-slate-500 group-hover:text-blue-400 transition-colors shrink-0 mt-1">
                {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
              </div>
            </div>

            {/* Meta strip */}
            <div className="flex flex-wrap items-center gap-y-2 gap-x-6 mt-4 text-sm text-slate-400">
              <div className="flex items-center gap-1.5">
                <MapPin size={16} className="text-slate-500 shrink-0" />
                <span className="truncate">{formatLocation(location)}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <IndianRupee size={16} className="text-slate-500 shrink-0" />
                {formatSalary(salary)}
              </div>
              <div className="flex items-center gap-1.5">
                <Clock size={16} className="text-slate-500 shrink-0" />
                {getTimeAgo(createdAt)}
              </div>
              {location?.remote && (
                <div className="flex items-center gap-1.5">
                  <Globe size={16} className="text-emerald-500 shrink-0" />
                  <span className="text-emerald-400">Remote</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Expanded Detail Panel ── */}
      <div
        className={`transition-all duration-500 ease-in-out overflow-hidden ${
          isExpanded ? "max-h-[2000px] border-t border-white/5" : "max-h-0"
        }`}
      >
        <div className="p-8 bg-slate-950/30">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left — Description, Skills, Requirements, Responsibilities */}
            <div className="lg:col-span-2 space-y-6">
              {/* Description */}
              <div>
                <h4 className="text-sm font-semibold text-blue-400 uppercase tracking-wider mb-3">
                  About the Role
                </h4>
                <p className="text-slate-300 leading-relaxed whitespace-pre-line">
                  {description || "No detailed description provided for this position."}
                </p>
              </div>

              {/* Skills */}
              {skills && skills.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-blue-400 uppercase tracking-wider mb-3">
                    Required Skills
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {skills.map((skill, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-500/15 text-blue-300 border border-blue-500/25"
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
                  <h4 className="text-sm font-semibold text-blue-400 uppercase tracking-wider mb-3">
                    Requirements
                  </h4>
                  <ul className="space-y-2">
                    {requirements.map((req, idx) => (
                      <li key={idx} className="flex items-start gap-3 text-slate-300">
                        <CheckCircle2 size={16} className="text-green-400 mt-1 shrink-0" />
                        <span>{req}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Responsibilities */}
              {responsibilities && responsibilities.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-blue-400 uppercase tracking-wider mb-3">
                    Responsibilities
                  </h4>
                  <ul className="space-y-2">
                    {responsibilities.map((item, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-sm text-slate-300">
                        <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Keywords */}
              {keywords && keywords.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-blue-400 uppercase tracking-wider mb-3">
                    Keywords
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {keywords.map((kw, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-700/60 text-slate-300 border border-slate-600/40"
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
              <div className="bg-slate-800/40 border border-white/5 rounded-2xl p-6">
                <h4 className="text-sm font-semibold text-slate-200 mb-4">
                  Quick Details
                </h4>
                <div className="space-y-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Location</span>
                    <span className="text-slate-200 font-medium text-right max-w-[60%] truncate">
                      {formatLocation(location)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Salary</span>
                    <span className="text-slate-200 font-medium">{formatSalary(salary)}</span>
                  </div>
                  {experienceRequired != null && (
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-500">Experience</span>
                      <span className="text-slate-200 font-medium">
                        {experienceRequired} yr{experienceRequired !== 1 ? "s" : ""}
                      </span>
                    </div>
                  )}
                  {jobLevel && (
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-500">Level</span>
                      <span className="text-slate-200 font-medium">{jobLevel}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Job Type</span>
                    <span className="text-slate-200 font-medium">{type || "Full-time"}</span>
                  </div>
                  {openings != null && (
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-500">Openings</span>
                      <span className="text-slate-200 font-medium">{openings} Position{openings !== 1 ? "s" : ""}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Posted</span>
                    <span className="text-slate-200 font-medium">{formatDate(createdAt)}</span>
                  </div>
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
                        className="bg-blue-600 hover:bg-blue-500"
                        onClick={(e) => {
                          e.stopPropagation();
                          onApply?.(job);
                        }}
                      >
                        <span className="flex items-center justify-center gap-2 whitespace-nowrap">
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
                        className="bg-blue-600 hover:bg-blue-500 flex items-center justify-center gap-2"
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
                        className="bg-purple-600 hover:bg-purple-500 flex items-center justify-center gap-2"
                        onClick={(e) => {
                          e.stopPropagation();
                          onViewApplicants(job);
                        }}
                      >
                        <Users size={16} />
                        View Applicants
                      </Button>
                    )}
                    <div className="flex gap-2">
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
    status: PropTypes.oneOf(["draft", "open", "closed"]),
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
    }),
    createdAt: PropTypes.string,
    // Legacy / optional fields some views may pass
    company: PropTypes.string,
    type: PropTypes.string,
    openings: PropTypes.number,
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

  /** Student: whether the user has already applied to this job. */
  isApplied: PropTypes.bool,

  /** Additional CSS classes for the outer container. */
  className: PropTypes.string,
};

export default JobViewerCard;
