import React from "react";
import Navbar from "./Navbar";

/**
 * Shared CSS class string for the glassmorphic auth card.
 * Apply this to <form> or <div> wrappers inside AuthLayout children
 * to guarantee visual consistency across all auth pages.
 */
export const AUTH_CARD_CLASS =
  "p-4 sm:p-[30px] rounded-[20px] backdrop-blur-[20px] bg-white/95 dark:bg-slate-900/70 border border-slate-200 dark:border-white/10 shadow-[0_20px_60px_rgba(15,23,42,0.14)] dark:shadow-[0_0_40px_rgba(0,0,0,0.6)] animate-[fadeIn_0.8s_ease] w-full";

/**
 * AuthLayout — shared wrapper for all authentication pages.
 *
 * Provides:
 *  - Full-screen container with theme-aware gradient background
 *  - Two animated glow orbs (hidden on small screens)
 *  - <Navbar /> rendering
 *  - Centered content column with configurable max-width
 *  - Optional footer slot (e.g. "Already have an account? Login")
 *
 * @param {object}  props
 * @param {React.ReactNode}  props.children       - Page-specific content (form, success state, etc.)
 * @param {string}           [props.maxWidth]      - CSS max-width for the content column (default "380px")
 * @param {React.ReactNode}  [props.footerContent] - Optional footer rendered below the card
 */
const AuthLayout = ({ children, maxWidth = "380px", footerContent }) => {
  return (
    <div className="min-h-screen flex flex-col justify-center items-center bg-slate-50 dark:bg-[radial-gradient(circle_at_top_left,#0f172a,#020617)] overflow-hidden relative px-3 py-16 box-border">
      <Navbar />

      <div
        className="relative z-10 w-full"
        style={{ maxWidth }}
      >
        {/* Background glow orbs */}
        <div className="hidden sm:block absolute w-[520px] h-[520px] bg-blue-400/45 dark:bg-blue-500/40 rounded-full blur-[140px] dark:blur-[120px] -top-[150px] -left-[150px] -z-10 animate-pulse" />
        <div className="hidden sm:block absolute w-[420px] h-[420px] bg-purple-400/45 dark:bg-purple-500/40 rounded-full blur-[140px] dark:blur-[120px] -bottom-[120px] -right-[120px] -z-10 animate-pulse" />

        {children}

        {footerContent && footerContent}
      </div>
    </div>
  );
};

export default AuthLayout;
