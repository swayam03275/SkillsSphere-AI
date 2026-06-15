import React, { useState, useCallback } from "react";
import { Bell } from "lucide-react";
import NotificationDropdown from "./NotificationDropdown";
import useNotifications from "../hooks/useNotifications";
/**
 * Notification Bell Icon with dropdown
 * Shows unread badge and manages dropdown visibility
 */
const NotificationBell = () => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const {
    notifications,
    unreadCount,
    loading,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    deleteAllNotifications,
  } = useNotifications();

  // Toggle dropdown
  const handleToggleDropdown = useCallback(() => {
    setIsDropdownOpen((prev) => !prev);
  }, []);

  // Close dropdown
  const handleCloseDropdown = useCallback(() => {
    setIsDropdownOpen(false);
  }, []);

  // Handle mark as read
  const handleMarkAsRead = useCallback(
    (notificationId) => {
      markAsRead(notificationId);
    },
    [markAsRead],
  );

  // Handle delete
  const handleDeleteNotification = useCallback(
    (notificationId) => {
      deleteNotification(notificationId);
    },
    [deleteNotification],
  );

  // Handle mark all as read
  const handleMarkAllAsRead = useCallback(() => {
    markAllAsRead();
  }, [markAllAsRead]);

  // Handle delete all
  const handleDeleteAllNotifications = useCallback(() => {
    if (
      window.confirm(
        "Are you sure you want to delete all notifications? This action cannot be undone.",
      )
    ) {
      deleteAllNotifications();
      setIsDropdownOpen(false);
    }
  }, [deleteAllNotifications]);

  return (
    <div className="relative">
      {/* Bell Button */}
      <button
        onClick={handleToggleDropdown}
        className="relative inline-flex items-center justify-center w-10 h-10 rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--text-main)] hover:bg-[var(--surface-hover)] transition-all duration-200 hover:-translate-y-0.5 shadow-[var(--shadow-soft)]"
        title="Notifications"
        aria-label="Notifications"
        aria-expanded={isDropdownOpen}
        aria-haspopup="dialog"
      >
        <Bell className="w-5 h-5" />

        {/* Unread Badge */}
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 min-w-[20px] h-5 px-1 flex items-center justify-center bg-red-500 text-white text-xs font-bold rounded-full transform translate-x-1 -translate-y-1 shadow-lg animate-pulse">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}

        {/* Pulsing indicator when there are unread notifications */}
        {unreadCount > 0 && (
          <div className="absolute inset-0 rounded-lg bg-red-500/20 animate-pulse" />
        )}
      </button>

      {/* Dropdown Panel */}
      <NotificationDropdown
        isOpen={isDropdownOpen}
        onClose={handleCloseDropdown}
        notifications={notifications}
        unreadCount={unreadCount}
        loading={loading}
        onMarkAsRead={handleMarkAsRead}
        onDelete={handleDeleteNotification}
        onMarkAllAsRead={handleMarkAllAsRead}
        onDeleteAll={handleDeleteAllNotifications}
      />
    </div>
  );
};

export default NotificationBell;
