import React, { useRef, useEffect } from "react";
import { Hand, MicOff, VideoOff } from "lucide-react";
export default function VideoTile({ stream, user, isMuted, isHandRaised, isScreenShare, isLocal }) {
  const videoRef = useRef();

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
    return () => {
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
    };
  }, [stream]);

  return (
    <div className="relative rounded-xl overflow-hidden bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 shadow-lg aspect-video flex items-center justify-center">
      {stream ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={isLocal} // always mute local video to avoid echo
          className={`w-full h-full object-cover ${isLocal && !isScreenShare ? "scale-x-[-1]" : ""}`}
        />
      ) : (
        <div className="flex flex-col items-center justify-center text-gray-500 dark:text-slate-400">
          <div className="w-16 h-16 rounded-full bg-gray-200 dark:bg-slate-700 flex items-center justify-center mb-2 text-2xl font-bold text-gray-900 dark:text-white">
            {user?.name?.charAt(0) || "U"}
          </div>
          <span>{user?.name || "Participant"}</span>
        </div>
      )}

      {/* Overlay controls */}
      <div className="absolute bottom-3 left-3 flex items-center space-x-2 bg-black/60 px-3 py-1.5 rounded-lg backdrop-blur-sm">
        <span className="text-sm font-medium text-white truncate max-w-[120px]">
          {user?.name || "Participant"} {isLocal ? "(You)" : ""}
        </span>
        {isMuted && <MicOff size={14} className="text-red-400" />}
        {!stream && <VideoOff size={14} className="text-red-400" />}
      </div>

      {isHandRaised && (
        <div className="absolute top-3 right-3 bg-yellow-500/20 text-yellow-400 p-2 rounded-lg border border-yellow-500/30 shadow-lg backdrop-blur-sm animate-pulse">
          <Hand size={20} />
        </div>
      )}
    </div>
  );
}
