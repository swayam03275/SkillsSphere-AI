import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Bell,
  Trash2,
  ChevronDown,
  ChevronUp,
  CheckCheck,
  Filter,
} from "lucide-react";
import Navbar from "../../../modules/landing/components/Navbar";
import Footer from "../../../modules/landing/components/Footer";

import NotificationCard from "../components/NotificationCard";
import useNotifications from "../hooks/useNotifications";
import { useSelector } from "react-redux";
import { useDocumentTitle } from "../../../hooks/useDocumentTitle";

const NOTIFICATIONS_PAGE_SIZE = 10;

const emptyStateCopy = {
  all: {
    title: "No notifications yet",
    message:
      "You will see updates here when applications, matches, or system alerts arrive.",
  },
  unread: {
    title: "No unread notifications",
    message: "Everything is caught up. New unread updates will appear here.",
  },
  read: {
    title: "No read notifications",
    message: "Notifications you open or mark as read will be collected here.",
  },
};

const NotificationListSkeleton = ({ count = 5 }) => (
  <div className="space-y-3" aria-label="Loading notifications">
    {Array.from({ length: count }).map((_, index) => (
      <div
        key={index}
        className="flex items-start gap-3"
        data-testid="notification-skeleton"
      >
        <div className="w-5 h-5 mt-3 rounded border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 animate-pulse" />
        <div className="flex-1 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
          <div className="flex gap-3">
            <div className="w-10 h-10 rounded-lg bg-slate-200 dark:bg-slate-700 animate-pulse" />
            <div className="flex-1 space-y-3">
              <div className="h-4 w-2/5 rounded bg-slate-200 dark:bg-slate-700 animate-pulse" />
              <div className="h-3 w-full rounded bg-slate-200 dark:bg-slate-700 animate-pulse" />
              <div className="h-3 w-1/4 rounded bg-slate-200 dark:bg-slate-700 animate-pulse" />
            </div>
          </div>
        </div>
      </div>
    ))}
  </div>
);

const NotificationsEmptyState = ({ filter }) => {
  const copy = emptyStateCopy[filter] || emptyStateCopy.all;

  return (
    <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 p-12 text-center">
      <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-300">
        <Bell className="h-7 w-7" />
      </div>
      <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">
        {copy.title}
      </h2>
      <p className="text-slate-600 dark:text-slate-400">{copy.message}</p>
    </div>
  );
};

/**
 * Full-page notifications view with advanced filtering and pagination
 */
const NotificationsPage = () => {
  useDocumentTitle("Notifications");
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.auth);
  const [filterRead, setFilterRead] = useState("all");
  const [expandedFilters, setExpandedFilters] = useState(false);
  const [selectedNotifications, setSelectedNotifications] = useState(new Set());

  const {
    notifications,
    unreadCount,
    loading,
    error,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    deleteAllNotifications,
    loadMore,
    hasMore,
    socketStatus,
  } = useNotifications({
    filter: filterRead,
    limit: NOTIFICATIONS_PAGE_SIZE,
  });

  useEffect(() => {
    if (!user) {
      navigate("/login");
    }
  }, [user, navigate]);

  const filteredNotifications = notifications.filter((notification) => {
    if (filterRead === "read") return notification.isRead;
    if (filterRead === "unread") return !notification.isRead;
    return true;
  });

  const handleFilterChange = (option) => {
    if (option === filterRead) return;
    setFilterRead(option);
    setSelectedNotifications(new Set());
  };

  const handleSelectNotification = (notificationId) => {
    const newSelected = new Set(selectedNotifications);
    if (newSelected.has(notificationId)) {
      newSelected.delete(notificationId);
    } else {
      newSelected.add(notificationId);
    }
    setSelectedNotifications(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedNotifications.size === filteredNotifications.length) {
      setSelectedNotifications(new Set());
    } else {
      setSelectedNotifications(new Set(filteredNotifications.map((n) => n._id)));
    }
  };

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

      <main className="pt-24 pb-12 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto">
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
          {(socketStatus === "reconnecting" ||
            socketStatus === "disconnected") && (
            <p
              className="mt-2 inline-flex rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-sm font-medium text-amber-700 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300"
              role="status"
            >
              {socketStatus === "reconnecting"
                ? "Reconnecting notification updates..."
                : "Live notification updates are disconnected"}
            </p>
          )}
        </div>

        <div className="mb-6 space-y-4">
          <div className="flex flex-wrap gap-2 sm:gap-3 items-center">
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

          {expandedFilters && (
            <div className="flex gap-2 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700">
              {["all", "unread", "read"].map((option) => (
                <button
                  key={option}
                  onClick={() => handleFilterChange(option)}
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

        {loading && notifications.length === 0 ? (
          <NotificationListSkeleton count={5} />
        ) : error ? (
          <div className="rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/30 p-6 text-center">
            <p className="text-red-700 dark:text-red-400 font-medium mb-2">
              Unable to load notifications
            </p>
            <p className="text-red-600 dark:text-red-500 text-sm">{error}</p>
          </div>
        ) : filteredNotifications.length === 0 ? (
          <NotificationsEmptyState filter={filterRead} />
        ) : (
          <div className="space-y-3">
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
          <Footer />
    </div>
  );
};

export default NotificationsPage;
