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
} from "./controller.js";

const router = express.Router();

// Protect all routes
router.use(protect);

router.get("/", getNotifications);

router.get("/unread-count", getUnreadCount);

router.post("/", createNotification);

router.patch("/mark-all/read", markAllAsRead);

router.get("/:id", getNotification);

router.patch("/:id/read", markAsRead);

router.patch("/mark-all/read", markAllAsRead);
router.patch("/:id/read", markAsRead);
router.delete("/:id", deleteNotificationById);

router.delete("/", deleteAllNotificationsForUser);
export default router;
