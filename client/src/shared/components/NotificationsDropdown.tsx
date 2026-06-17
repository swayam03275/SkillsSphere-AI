// @ts-nocheck

import React, { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { BellOff, Loader2, CheckCheck, Trash } from "lucide-react";
import NotificationItem from "./NotificationItem";
import { 
  getNotifications, 
  markAllAsRead, 
  clearAllNotifications 
} from "../../features/notifications/notificationsSlice";

const NotificationsDropdown = ({ isOpen, onClose }) => {
  const dispatch = useDispatch();
  const dropdownRef = useRef(null);
  const [loadMoreLoading, setLoadMoreLoading] = useState(false);

  const { items, unreadCount, loading, pagination } = useSelector(
    (state) => state.notifications
  );

  // Close on clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        isOpen &&
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target) &&
        !event.target.closest(".notifications-trigger")
      ) {
        onClose();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen, onClose]);

  // Fetch first page on mount or when opened
  useEffect(() => {
    if (isOpen) {
      dispatch(getNotifications({ page: 1, limit: 10 }));
    }
  }, [isOpen, dispatch]);

  const handleMarkAllRead = () => {
    dispatch(markAllAsRead());
  };

  const handleClearAll = () => {
    if (window.confirm("Are you sure you want to clear all notifications?")) {
      dispatch(clearAllNotifications());
    }
  };

  const handleLoadMore = async () => {
    if (pagination.page < pagination.pages && !loadMoreLoading) {
      setLoadMoreLoading(true);
      await dispatch(
        getNotifications({ page: pagination.page + 1, limit: 10 })
      );
      setLoadMoreLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      ref={dropdownRef}
      className="absolute right-0 mt-3 w-[380px] max-md:w-[calc(100vw-32px)] max-md:right-[-40px] z-[1002] rounded-2xl border border-[var(--border)] bg-[var(--surface)] backdrop-blur-xl shadow-[var(--shadow-soft)] overflow-hidden animate-[slideFadeIn_0.2s_ease_forwards]"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border)] bg-[var(--surface-soft)]/50">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-bold text-[var(--text-main)]">Notifications</h3>
          {unreadCount > 0 && (
            <span className="flex h-5 items-center justify-center rounded-full bg-[var(--primary)] px-2 text-[10px] font-extrabold text-white">
              {unreadCount} new
            </span>
          )}
        </div>

        {items.length > 0 && (
          <div className="flex gap-2">
            <button
              onClick={handleMarkAllRead}
              className="flex items-center justify-center p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--primary)] hover:bg-[var(--primary)]/10 transition-colors"
              title="Mark all as read"
              aria-label="Mark all as read"
            >
              <CheckCheck size={15} />
            </button>
            <button
              onClick={handleClearAll}
              className="flex items-center justify-center p-1.5 rounded-lg text-[var(--text-muted)] hover:text-red-500 hover:bg-red-500/10 transition-colors"
              title="Clear all notifications"
              aria-label="Clear all notifications"
            >
              <Trash size={15} />
            </button>
          </div>
        )}
      </div>

      {/* List Body */}
      <div className="max-h-[360px] overflow-y-auto divide-y divide-[var(--border)]">
        {loading && items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-[var(--text-muted)]">
            <Loader2 className="animate-spin text-[var(--primary)]" size={24} />
            <p className="text-xs">Loading notifications...</p>
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-6 gap-3 text-center">
            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-[var(--surface-soft)] border border-[var(--border)] text-[var(--text-muted)]">
              <BellOff size={20} />
            </div>
            <div>
              <p className="text-sm font-semibold text-[var(--text-main)]">You're all caught up!</p>
              <p className="text-xs text-[var(--text-muted)] mt-1">No notifications found at this time.</p>
            </div>
          </div>
        ) : (
          <>
            {items.map((notification) => (
              <NotificationItem
                key={notification._id}
                notification={notification}
                onCloseDropdown={onClose}
              />
            ))}

            {/* Pagination / Load More */}
            {pagination.page < pagination.pages && (
              <div className="p-3 text-center bg-[var(--surface-soft)]/20">
                <button
                  onClick={handleLoadMore}
                  disabled={loadMoreLoading}
                  className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-bold text-[var(--primary)] hover:bg-[var(--primary)]/10 transition-colors disabled:opacity-50"
                >
                  {loadMoreLoading ? (
                    <>
                      <Loader2 className="animate-spin" size={12} />
                      <span className="sr-only">Loading...</span>
                    </>
                  ) : (
                    "Load More"
                  )}
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Footer - View All Link */}
      <div className="sticky bottom-0 border-t border-[var(--border)] bg-[var(--surface-soft)]/90 backdrop-blur-md p-3 text-center">
        <Link
          to="/notifications"
          onClick={onClose}
          className="inline-flex items-center justify-center gap-1.5 w-full py-2.5 rounded-xl text-xs font-extrabold text-[var(--primary)] hover:bg-[var(--primary)]/10 transition-colors"
        >
          <span>View all notifications</span>
        </Link>
      </div>
    </div>
  );
};

export default NotificationsDropdown;
