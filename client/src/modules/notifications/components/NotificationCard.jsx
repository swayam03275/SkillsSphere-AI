import React, { useMemo } from "react";
import {

  Trash2,
  AlertCircle,
  CheckCircle,
  Info,
  MessageCircle,
  Target,
  Zap,
  Clock,
} from "lucide-react";

/**
 * Get icon and color for notification type
 */
const getNotificationTypeConfig = (type) => {
  const configs = {
    "application-status-updated": {
      icon: CheckCircle,
      bgColor: "bg-blue-50 dark:bg-blue-900/30",
      iconColor: "text-blue-600 dark:text-blue-400",
      label: "Application Update",
    },
    skill_gap_alert: {
      icon: AlertCircle,
      bgColor: "bg-red-50 dark:bg-red-900/30",
      iconColor: "text-red-600 dark:text-red-400",
      label: "Skill Gap Alert",
    },
    interview: {
      icon: MessageCircle,
      bgColor: "bg-purple-50 dark:bg-purple-900/30",
      iconColor: "text-purple-600 dark:text-purple-400",
      label: "Interview",
    },
    "job-match": {
      icon: Target,
      bgColor: "bg-green-50 dark:bg-green-900/30",
      iconColor: "text-green-600 dark:text-green-400",
      label: "Job Match",
    },
    system: {
      icon: Zap,
      bgColor: "bg-yellow-50 dark:bg-yellow-900/30",
      iconColor: "text-yellow-600 dark:text-yellow-400",
      label: "System",
    },
    message: {
      icon: MessageCircle,
      bgColor: "bg-indigo-50 dark:bg-indigo-900/30",
      iconColor: "text-indigo-600 dark:text-indigo-400",
      label: "Message",
    },
  };

  return configs[type] || configs["system"];
};

/**
 * Format relative timestamp (e.g., "2 hours ago")
 */
const formatRelativeTime = (date) => {
  const now = new Date();
  const notificationTime = new Date(date);
  const diffMs = now - notificationTime;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return notificationTime.toLocaleDateString();
};

/**
 * Individual Notification Card Component
 */
const NotificationCard = ({
  notification,
  onMarkAsRead,
  onDelete,
  isCompact = false,
}) => {
  const { _id, title, message, type, isRead, createdAt } = notification;

  const config = useMemo(() => getNotificationTypeConfig(type), [type]);
  const Icon = config.icon;
  const relativeTime = useMemo(
    () => formatRelativeTime(createdAt),
    [createdAt],
  );

  const handleMarkAsRead = () => {
    if (!isRead) {
      onMarkAsRead(_id);
    }
  };

  const handleDelete = (e) => {
    e.stopPropagation();
    onDelete(_id);
  };

  return (
    <article
      onClick={handleMarkAsRead}
      aria-label={`${isRead ? "Read" : "Unread"} notification: ${title || config.label}`}
      className={`relative overflow-hidden rounded-lg border transition-all duration-200 cursor-pointer ${
        isRead
          ? "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700"
          : "bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-800 hover:border-blue-300 dark:hover:border-blue-700 shadow-sm"
      } ${!isCompact && "p-4"} ${isCompact && "p-3"}`}
    >
      {!isRead && (
        <button
          type="button"
          onClick={handleMarkAsRead}
          className="sr-only focus:not-sr-only focus:absolute focus:left-3 focus:top-3 focus:z-10 focus:rounded-md focus:bg-blue-600 focus:px-3 focus:py-2 focus:text-sm focus:font-semibold focus:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          Mark {title || config.label} as read
        </button>
      )}

      {/* Unread indicator */}
      {!isRead && (
        <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-blue-500 to-blue-400" />
      )}

      <div className="flex gap-3">
        {/* Icon Container */}
        <div
          className={`flex-shrink-0 flex items-center justify-center rounded-lg ${config.bgColor}`}
        >
          <Icon
            className={`${config.iconColor} ${isCompact ? "w-4 h-4" : "w-5 h-5"}`}
          />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1">
              <h2
                className={`font-semibold text-slate-900 dark:text-white truncate ${
                  isCompact ? "text-sm" : "text-base"
                }`}
              >
                {title || config.label}
              </h2>
              <p
                className={`text-slate-600 dark:text-slate-400 line-clamp-2 mt-0.5 ${
                  isCompact ? "text-xs" : "text-sm"
                }`}
              >
                {message}
              </p>
            </div>

            {/* Delete button */}
            <button
              onClick={handleDelete}
              className="flex-shrink-0 p-1.5 text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
              title="Delete notification"
              aria-label="Delete notification"
            >
              <Trash2 className={isCompact ? "w-3.5 h-3.5" : "w-4 h-4"} />
            </button>
          </div>

          {/* Timestamp */}
          <div className="flex items-center gap-1 mt-2 text-slate-500 dark:text-slate-500">
            <Clock className={isCompact ? "w-3 h-3" : "w-3.5 h-3.5"} />
            <time className={isCompact ? "text-xs" : "text-sm"}>
              {relativeTime}
            </time>
          </div>
        </div>
      </div>

      {/* Status badge for unread */}
      {!isRead && (
        <div className="absolute top-3 right-3">
          <span className="sr-only">Unread</span>
          <span
            className="inline-flex items-center justify-center w-2 h-2 bg-blue-500 rounded-full animate-pulse"
            aria-hidden="true"
          />
        </div>
      )}
    </article>
  );
};

export default NotificationCard;
