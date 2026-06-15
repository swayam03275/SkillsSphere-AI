// @ts-nocheck

import React, { useEffect, useRef, useState } from "react";
import { Video, VideoOff, Mic } from "lucide-react";
import logger from "../../../utils/logger";

const CameraCheck = ({ onStreamReady }) => {
  const videoRef = useRef(null);
  const [stream, setStream] = useState(null);
  const [error, setError] = useState(null);
  const [micLevel, setMicLevel] = useState(0);

  useEffect(() => {
    let audioContext;
    let analyser;
    let microphone;
    let javascriptNode;
    let currentStream;

    const startCamera = async () => {
      try {
        currentStream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        });
        setStream(currentStream);
        if (videoRef.current) {
          videoRef.current.srcObject = currentStream;
        }
        onStreamReady(true);

        // Audio Visualizer Logic
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        analyser = audioContext.createAnalyser();
        microphone = audioContext.createMediaStreamSource(currentStream);
        javascriptNode = audioContext.createScriptProcessor(2048, 1, 1);

        analyser.smoothingTimeConstant = 0.8;
        analyser.fftSize = 1024;

        microphone.connect(analyser);
        analyser.connect(javascriptNode);
        javascriptNode.connect(audioContext.destination);

        javascriptNode.onaudioprocess = () => {
          const array = new Uint8Array(analyser.frequencyBinCount);
          analyser.getByteFrequencyData(array);
          let values = 0;
          for (let i = 0; i < array.length; i++) {
            values += array[i];
          }
          const average = values / array.length;
          setMicLevel(Math.min(100, average * 2.5));
        };
      } catch (err) {
        logger.error("Error accessing media devices:", err);
        setError("Camera or Microphone access denied. Please enable permissions to proceed.");
        onStreamReady(false);
      }
    };

    startCamera();

    return () => {
      if (javascriptNode) {
        javascriptNode.onaudioprocess = null;
        javascriptNode.disconnect();
      }
      if (microphone) {
        microphone.disconnect();
      }
      if (analyser) {
        analyser.disconnect();
      }
      if (audioContext && audioContext.state !== "closed") {
        audioContext.close();
      }
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
      if (currentStream) {
        currentStream.getTracks().forEach((track) => {
          track.stop();
        });
      }
    };
  }, []);

  return (
    <div className="group relative rounded-3xl bg-white dark:bg-surface p-6 sm:p-8 border border-gray-200 dark:border-slate-800 shadow-[0_20px_40px_rgba(0,0,0,0.04)] dark:shadow-none backdrop-blur-xl transition-all duration-300 hover:shadow-[0_20px_50px_rgba(16,185,129,0.15)] hover:border-emerald-500/30">
      <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-teal-500/5 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      
      <div className="relative z-10">
        <h3 className="text-xl font-bold flex items-center gap-3 mb-6 text-slate-900 dark:text-white">
          <span className="flex items-center justify-center w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-500 dark:bg-emerald-500/20 dark:text-emerald-400">
            <Video size={22} />
          </span>
          Hardware Calibration
        </h3>
        
        <div className="relative aspect-video rounded-2xl overflow-hidden bg-slate-900 shadow-inner mb-6 border border-slate-800">
          {error ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-red-400 bg-red-950/40 backdrop-blur-sm p-6 text-center">
              <VideoOff size={48} className="mb-4 opacity-80 animate-pulse" />
              <p className="font-semibold">{error}</p>
            </div>
          ) : !stream ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-500">
              <div className="relative w-16 h-16 mb-4 flex items-center justify-center">
                <div className="absolute inset-0 border-4 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
                <Video size={24} className="opacity-50" />
              </div>
              <p className="text-sm font-medium uppercase tracking-widest animate-pulse">Initializing Feed...</p>
            </div>
          ) : null}
          <video
            ref={videoRef}
            autoPlay
            muted
            playsInline
            className={`w-full h-full object-cover transition-opacity duration-700 ${stream ? "opacity-100" : "opacity-0"}`}
            style={{ transform: "rotateY(180deg)" }} // mirror effect for self view
          />
          
          {/* Hardware status overlay */}
          {stream && (
            <div className="absolute top-4 right-4 flex gap-2">
              <div className="px-2 py-1 rounded bg-black/50 backdrop-blur text-[10px] font-bold text-emerald-400 uppercase tracking-widest border border-emerald-500/30 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                Live
              </div>
            </div>
          )}
        </div>

        <p className="text-[11px] font-medium text-slate-500 mt-2 text-center tracking-wide">
          Tip: Ensure you are in a well-lit and quiet environment for the best experience.
        </p>
      </div>
    </div>
  );
};

export default CameraCheck;
