
import React from "react";
import { useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import { Info, CheckCircle, AlertTriangle, XCircle, Briefcase, Video, FileText, Trash2, Zap, MessageSquare } from "lucide-react";
import { markAsRead, deleteNotificationById } from "../../features/notifications/notificationsSlice";

const decodeActionUrl = (value) => {
  let decoded = value;

  for (let i = 0; i < 2; i += 1) {
    try {
      const nextDecoded = decodeURIComponent(decoded);
      if (nextDecoded === decoded) break;
      decoded = nextDecoded;
    } catch {
      return null;
    }
  }

  return decoded;
};

export const isSafeNotificationActionUrl = (value) => {
  if (typeof value !== "string" || value.length === 0 || value !== value.trim()) {
    return false;
  }

  // eslint-disable-next-line no-control-regex
  if (/[\s\\\u0000-\u001F\u007F]/.test(value)) {
    return false;
  }

  const decoded = decodeActionUrl(value);
  if (!decoded || decoded.length === 0 || decoded !== decoded.trim()) {
    return false;
  }

  // eslint-disable-next-line no-control-regex
  if (/[\s\\\u0000-\u001F\u007F]/.test(decoded)) {
    return false;
  }

  if (/^[A-Za-z][A-Za-z0-9+.-]*:/.test(decoded)) {
    return false;
  }

  return decoded.startsWith("/") && !decoded.startsWith("//");
};

const normalizeNotificationActionUrl = (value) => {
  if (!isSafeNotificationActionUrl(value)) {
    return null;
  }

  return decodeActionUrl(value);
};

const formatTimestamp = (dateString) => {
  if (!dateString) return "";
  const now = new Date();
  const past = new Date(dateString);
  // @ts-expect-error TODO: Fix pervasive types
  const diffMs = now - past;
  
  if (diffMs < 0) return "Just now"; // Handle minor clock drift

  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;

  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays}d ago`;

  return past.toLocaleDateString(undefined, { month: "short", day: "numeric" });
};

const getNotificationConfig = (type) => {
  switch (type) {
    case "success":
      return {
        icon: <CheckCircle className="text-emerald-500" size={18} />,
        bgColor: "bg-emerald-500/10 border-emerald-500/20",
      };
    case "warning":
      return {
        icon: <AlertTriangle className="text-amber-500" size={18} />,
        bgColor: "bg-amber-500/10 border-amber-500/20",
      };
    case "error":
      return {
        icon: <XCircle className="text-rose-500" size={18} />,
        bgColor: "bg-rose-500/10 border-rose-500/20",
      };
    case "job-update":
      return {
        icon: <Briefcase className="text-indigo-500" size={18} />,
        bgColor: "bg-indigo-500/10 border-indigo-500/20",
      };
    case "interview":
      return {
        icon: <Video className="text-purple-500" size={18} />,
        bgColor: "bg-purple-500/10 border-purple-500/20",
      };
    case "application":
      return {
        icon: <FileText className="text-sky-500" size={18} />,
        bgColor: "bg-sky-500/10 border-sky-500/20",
      };
    case "new_application":
      return {
        icon: <Briefcase className="text-teal-500" size={18} />,
        bgColor: "bg-teal-500/10 border-teal-500/20",
      };
    case "skill_gap_alert":
      return {
        icon: <AlertTriangle className="text-rose-500" size={18} />,
        bgColor: "bg-rose-500/10 border-rose-500/20",
      };
    case "system":
      return {
        icon: <Zap className="text-amber-500" size={18} />,
        bgColor: "bg-amber-500/10 border-amber-500/20",
      };
    case "message":
      return {
        icon: <MessageSquare className="text-indigo-500" size={18} />,
        bgColor: "bg-indigo-500/10 border-indigo-500/20",
      };
    case "application_status":
      return {
        icon: <CheckCircle className="text-blue-500" size={18} />,
        bgColor: "bg-blue-500/10 border-blue-500/20",
      };
    case "info":
    default:
      return {
        icon: <Info className="text-blue-500" size={18} />,
        bgColor: "bg-blue-500/10 border-blue-500/20",
      };
  }
};

const NotificationItem = ({ notification, onCloseDropdown }) => {
  const dispatch = useDispatch<any>();
  const navigate = useNavigate();
  const { _id, title, message, type, isRead, createdAt, metadata } = notification;

  const config = getNotificationConfig(type);
  const safeActionUrl = normalizeNotificationActionUrl(metadata?.actionUrl);

  const handleActionNavigation = () => {
    if (!safeActionUrl) return;
    onCloseDropdown();
    navigate(safeActionUrl);
  };

  const handleItemClick = (e) => {
    // If clicking a link/action or the delete button, prevent marking read from interrupting
    if (e.target.closest(".action-btn")) return;

    if (!isRead) {
      dispatch(markAsRead(_id));
    }

    // Optionally handle navigation if actionUrl is present
    if (safeActionUrl) {
      handleActionNavigation();
    }
  };

  const handleDelete = (e) => {
    e.stopPropagation();
    dispatch(deleteNotificationById(_id));
  };

  return (
    <div
      onClick={handleItemClick}
      className={`group relative flex gap-3.5 p-4 border-b border-[var(--border)] transition-all duration-300 cursor-pointer
        ${isRead 
          ? "bg-transparent hover:bg-[var(--surface-hover)]" 
          : "bg-[var(--primary)]/5 hover:bg-[var(--primary)]/10 shadow-[inset_3px_0_0_0_var(--primary)]"
        }`}
    >
      {/* Icon Badge */}
      <div className={`flex items-center justify-center w-9 h-9 rounded-xl border flex-shrink-0 ${config.bgColor}`}>
        {config.icon}
      </div>

      {/* Text Context */}
      <div className="flex-grow pr-5">
        <div className="flex justify-between items-start gap-2">
          <p className={`text-sm font-semibold truncate transition-colors duration-200
            ${isRead ? "text-[var(--text-main)]" : "text-[var(--primary)]"}`}
          >
            {title}
          </p>
          <span className="text-[11px] text-[var(--text-muted)] whitespace-nowrap flex-shrink-0 mt-0.5">
            {formatTimestamp(createdAt)}
          </span>
        </div>
        <p className={`text-xs mt-1 leading-relaxed ${isRead ? "text-[var(--text-muted)]" : "text-[var(--text-main)]"}`}>
          {message}
        </p>

        {/* Action Button/Link if actionUrl exists */}
        {safeActionUrl && (
          <div className="mt-2.5">
            <span
              className="action-btn inline-flex items-center text-[11px] font-bold text-[var(--primary)] hover:underline"
              onClick={(e) => {
                e.stopPropagation();
                handleActionNavigation();
              }}
            >
              View Details &rarr;
            </span>
          </div>
        )}
      </div>

      {/* Delete/Trash Button */}
      <button
        type="button"
        onClick={handleDelete}
        className="action-btn absolute right-3 top-4 p-1.5 rounded-lg text-[var(--text-muted)] hover:text-red-500 hover:bg-red-500/10 opacity-0 group-hover:opacity-100 transition-all duration-300"
        title="Delete Notification"
        aria-label="Delete notification"
      >
        <Trash2 size={14} />
      </button>

      {/* Unread dot indicator */}
      {!isRead && (
        <span className="absolute right-3.5 bottom-4 w-2 h-2 rounded-full bg-[var(--primary)] shadow-[0_0_8px_var(--primary)]" />
      )}
    </div>
  );
};

export default NotificationItem;
