
import { apiRequest } from "./apiClient";

/**
 * Fetch paginated notifications for the authenticated user.
 * @param {string} token - The auth JWT token
 * @param {Object} [params] - Query parameters
 * @param {number} [params.page=1] - Page number
 * @param {number} [params.limit=10] - Number of items per page
 * @param {boolean} [params.isRead] - Optional filter by read status
 * @returns {Promise<Object>} The API response containing notifications and pagination
 */
export const fetchNotifications = async (token, params = {}) => {
  // @ts-expect-error TODO: Fix pervasive types
  const { page = 1, limit = 10, isRead, type } = params;
  let queryString = `?page=${page}&limit=${limit}`;
  
  if (isRead !== undefined) {
    queryString += `&isRead=${isRead}`;
  }

  if (type) {
    queryString += `&type=${type}`;
  }

  return apiRequest(`/api/notifications${queryString}`, {
    method: "GET",
    token,
  });
};

/**
 * Fetch count of unread notifications for the user.
 * @param {string} token - The auth JWT token
 * @returns {Promise<Object>} Object containing the unreadCount
 */
export const fetchUnreadCount = async (token) => {
  return apiRequest("/api/notifications/unread-count", {
    method: "GET",
    token,
  });
};

/**
 * Mark a single notification as read.
 * @param {string} id - The notification ID
 * @param {string} token - The auth JWT token
 * @returns {Promise<Object>} The updated notification object
 */
export const markNotificationRead = async (id, token) => {
  return apiRequest(`/api/notifications/${id}/read`, {
    method: "PATCH",
    token,
  });
};

/**
 * Mark all user notifications as read.
 * @param {string} token - The auth JWT token
 * @returns {Promise<Object>} The bulk update confirmation response
 */
export const markAllNotificationsRead = async (token) => {
  return apiRequest("/api/notifications/mark-all/read", {
    method: "PATCH",
    token,
  });
};

/**
 * Delete a single notification.
 * @param {string} id - The notification ID
 * @param {string} token - The auth JWT token
 * @returns {Promise<Object>} The delete confirmation response
 */
export const deleteNotification = async (id, token) => {
  return apiRequest(`/api/notifications/${id}`, {
    method: "DELETE",
    token,
  });
};

/**
 * Delete all notifications for the user.
 * @param {string} token - The auth JWT token
 * @returns {Promise<Object>} The delete confirmation response containing deletedCount
 */
export const deleteAllNotifications = async (token) => {
  return apiRequest("/api/notifications", {
    method: "DELETE",
    token,
  });
};

/**
 * Delete multiple notifications in a single request.
 * @param {string[]} ids - Array of notification IDs to delete
 * @param {string} token - The auth JWT token
 * @returns {Promise<Object>} The bulk delete confirmation response
 */
export const deleteNotificationsBulk = async (ids, token) => {
  return apiRequest("/api/notifications/bulk", {
    method: "DELETE",
    token,
    body: { ids },
  });
};
