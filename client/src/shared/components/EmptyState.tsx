import React from "react";
import { FolderOpen } from "lucide-react";
import Button from "./Button";

export interface EmptyStateProps {
  title?: string;
  description?: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}


/**
 * EmptyState — A unified view for empty lists or missing data.
 * 
 * @param {string} title - Heading for the empty state
 * @param {string} description - Detailed message or instructions
 * @param {React.ReactNode} icon - Visual representation (icon or image)
 * @param {React.ReactNode} action - Optional action button or element
 * @param {string} className - Extra Tailwind classes for the container
 */
const EmptyState = ({ 
  title = "No data found", 
  description, 
  icon = <FolderOpen className="w-16 h-16 text-text-muted mb-6" />,
  action,
  className = ""
}) => {
  return (
    <div className={`flex flex-col items-center justify-center py-20 text-center ${className}`}>
      <div className="opacity-40">{icon}</div>
      <h3 className="text-2xl font-heading font-medium text-gray-800 dark:text-text-main mb-2">
        {title}
      </h3>
      {description && (
        <p className="text-gray-500 dark:text-text-muted max-w-md mx-auto mb-8">
          {description}
        </p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
};


export default EmptyState;
