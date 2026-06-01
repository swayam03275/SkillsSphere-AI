import React from "react";
import PropTypes from "prop-types";
import { Loader2 } from "lucide-react";

/**
 * LoadingState — A unified loading view for pages and components.
 * 
 * @param {string} title - Main loading text
 * @param {string} description - Subtext or details about the background process
 * @param {React.ReactNode} icon - Custom loader icon
 * @param {string} className - Extra Tailwind classes for the container
 */
const LoadingState = ({ 
  title = "Loading...", 
  description, 
  icon = <Loader2 className="w-16 h-16 text-brand-500 animate-spin mb-6" />,
  className = ""
}) => {
  return (
    <div className={`flex flex-col items-center justify-center min-h-[80vh] w-full flex-1 animate-in fade-in duration-300 ${className}`}>
      {icon}
      <p className="text-2xl font-heading font-medium text-text-main">
        {title}
      </p>
      {description && (
        <p className="text-text-muted mt-2 italic">
          {description}
        </p>
      )}
    </div>
  );
};

LoadingState.propTypes = {
  title: PropTypes.string,
  description: PropTypes.string,
  icon: PropTypes.node,
  className: PropTypes.string,
};

export default LoadingState;
