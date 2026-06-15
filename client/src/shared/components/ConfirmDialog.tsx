import React from "react";
import { AlertTriangle, X } from "lucide-react";

/**
 * Reusable confirmation dialog that matches the app's dark UI theme.
 *
 * @param {boolean} isOpen - Whether the dialog is visible
 * @param {string} title - Dialog title
 * @param {string} message - Dialog message body
 * @param {string} confirmText - Text for the confirm button (default: "Confirm")
 * @param {string} cancelText - Text for the cancel button (default: "Cancel")
 * @param {string} variant - "danger" | "warning" | "info" (default: "danger")
 * @param {boolean} loading - Whether the confirm action is in progress
 * @param {function} onConfirm - Called when confirm is clicked
 * @param {function} onCancel - Called when cancel is clicked or overlay is clicked
 */
const ConfirmDialog = ({
  isOpen,
  title = "Are you sure?",
  message = "",
  confirmText = "Confirm",
  cancelText = "Cancel",
  variant = "danger",
  loading = false,
  onConfirm,
  onCancel,
}) => {
  if (!isOpen) return null;

  const variantStyles = {
    danger: {
      icon: "bg-red-100 text-red-900 border-red-300 dark:bg-red-500/15 dark:text-red-400 dark:border-red-500/25",
      button: "bg-red-600 hover:bg-red-500 focus:ring-red-500/40 dark:bg-red-600 dark:hover:bg-red-500",
    },
    warning: {
      icon: "bg-yellow-100 text-yellow-900 border-yellow-300 dark:bg-yellow-500/15 dark:text-yellow-400 dark:border-yellow-500/25",
      button: "bg-yellow-600 hover:bg-yellow-500 focus:ring-yellow-500/40 dark:bg-yellow-600 dark:hover:bg-yellow-500",
    },
    info: {
      icon: "bg-blue-100 text-blue-900 border-blue-300 dark:bg-blue-500/15 dark:text-blue-400 dark:border-blue-500/25",
      button: "bg-blue-600 hover:bg-blue-500 focus:ring-blue-500/40 dark:bg-blue-600 dark:hover:bg-blue-500",
    },
  };

  const styles = variantStyles[variant] || variantStyles.danger;

  return (
    <div className="fixed inset-0 z-[1100] flex items-center justify-center p-4">
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={!loading ? onCancel : undefined}
      />

      {/* Dialog */}
      <div className="relative w-full max-w-md bg-slate-900 border border-white/10 rounded-2xl shadow-2xl animate-[slideFadeIn_0.2s_ease_forwards]">
        {/* Close button */}
        <button
          onClick={onCancel}
          disabled={loading}
          aria-label="Close dialog"
          className="absolute top-4 right-4 p-1 text-slate-500 hover:text-slate-300 transition-colors disabled:opacity-50"
        >
          <X size={18} />
        </button>

        <div className="p-6">
          {/* Icon */}
          <div className={`inline-flex p-3 rounded-xl border ${styles.icon} mb-4`}>
            <AlertTriangle size={24} />
          </div>

          {/* Title */}
          <h3 className="text-lg font-bold text-white mb-2">{title}</h3>

          {/* Message */}
          {message && (
            <p className="text-sm text-slate-400 leading-relaxed">{message}</p>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-3 px-6 pb-6">
          <button
            onClick={onCancel}
            disabled={loading}
            className="flex-1 px-4 py-2.5 text-sm font-medium text-slate-300 bg-slate-800 border border-white/10 rounded-xl hover:bg-slate-700 transition-colors disabled:opacity-50"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className={`flex-1 px-4 py-2.5 text-sm font-bold text-white rounded-xl transition-colors focus:outline-none focus:ring-2 disabled:opacity-50 disabled:cursor-not-allowed ${styles.button}`}
          >
            {loading ? "Processing..." : confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmDialog;
