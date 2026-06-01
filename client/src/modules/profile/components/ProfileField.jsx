import React from "react";
import PropTypes from "prop-types";
/**
 * ProfileField — A single read-only info row used inside the profile cards.
 *
 * Props
 * ─────
 * @param {string}          label   - Field label (e.g. "Full Name")
 * @param {React.ReactNode} value   - Display value (can be a string or JSX badge)
 * @param {React.ReactNode} icon    - Optional lucide-react icon element
 */
const ProfileField = ({ label, value, icon }) => {
  return (
    <div className="flex items-start gap-3 py-3 border-b border-white/5 last:border-b-0">
      {icon && (
        <span className="mt-0.5 flex-shrink-0 text-slate-400 w-4 h-4">
          {icon}
        </span>
      )}
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-0.5">
          {label}
        </p>
        <div className="text-sm text-slate-200 break-words">{value}</div>
      </div>
    </div>
  );
};

ProfileField.propTypes = {
  label: PropTypes.string.isRequired,
  value: PropTypes.node.isRequired,
  icon: PropTypes.node,
};

export default ProfileField;
