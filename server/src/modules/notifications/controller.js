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

/**
 * @desc    Get all notifications for authenticated user
 * @route   GET /api/notifications
 * @access  Private
 */
export const getNotifications = asyncHandler(async (req, res) => {
  const { page, limit, isRead } = req.query;
  const userId = req.user._id;

  const result = await getUserNotifications(userId, { page, limit, isRead });

  res.status(200).json({
    success: true,
    data: result.notifications,
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
    metadata,
  });

  res.status(201).json({
    success: true,
    data: notification,
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
    data: notification,
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
    data: notification,
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
