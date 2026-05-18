import React, { useEffect, useRef } from "react";
import { useSelector } from "react-redux";
import { io } from "socket.io-client";
import { useToast } from "./toast/ToastProvider";

const SOCKET_URL = ""; // Connects to the same origin as the frontend (proxied to 5000)

/**
 * A global component that listens for socket notifications and triggers toasts.
 * This component does not render any UI itself.
 */
const SocketNotificationListener = () => {
  const { user, token } = useSelector((state) => state.auth);
  const toast = useToast();
  const socketRef = useRef(null);

  useEffect(() => {
    const userId = user?._id || user?.id;

    // Only connect if user is logged in and we have an ID
    if (!token || !userId) {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      return;
    }

    // Initialize socket connection
    if (!socketRef.current) {
      // Connect to relative path (uses Vite proxy).
      // The JWT token is sent in the handshake auth object so the server
      // can verify identity in io.use() before any events are processed.
      socketRef.current = io("/", {
        transports: ["websocket"],
        path: "/socket.io",
        auth: { token },
      });

      socketRef.current.on("connect", () => {
        // No userId needed — the server reads it from the verified JWT
        socketRef.current.emit("join-notifications");
      });

      socketRef.current.on("notification-ready", (data) => {
        // Successfully joined room
      });

      socketRef.current.on("application-status-updated", (data) => {
        const { jobTitle, status } = data;
        
        const message = `Your application for "${jobTitle}" was updated to "${status.charAt(0).toUpperCase() + status.slice(1)}".`;
        const title = "Application Update";
        
        if (status === "rejected") {
          toast.error(message, title);
        } else {
          toast.success(message, title);
        }
      });

      socketRef.current.on("disconnect", (reason) => {
        // Handled
      });

      socketRef.current.on("connect_error", (err) => {
        // Server rejected the connection (e.g. invalid or expired token)
        console.warn("[Socket] Connection refused:", err.message);
        socketRef.current.disconnect();
        socketRef.current = null;
      });
    } else {
      // Socket already exists — re-join the room (e.g. after a user state update)
      socketRef.current.emit("join-notifications");
    }

    return () => {};
  }, [user, token, toast]);

  return null; // This component has no UI
};

export default SocketNotificationListener;
