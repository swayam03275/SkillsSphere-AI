
import { useCallback, useEffect, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotificationById,
  clearAllNotifications,
  deleteNotificationsBulk,
} from "../../../features/notifications/notificationsSlice";

/**
 * Custom hook for managing notifications
 * Provides access to notifications state and dispatch functions
 */
// @ts-expect-error TODO: Fix pervasive types
export const useNotifications = ({ page = 1, limit = 10, filter = "all", type } = {}) => {
  const dispatch = useDispatch<any>();
  const { items, unreadCount, loading, error, pagination, socketStatus } = useSelector((state: any) => state.notifications,
  );
  const isRead = useMemo(() => {
    if (filter === "read") return true;
    if (filter === "unread") return false;
    return undefined;
  }, [filter]);

  // Fetch notifications on component mount
  useEffect(() => {
    // @ts-expect-error TODO: Fix pervasive types
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

  // Delete multiple notifications in bulk
  const handleDeleteNotificationsBulk = useCallback(
    (notificationIds) => {
      dispatch(deleteNotificationsBulk(notificationIds));
    },
    [dispatch],
  );

  // Load more notifications (pagination)
  const handleLoadMore = useCallback(() => {
    const nextPage = pagination.page + 1;
    if (nextPage <= pagination.pages) {
      // @ts-expect-error TODO: Fix pervasive types
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
    deleteNotificationsBulk: handleDeleteNotificationsBulk,
    loadMore: handleLoadMore,
    hasMore: pagination.pages > 1 && pagination.page < pagination.pages,
  };
};

export default useNotifications;
