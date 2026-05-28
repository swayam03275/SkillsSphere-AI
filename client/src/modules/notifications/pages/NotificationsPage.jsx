import React, { useState, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Trash2,
  ChevronDown,
  ChevronUp,
  CheckCheck,
  Filter,
} from "lucide-react";
import Navbar from "../../../shared/landing/Navbar";
import NotificationCard from "../components/NotificationCard";
import useNotifications from "../hooks/useNotifications";
import { useSelector } from "react-redux";

/**
 * Full-page notifications view with advanced filtering and pagination
 */
const NotificationsPage = () => {
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.auth);
  const [filterRead, setFilterRead] = useState("all"); // all, read, unread
  const [expandedFilters, setExpandedFilters] = useState(false);
  const [selectedNotifications, setSelectedNotifications] = useState(new Set());

  const {
    notifications,
    unreadCount,
    loading,
    error,
    pagination,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    deleteAllNotifications,
    loadMore,
    hasMore,
  } = useNotifications();

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!user) {
      navigate("/login");
    }
  }, [user, navigate]);

  // Filter notifications based on read status
  const filteredNotifications = useCallback(() => {
    if (filterRead === "read") {
      return notifications.filter((n) => n.isRead);
    } else if (filterRead === "unread") {
      return notifications.filter((n) => !n.isRead);
    }
    return notifications;
  }, [notifications, filterRead])();

  // Handle select notification
  const handleSelectNotification = (notificationId) => {
    const newSelected = new Set(selectedNotifications);
    if (newSelected.has(notificationId)) {
      newSelected.delete(notificationId);
    } else {
      newSelected.add(notificationId);
    }
    setSelectedNotifications(newSelected);
  };

  // Handle select all
  const handleSelectAll = () => {
    if (selectedNotifications.size === filteredNotifications.length) {
      setSelectedNotifications(new Set());
    } else {
      const allIds = new Set(filteredNotifications.map((n) => n._id));
      setSelectedNotifications(allIds);
    }
  };

  // Handle delete selected
  const handleDeleteSelected = () => {
    if (selectedNotifications.size === 0) return;

    if (
      window.confirm(
        `Delete ${selectedNotifications.size} notification${
          selectedNotifications.size > 1 ? "s" : ""
        }?`,
      )
    ) {
      selectedNotifications.forEach((id) => deleteNotification(id));
      setSelectedNotifications(new Set());
    }
  };

  // Handle delete all
  const handleDeleteAll = () => {
    if (notifications.length === 0) return;

    if (
      window.confirm(
        "Are you sure you want to delete all notifications? This action cannot be undone.",
      )
    ) {
      deleteAllNotifications();
      setSelectedNotifications(new Set());
    }
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-[var(--background)] pt-24">
      <Navbar />

      {/* Main Content */}
      <main className="pt-24 pb-12 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">
            Notifications
          </h1>
          <p className="text-slate-600 dark:text-slate-400">
            {unreadCount > 0
              ? `You have ${unreadCount} unread notification${
                  unreadCount > 1 ? "s" : ""
                }`
              : "All caught up! No unread notifications"}
          </p>
        </div>

        {/* Toolbar */}
        <div className="mb-6 space-y-4">
          {/* Filter and Action Buttons */}
          <div className="flex flex-wrap gap-2 sm:gap-3 items-center">
            {/* Filter Toggle */}
            <button
              onClick={() => setExpandedFilters(!expandedFilters)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-medium hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
            >
              <Filter className="w-4 h-4" />
              Filter
              {expandedFilters ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </button>

            {/* Action Buttons */}
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-blue-300 dark:border-blue-600 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 font-medium hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors"
              >
                <CheckCheck className="w-4 h-4" />
                Mark all as read
              </button>
            )}

            {notifications.length > 0 && (
              <button
                onClick={handleDeleteAll}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-red-300 dark:border-red-600 bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 font-medium hover:bg-red-100 dark:hover:bg-red-900/50 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                Clear all
              </button>
            )}

            {/* Selection Actions */}
            {selectedNotifications.size > 0 && (
              <div className="ml-auto flex items-center gap-2 text-sm">
                <span className="text-slate-600 dark:text-slate-400">
                  {selectedNotifications.size} selected
                </span>
                <button
                  onClick={handleDeleteSelected}
                  className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                  title="Delete selected"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>

          {/* Filter Options */}
          {expandedFilters && (
            <div className="flex gap-2 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700">
              {["all", "unread", "read"].map((option) => (
                <button
                  key={option}
                  onClick={() => {
                    setFilterRead(option);
                    setSelectedNotifications(new Set());
                  }}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    filterRead === option
                      ? "bg-blue-500 text-white"
                      : "bg-white dark:bg-slate-700 text-slate-900 dark:text-white border border-slate-300 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-600"
                  }`}
                >
                  {option.charAt(0).toUpperCase() + option.slice(1)}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Content */}
        {loading && notifications.length === 0 ? (
          // Loading state
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div
                key={i}
                className="h-24 bg-slate-200 dark:bg-slate-700 rounded-lg animate-pulse"
              />
            ))}
          </div>
        ) : error ? (
          // Error state
          <div className="rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/30 p-6 text-center">
            <p className="text-red-700 dark:text-red-400 font-medium mb-2">
              Unable to load notifications
            </p>
            <p className="text-red-600 dark:text-red-500 text-sm">{error}</p>
          </div>
        ) : filteredNotifications.length === 0 ? (
          // Empty state
          <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 p-12 text-center">
            <div className="text-5xl mb-4">🔔</div>
            <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">
              {filterRead === "all"
                ? "No notifications yet"
                : filterRead === "unread"
                  ? "No unread notifications"
                  : "No read notifications"}
            </h3>
            <p className="text-slate-600 dark:text-slate-400">
              {filterRead === "all"
                ? "Youll see notifications here when something happens"
                : filterRead === "unread"
                  ? "Great! All notifications have been read"
                  : "You havent read any notifications yet"}
            </p>
          </div>
        ) : (
          // Notifications list
          <div className="space-y-3">
            {/* Select All Checkbox */}
            {filteredNotifications.length > 0 && (
              <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700">
                <input
                  type="checkbox"
                  checked={
                    filteredNotifications.length > 0 &&
                    selectedNotifications.size === filteredNotifications.length
                  }
                  onChange={handleSelectAll}
                  className="w-4 h-4 rounded border-slate-300 dark:border-slate-600 cursor-pointer"
                  aria-label="Select all notifications"
                />
                <label className="text-sm text-slate-600 dark:text-slate-400 flex-1">
                  Select all
                </label>
              </div>
            )}

            {/* Notification Items */}
            {filteredNotifications.map((notification) => (
              <div
                key={notification._id}
                className="flex items-start gap-3 group"
              >
                <input
                  type="checkbox"
                  checked={selectedNotifications.has(notification._id)}
                  onChange={() => handleSelectNotification(notification._id)}
                  className="w-5 h-5 mt-3 rounded border-slate-300 dark:border-slate-600 cursor-pointer flex-shrink-0"
                  aria-label={`Select ${notification.title}`}
                />
                <div className="flex-1 min-w-0">
                  <NotificationCard
                    notification={notification}
                    onMarkAsRead={markAsRead}
                    onDelete={deleteNotification}
                  />
                </div>
              </div>
            ))}

            {/* Load More Button */}
            {hasMore && (
              <div className="flex justify-center pt-4">
                <button
                  onClick={loadMore}
                  disabled={loading}
                  className="px-6 py-3 rounded-lg border border-blue-300 dark:border-blue-600 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 font-medium hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? "Loading..." : "Load more"}
                </button>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
};

export default NotificationsPage;
