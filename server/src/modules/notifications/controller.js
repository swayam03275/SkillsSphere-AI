import asyncHandler from "../../utils/asyncHandler.js";
import AppError from "../../utils/AppError.js";
import {
  createNotification as createNotificationService,
  getUserNotifications,
  getNotificationById,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
  deleteAllNotifications,
  getUnreadNotificationCount,
} from "./service.js";

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

  if (/[\s\\\u0000-\u001F\u007F]/.test(value)) {
    return false;
  }

  const decoded = decodeActionUrl(value);
  if (!decoded || decoded.length === 0 || decoded !== decoded.trim()) {
    return false;
  }

  if (/[\s\\\u0000-\u001F\u007F]/.test(decoded)) {
    return false;
  }

  if (/^[A-Za-z][A-Za-z0-9+.-]*:/.test(decoded)) {
    return false;
  }

  return decoded.startsWith("/") && !decoded.startsWith("//");
};

export const sanitizeNotificationMetadata = (metadata) => {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return {};
  }

  const sanitized = { ...metadata };
  if ("actionUrl" in sanitized) {
    const decodedActionUrl = decodeActionUrl(sanitized.actionUrl);
    if (isSafeNotificationActionUrl(sanitized.actionUrl)) {
      sanitized.actionUrl = decodedActionUrl;
    } else {
      delete sanitized.actionUrl;
    }
  }

  return sanitized;
};

const serializeNotification = (notification) => {
  const serialized =
    notification && typeof notification.toObject === "function"
      ? notification.toObject()
      : notification;

  if (!serialized || typeof serialized !== "object") {
    return serialized;
  }

  if (!("metadata" in serialized)) {
    return serialized;
  }

  return {
    ...serialized,
    metadata: sanitizeNotificationMetadata(serialized.metadata),
  };
};

/**
 * @desc    Get all notifications for authenticated user
 * @route   GET /api/notifications
 * @access  Private
 */
export const getNotifications = asyncHandler(async (req, res) => {
  const { page, limit, isRead, type } = req.query;
  const userId = req.user._id;

  if (type) {
    if (typeof type !== "string" || type.length > 50) {
      throw new AppError("Invalid type filter", 400);
    }
    const validTypes = [
      "jobs",
      "interviews",
      "system",
      "info",
      "warning",
      "success",
      "error",
      "job-update",
      "interview",
      "application",
      "new_application",
      "skill_gap_alert",
    ];
    if (!validTypes.includes(type)) {
      throw new AppError(`Type filter must be one of: ${validTypes.join(", ")}`, 400);
    }
  }

  const result = await getUserNotifications(userId, { page, limit, isRead, type });

  res.status(200).json({
    success: true,
    data: result.notifications.map(serializeNotification),
    pagination: result.pagination,
    message: "Notifications retrieved successfully",
  });
});

/**
 * @desc    Get unread notification count
 * @route   GET /api/notifications/unread-count
 * @access  Private
 */
export const getUnreadCount = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  const count = await getUnreadNotificationCount(userId);

  res.status(200).json({
    success: true,
    data: { unreadCount: count },
    message: "Unread count retrieved successfully",
  });
});

/**
 * @desc    Create a new notification (Admin/System only)
 * @route   POST /api/notifications
 * @access  Private (Typically called by system/admin)
 */
export const createNotification = asyncHandler(async (req, res) => {
  const { userId, title, message, type, metadata } = req.body;

  // Validate required fields
  const validationErrors = {};

  if (!userId) validationErrors.userId = "User ID is required";
  if (!title) validationErrors.title = "Title is required";
  if (!message) validationErrors.message = "Message is required";
  if (!type) {
    validationErrors.type = "Type is required";
  } else {
    const validTypes = [
      "info",
      "warning",
      "success",
      "error",
      "job-update",
      "interview",
      "application",
      "new_application",
      "skill_gap_alert",
    ];
    if (!validTypes.includes(type)) {
      validationErrors.type = `Type must be one of: ${validTypes.join(", ")}`;
    }
  }

  if (Object.keys(validationErrors).length > 0) {
    const error = new AppError("Validation failed", 400);
    error.errors = validationErrors;
    throw error;
  }

  if (req.user.role !== "admin" && userId !== req.user._id.toString()) {
    throw new AppError("Not authorized to create notifications for other users", 403);
  }
  
  const notification = await createNotificationService({
    userId,
    title,
    message,
    type,
    metadata: sanitizeNotificationMetadata(metadata),
  });

  res.status(201).json({
    success: true,
    data: serializeNotification(notification),
    message: "Notification created successfully",
  });
});

/**
 * @desc    Get a specific notification
 * @route   GET /api/notifications/:id
 * @access  Private
 */
export const getNotification = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.user._id;

  const notification = await getNotificationById(id, userId.toString());

  res.status(200).json({
    success: true,
    data: serializeNotification(notification),
    message: "Notification retrieved successfully",
  });
});

/**
 * @desc    Mark notification as read
 * @route   PATCH /api/notifications/:id/read
 * @access  Private
 */
export const markAsRead = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.user._id;

  const notification = await markNotificationAsRead(id, userId.toString());

  res.status(200).json({
    success: true,
    data: serializeNotification(notification),
    message: "Notification marked as read",
  });
});

/**
 * @desc    Mark all notifications as read
 * @route   PATCH /api/notifications/mark-all/read
 * @access  Private
 */
export const markAllAsRead = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  await markAllNotificationsAsRead(userId.toString());

  res.status(200).json({
    success: true,
    message: "All notifications marked as read",
  });
});

/**
 * @desc    Delete a notification
 * @route   DELETE /api/notifications/:id
 * @access  Private
 */
export const deleteNotificationById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const userId = req.user._id;

  await deleteNotification(id, userId.toString());

  res.status(200).json({
    success: true,
    message: "Notification deleted successfully",
  });
});

/**
 * @desc    Delete all notifications for user
 * @route   DELETE /api/notifications
 * @access  Private
 */
export const deleteAllNotificationsForUser = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  const result = await deleteAllNotifications(userId.toString());

  res.status(200).json({
    success: true,
    data: { deletedCount: result.deletedCount },
    message: "All notifications deleted successfully",
  });
});
