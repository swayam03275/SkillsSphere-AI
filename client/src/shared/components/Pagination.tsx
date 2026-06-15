import React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

/**
 * Reusable Pagination component matching the dark UI theme.
 *
 * @param {number} currentPage - The current active page
 * @param {number} totalPages - Total number of pages
 * @param {function} onPageChange - Called with the new page number when a button is clicked
 */
const Pagination = ({ currentPage, totalPages, onPageChange }) => {
  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-center gap-4 mt-8">
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage <= 1}
        className="flex items-center gap-1 px-4 py-2 text-sm font-medium text-slate-500 dark:text-slate-300 bg-slate-100 dark:bg-slate-800/50 border border-slate-200 dark:border-white/10 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700/50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <ChevronLeft size={16} />
        Previous
      </button>
      <span className="text-sm font-medium text-slate-500 dark:text-slate-400">
        Page <span className="text-gray-900 dark:text-white">{currentPage}</span> of{" "}
        <span className="text-gray-900 dark:text-white">{totalPages}</span>
      </span>
      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage >= totalPages}
        className="flex items-center gap-1 px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-blue-600 rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-blue-400 disabled:border-blue-400"
      >
        Next
        <ChevronRight size={16} />
      </button>
    </div>
  );
};

export default Pagination;
