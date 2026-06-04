import { useCallback, useEffect, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotificationById,
  clearAllNotifications,
} from "../../../features/notifications/notificationsSlice";

/**
 * Custom hook for managing notifications
 * Provides access to notifications state and dispatch functions
 */
export const useNotifications = ({ page = 1, limit = 10, filter = "all", type } = {}) => {
  const dispatch = useDispatch();
  const { items, unreadCount, loading, error, pagination, socketStatus } = useSelector(
    (state) => state.notifications,
  );
  const isRead = useMemo(() => {
    if (filter === "read") return true;
    if (filter === "unread") return false;
    return undefined;
  }, [filter]);

  // Fetch notifications on component mount
  useEffect(() => {
    dispatch(getNotifications({ page, limit, isRead, type }));
    dispatch(getUnreadCount());
  }, [dispatch, page, limit, isRead, type]);

  // Mark single notification as read
  const handleMarkAsRead = useCallback(
    (notificationId) => {
      dispatch(markAsRead(notificationId));
    },
    [dispatch],
  );

  // Mark all notifications as read
  const handleMarkAllAsRead = useCallback(() => {
    dispatch(markAllAsRead());
  }, [dispatch]);

  // Delete single notification
  const handleDeleteNotification = useCallback(
    (notificationId) => {
      dispatch(deleteNotificationById(notificationId));
    },
    [dispatch],
  );

  // Delete all notifications
  const handleDeleteAllNotifications = useCallback(() => {
    dispatch(clearAllNotifications());
  }, [dispatch]);

  // Load more notifications (pagination)
  const handleLoadMore = useCallback(() => {
    const nextPage = pagination.page + 1;
    if (nextPage <= pagination.pages) {
      dispatch(getNotifications({ page: nextPage, limit, isRead, type }));
    }
  }, [dispatch, pagination, limit, isRead, type]);

  return {
    notifications: items,
    unreadCount,
    loading,
    error,
    pagination,
    socketStatus,
    markAsRead: handleMarkAsRead,
    markAllAsRead: handleMarkAllAsRead,
    deleteNotification: handleDeleteNotification,
    deleteAllNotifications: handleDeleteAllNotifications,
    loadMore: handleLoadMore,
    hasMore: pagination.pages > 1 && pagination.page < pagination.pages,
  };
};

export default useNotifications;
