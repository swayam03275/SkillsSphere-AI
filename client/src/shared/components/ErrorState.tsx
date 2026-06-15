// @ts-nocheck

import React from "react";
import { AlertCircle } from "lucide-react";
import Button from "./Button";

export interface ErrorStateProps {
  title?: string;
  description?: string;
  onRetry?: (...args: any[]) => any;
  retryText?: string;
  className?: string;
}


/**
 * ErrorState — A unified error view with an optional retry action.
 * 
 * @param {string} title - Error heading
 * @param {string} description - Error details or message
 * @param {function} onRetry - Callback for the "Try Again" button
 * @param {string} retryText - Label for the retry button
 * @param {string} className - Extra Tailwind classes for the container
 */
const ErrorState = ({ 
  title = "Something went wrong", 
  description, 
  onRetry,
  retryText = "Try Again",
  className = ""
}) => {
  return (
    <div className={`text-center py-12 ${className}`}>
      <div className="bg-red-500/10 text-red-400 p-6 rounded-2xl border border-red-500/20 mb-8 max-w-md mx-auto">
        <div className="flex items-center justify-center mb-4">
          <AlertCircle className="w-8 h-8" />
        </div>
        <h3 className="text-lg font-bold mb-2">{title}</h3>
        {description && <p className="text-sm opacity-90">{description}</p>}
      </div>
      {onRetry && (
        <Button variant="primary" size="lg" onClick={onRetry}>
          {retryText}
        </Button>
      )}
    </div>
  );
};


export default ErrorState;
