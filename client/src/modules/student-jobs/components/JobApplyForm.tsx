import React, { useState } from "react";
import { X, Send, Link2, FileText, User, Mail } from "lucide-react";

export interface JobApplyFormProps {
  job: Record<string, any>;
  user?: any;
  name?: string;
  email?: string;
  onSubmit: (...args: any[]) => any;
  onClose: (...args: any[]) => any;
  isSubmitting?: boolean;
}

/**
 * JobApplyForm — Modal form for students to apply to a job.
 *
 * Prefills Name and Email from auth state (read-only).
 * Requires a shareable Resume Link (validated).
 * Optional Cover Note.
 */
const JobApplyForm = ({ job, user, onSubmit, onClose, isSubmitting }) => {
  const [resumeLink, setResumeLink] = useState("");
  const [coverNote, setCoverNote] = useState("");
  const [error, setError] = useState("");

  const validateUrl = (url) => {
    try {
      const parsed = new URL(url);
      return parsed.protocol === "http:" || parsed.protocol === "https:";
    } catch {
      return false;
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setError("");

    const trimmedLink = resumeLink.trim();

    if (!trimmedLink) {
      setError("Resume link is required");
      return;
    }

    if (!validateUrl(trimmedLink)) {
      setError("Please enter a valid URL (starting with http:// or https://)");
      return;
    }

    onSubmit({
      resumeLink: trimmedLink,
      coverNote: coverNote.trim(),
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 border border-gray-200 dark:border-white/10 rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-white/5 bg-gray-50 dark:bg-slate-800/50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500/15 rounded-lg">
              <Send size={18} className="text-blue-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">Apply to Position</h2>
              <p className="text-xs text-gray-500 dark:text-slate-400 truncate max-w-[280px]">
                {job?.title || "Job Position"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-white/5 text-gray-400 dark:text-slate-400 hover:text-gray-700 dark:hover:text-white transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Prefilled Read-only Fields */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">
                Name
              </label>
              <div className="flex items-center gap-2 px-3 py-2.5 bg-gray-50 dark:bg-slate-800/50 border border-gray-200 dark:border-white/5 rounded-xl text-sm text-gray-700 dark:text-slate-300">
                <User size={14} className="text-gray-400 dark:text-slate-500" />
                {user?.name || "—"}
              </div>
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">
                Email
              </label>
              <div className="flex items-center gap-2 px-3 py-2.5 bg-gray-50 dark:bg-slate-800/50 border border-gray-200 dark:border-white/5 rounded-xl text-sm text-gray-700 dark:text-slate-300">
                <Mail size={14} className="text-gray-400 dark:text-slate-500" />
                <span className="truncate">{user?.email || "—"}</span>
              </div>
            </div>
          </div>

          {/* Resume Link (Required) */}
          <div>
            <label
              htmlFor="resumeLink"
              className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5"
            >
              Shareable Resume Link <span className="text-red-400">*</span>
            </label>
            <div className="relative">
              <Link2
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
              />
              <input
                id="resumeLink"
                type="url"
                value={resumeLink}
                onChange={(e) => {
                  setResumeLink(e.target.value);
                  if (error) setError("");
                }}
                placeholder="https://drive.google.com/your-resume"
                className={`w-full pl-9 pr-4 py-2.5 bg-gray-50 dark:bg-slate-800/80 border rounded-xl text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-slate-600 focus:outline-none focus:ring-2 transition-all ${
                  error
                    ? "border-red-500/50 focus:ring-red-500/30"
                    : "border-gray-200 dark:border-white/10 focus:ring-blue-500/30 focus:border-blue-500/40"
                }`}
              />
            </div>
            {error && (
              <p className="text-xs text-red-400 mt-1.5">{error}</p>
            )}
          </div>

          {/* Cover Note (Optional) */}
          <div>
            <label
              htmlFor="coverNote"
              className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5"
            >
              Cover Note <span className="text-slate-600">(optional)</span>
            </label>
            <div className="relative">
              <FileText
                size={16}
                className="absolute left-3 top-3 text-slate-500"
              />
              <textarea
                id="coverNote"
                value={coverNote}
                onChange={(e) => setCoverNote(e.target.value)}
                placeholder="Why are you a great fit for this role?"
                rows={3}
                maxLength={1000}
                className="w-full pl-9 pr-4 py-2.5 bg-gray-50 dark:bg-slate-800/80 border border-gray-200 dark:border-white/10 rounded-xl text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500/40 transition-all resize-none"
              />
            </div>
            <p className="text-[10px] text-slate-600 mt-1 text-right">
              {coverNote.length}/1000
            </p>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-white/10 text-sm font-medium text-gray-500 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-sm font-bold text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <Send size={14} />
                  Submit Application
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};


export default JobApplyForm;
