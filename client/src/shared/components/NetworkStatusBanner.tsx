import React, { useEffect, useRef, useState } from "react";
import { useSelector } from "react-redux";
import { WifiOff, RefreshCw, CheckCircle2 } from "lucide-react";

export default function NetworkStatusBanner() {
  const socketStatus = useSelector((state: any) => state.notifications.socketStatus);
  const [showSuccess, setShowSuccess] = useState(false);
  const prevStatusRef = useRef(socketStatus);

  useEffect(() => {
    if (
      (prevStatusRef.current === "reconnecting" || prevStatusRef.current === "disconnected") &&
      socketStatus === "connected"
    ) {
      setShowSuccess(true);
      const timer = setTimeout(() => {
        setShowSuccess(false);
      }, 3000);
      return () => clearTimeout(timer);
    }
    if (socketStatus !== "connected") {
      setShowSuccess(false);
    }
    prevStatusRef.current = socketStatus;
  }, [socketStatus]);

  const isOffline = socketStatus === "reconnecting" || socketStatus === "disconnected";

  if (!isOffline && !showSuccess) return null;

  return (
    <div
      className={`fixed top-0 left-0 right-0 z-[9999] flex items-center justify-center p-3 text-sm font-semibold transition-all duration-500 backdrop-blur-md shadow-md border-b ${
        showSuccess
          ? "bg-emerald-500/90 dark:bg-emerald-950/80 border-emerald-500/20 text-white"
          : socketStatus === "reconnecting"
          ? "bg-amber-500/90 dark:bg-amber-950/80 border-amber-500/20 text-white animate-pulse"
          : "bg-red-500/90 dark:bg-red-950/80 border-red-500/20 text-white"
      }`}
    >
      <div className="flex items-center gap-2">
        {showSuccess ? (
          <CheckCircle2 size={16} className="text-emerald-300" />
        ) : socketStatus === "reconnecting" ? (
          <RefreshCw size={16} className="text-amber-300 animate-spin" />
        ) : (
          <WifiOff size={16} className="text-red-300" />
        )}
        <span>
          {showSuccess
            ? "Connection Restored!"
            : socketStatus === "reconnecting"
            ? "Connection lost. Trying to reconnect..."
            : "Disconnected from server. Please check your connection."}
        </span>
      </div>
    </div>
  );
}
