import React from "react";
import PropTypes from "prop-types";

/**
 * Universal Skeleton component to display a placeholder loading state.
 * Uses Tailwind's animate-pulse.
 *
 * @param {string} className - Additional Tailwind classes for sizing and styling
 */
function Skeleton({ className = "", ...props }) {
  return (
    <div
      className={`animate-pulse rounded-md bg-slate-200 dark:bg-slate-800 ${className}`}
      {...props}
    />
  );
}

Skeleton.propTypes = {
  className: PropTypes.string,
};

export default Skeleton;
