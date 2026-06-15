// @ts-nocheck

import React, { useRef, useEffect } from "react";
import { Hand, MicOff, VideoOff, PictureInPicture2 } from "lucide-react";
export default function VideoTile({ stream, user, isMuted, isHandRaised, isScreenShare, isVideoOff, isLocal }) {
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

  const handlePiP = async (e) => {
    e.stopPropagation();
    if (!videoRef.current) return;
    try {
      if (document.pictureInPictureElement === videoRef.current) {
        await document.exitPictureInPicture();
      } else {
        await videoRef.current.requestPictureInPicture();
      }
    } catch (err) {
      // Failed to enter PiP
    }
  };

  return (
    <div className="relative rounded-xl overflow-hidden bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 shadow-lg aspect-video flex items-center justify-center group">
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
      <div className="absolute bottom-3 left-3 flex items-center space-x-2 bg-black/60 px-3 py-1.5 rounded-lg backdrop-blur-sm group-hover:bg-black/70 transition-colors">
        <span className="text-sm font-medium text-white truncate max-w-[120px]">
          {user?.name || "Participant"} {isLocal ? "(You)" : ""}
        </span>
        {isMuted && <MicOff size={14} className="text-red-400" />}
        {(isVideoOff || !stream) && <VideoOff size={14} className="text-red-400" />}
      </div>

      {stream && (
        <button
          onClick={handlePiP}
          className="absolute bottom-3 right-3 bg-black/50 hover:bg-black/80 text-white p-2 rounded-lg backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity focus:opacity-100"
          title="Picture in Picture"
        >
          <PictureInPicture2 size={16} />
        </button>
      )}

      {isScreenShare && (
        <div className="absolute top-3 left-3 bg-blue-500/80 text-white px-2 py-1 text-xs font-semibold rounded border border-blue-400 shadow-lg backdrop-blur-sm z-10">
          Screen Share
        </div>
      )}

      {isHandRaised && (
        <div className="absolute top-3 right-3 bg-yellow-500/20 text-yellow-400 p-2 rounded-lg border border-yellow-500/30 shadow-lg backdrop-blur-sm animate-pulse">
          <Hand size={20} />
        </div>
      )}
    </div>
  );
}
