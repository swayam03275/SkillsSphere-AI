import React, { useEffect, useRef } from "react";
import { useSelector, useDispatch } from "react-redux";
import { io } from "socket.io-client";
import { useToast } from "./toast/ToastProvider";
import logger from "../../utils/logger";

import {
  addLiveNotification,
  getUnreadCount,
  setSocketStatus,
} from "../../features/notifications/notificationsSlice";
import { clearDashboardCache } from "../../modules/dashboard/services/dashboardService";

/**
 * A global component that listens for socket notifications and triggers toasts.
 * This component does not render any UI itself.
 */
const SocketNotificationListener = () => {
  const { user, token } = useSelector((state) => state.auth);
  const toast = useToast();
  const socketRef = useRef(null);
  const dispatch = useDispatch();

  const toastRef = useRef(toast);
  const processedNotifs = useRef(new Set());

  useEffect(() => {
    toastRef.current = toast;
  }, [toast]);

  useEffect(() => {
    const userId = user?._id || user?.id;

    if (!token || !userId) {
      if (socketRef.current) {
        dispatch(setSocketStatus("idle"));
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      return undefined;
    }

    socketRef.current = io("/", {
      transports: ["websocket"],
      path: "/socket.io",
      auth: { token },
    });

    const socket = socketRef.current;

    const handleConnect = () => {
      dispatch(setSocketStatus("connected"));
      socket.emit("join-notifications");
    };

    const handleApplicationStatusUpdated = (data) => {
      const { jobTitle, status } = data;
      const formattedStatus = status.charAt(0).toUpperCase() + status.slice(1);
      const message = `Your application for "${jobTitle}" was updated to "${formattedStatus}".`;
      const title = "Application Update";

      if (status === "rejected") {
        toastRef.current.error(message, title);
      } else {
        toastRef.current.success(message, title);
      }

      dispatch(getUnreadCount());
    };

    const handleNewNotification = (notif) => {
      if (!notif || !notif._id) {
        // Prevent processing empty or invalid notifications
        return;
      }
      
      if (processedNotifs.current.has(notif._id)) {
        return;
      }
      processedNotifs.current.add(notif._id);

      // Keep the Set size manageable
      if (processedNotifs.current.size > 200) {
        const iterator = processedNotifs.current.values();
        for (let i = 0; i < 50; i++) {
          processedNotifs.current.delete(iterator.next().value);
        }
      }

      dispatch(addLiveNotification(notif));

      if (
        notif.type === "application" ||
        notif.type === "application-status-updated"
      ) {
        return;
      }

      if (notif.type === "skill_gap_alert") {
        toastRef.current.error(notif.message, notif.title || "Skill Gap Alert");
      } else {
        toastRef.current.success(notif.message, notif.title || "Notification");
      }
    };

    const handleDisconnect = (reason) => {
      if (reason !== "io client disconnect") {
        dispatch(setSocketStatus("reconnecting"));
      }
    };

    const handleConnectError = (err) => {
      logger.warn("[Socket] Connection refused:", err.message);
      dispatch(setSocketStatus("disconnected"));
      socket.disconnect();
    };

    const handleDashboardRefresh = () => {
      clearDashboardCache();
      window.dispatchEvent(new CustomEvent("dashboard:refresh"));
    };

    socket.on("connect", handleConnect);
    socket.on("application-status-updated", handleApplicationStatusUpdated);
    socket.on("new-notification", handleNewNotification);
    socket.on("dashboard-refresh", handleDashboardRefresh);
    socket.on("disconnect", handleDisconnect);
    socket.on("connect_error", handleConnectError);

    return () => {
      socket.off("connect", handleConnect);
      socket.off("application-status-updated", handleApplicationStatusUpdated);
      socket.off("new-notification", handleNewNotification);
      socket.off("dashboard-refresh", handleDashboardRefresh);
      socket.off("disconnect", handleDisconnect);
      socket.off("connect_error", handleConnectError);
      dispatch(setSocketStatus("idle"));
      socket.disconnect();
      socketRef.current = null;
    };
  }, [user, token, dispatch]);

  return null;
};

export default SocketNotificationListener;
