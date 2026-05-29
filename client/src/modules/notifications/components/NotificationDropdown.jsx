import React, { useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import { Trash2, ArrowRight, CheckCheck } from "lucide-react";
import NotificationCard from "./NotificationCard";
/**
 * Dropdown panel showing recent notifications
 * Positioned relative to the bell icon
 */
const NotificationDropdown = ({
  isOpen,
  onClose,
  notifications,
  unreadCount,
  loading,
  onMarkAsRead,
  onDelete,
  onMarkAllAsRead,
  onDeleteAll,
}) => {
  const dropdownRef = useRef(null);
  const isEmpty = notifications.length === 0 && !loading;

  // Close dropdown when clicking outside
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        onClose();
      }
    };

    const handleEscape = (e) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      ref={dropdownRef}
      className="absolute top-full right-0 mt-2 w-96 max-w-[calc(100vw-1rem)] rounded-xl bg-white dark:bg-slate-900 shadow-lg border border-slate-200 dark:border-slate-800 z-50 overflow-hidden flex flex-col max-h-[600px]"
      role="dialog"
      aria-label="Notifications dropdown"
    >
      {/* Header */}
      <div className="sticky top-0 z-10 bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-800/50 border-b border-slate-200 dark:border-slate-700 p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-slate-900 dark:text-white text-lg">
              Notifications
            </h3>
            {unreadCount > 0 && (
              <span className="inline-flex items-center justify-center min-w-[24px] h-6 px-2 bg-blue-500 text-white text-xs font-bold rounded-full">
                {unreadCount}
              </span>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex gap-1">
            {unreadCount > 0 && (
              <button
                onClick={onMarkAllAsRead}
                className="p-2 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors"
                title="Mark all as read"
                aria-label="Mark all as read"
              >
                <CheckCheck className="w-5 h-5" />
              </button>
            )}
            {notifications.length > 0 && (
              <button
                onClick={onDeleteAll}
                className="p-2 text-slate-600 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                title="Clear all notifications"
                aria-label="Clear all notifications"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {loading && notifications.length === 0 ? (
          // Loading state
          <div className="p-4 space-y-3">
            {[...Array(3)].map((_, i) => (
              <div
                key={i}
                className="p-3 rounded-lg bg-slate-100 dark:bg-slate-800 animate-pulse"
              >
                <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-3/4 mb-2" />
                <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-full" />
              </div>
            ))}
          </div>
        ) : isEmpty ? (
          // Empty state
          <div className="flex flex-col items-center justify-center py-12 px-4">
            <div className="text-4xl mb-3">🔔</div>
            <p className="text-slate-600 dark:text-slate-400 text-center font-medium">
              No notifications yet
            </p>
            <p className="text-slate-500 dark:text-slate-500 text-sm text-center mt-1">
              You'll be notified when something happens
            </p>
          </div>
        ) : (
          // Notifications list
          <div className="divide-y divide-slate-200 dark:divide-slate-800">
            {notifications.slice(0, 5).map((notification) => (
              <div
                key={notification._id}
                className="p-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
              >
                <NotificationCard
                  notification={notification}
                  onMarkAsRead={onMarkAsRead}
                  onDelete={onDelete}
                  isCompact={true}
                />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer - View All Link */}
      {notifications.length > 0 && !isEmpty && (
        <div className="sticky bottom-0 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 p-3">
          <Link
            to="/notifications"
            onClick={onClose}
            className="flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
          >
            <span>View all notifications</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      )}
    </div>
  );
};

export default NotificationDropdown;
