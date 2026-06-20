import express from "express";
import { protect } from "../../middleware/authMiddleware.js";
import {
  getNotifications,
  getUnreadCount,
  createNotification,
  getNotification,
  markAsRead,
  markAllAsRead,
  deleteNotificationById,
  deleteAllNotificationsForUser,
  deleteNotificationsBulk,
} from "./controller.js";

const router = express.Router();

// Protect all routes
router.use(protect);

/**
 * @openapi
 * /api/notifications:
 *   get:
 *     summary: Get user notifications
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Notifications retrieved
 */
router.get("/", getNotifications);

/**
 * @openapi
 * /api/notifications/unread-count:
 *   get:
 *     summary: Get unread notifications count
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Unread count retrieved
 */
router.get("/unread-count", getUnreadCount);

/**
 * @openapi
 * /api/notifications:
 *   post:
 *     summary: Create a notification
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       201:
 *         description: Notification created
 */
router.post("/", createNotification);

/**
 * @openapi
 * /api/notifications/mark-all/read:
 *   patch:
 *     summary: Mark all notifications as read
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: All notifications marked as read
 */
router.patch("/mark-all/read", markAllAsRead);

/**
 * @openapi
 * /api/notifications/bulk:
 *   delete:
 *     summary: Delete multiple notifications
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Notifications deleted
 */
router.delete("/bulk", deleteNotificationsBulk);

/**
 * @openapi
 * /api/notifications/{id}:
 *   get:
 *     summary: Get a specific notification
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Notification retrieved
 */
router.get("/:id", getNotification);

/**
 * @openapi
 * /api/notifications/{id}/read:
 *   patch:
 *     summary: Mark a notification as read
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Notification marked as read
 */
router.patch("/:id/read", markAsRead);

/**
 * @openapi
 * /api/notifications/{id}:
 *   delete:
 *     summary: Delete a notification
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Notification deleted
 */
router.delete("/:id", deleteNotificationById);

/**
 * @openapi
 * /api/notifications:
 *   delete:
 *     summary: Delete all notifications for the user
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: All notifications deleted
 */
router.delete("/", deleteAllNotificationsForUser);
export default router;
