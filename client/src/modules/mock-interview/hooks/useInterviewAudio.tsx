import { useState, useRef, useCallback } from "react";
import logger from "../../../utils/logger";

export const useInterviewAudio = ({
  sessionId,
  socket,
  socketStatus,
  setUploadStatus,
  setError,
  setMediaWarning,
  persistBackup,
  setRecoveryMessage,
  setFailedAction,
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef(null);
  const mediaStreamRef = useRef(null);
  const mediaTrackCleanupRef = useRef([]);
  const isStartingRef = useRef(false);

  const clearMediaTrackListeners = useCallback(() => {
    mediaTrackCleanupRef.current.forEach((cleanup) => cleanup());
    mediaTrackCleanupRef.current = [];
  }, []);

  const attachMediaTrackListeners = useCallback(
    (stream) => {
      clearMediaTrackListeners();
      const handleEnded = () => {
        setIsRecording(false);
        setUploadStatus("failed");
        setFailedAction("media");
        setMediaWarning(
          "Audio input was disconnected. Your answer is saved, and you can retry the microphone.",
        );
        persistBackup({ uploadStatus: "failed" });
      };

      stream.getTracks().forEach((track) => {
        track.addEventListener("ended", handleEnded);
        mediaTrackCleanupRef.current.push(() => {
          track.removeEventListener("ended", handleEnded);
        });
      });
    },
    [clearMediaTrackListeners, persistBackup, setMediaWarning, setUploadStatus],
  );

  const startRecording = useCallback(async () => {
    if (isStartingRef.current) return;
    isStartingRef.current = true;
    try {
      setMediaWarning(null);
      setError(null);
      setFailedAction(null);
      setUploadStatus("starting");
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, { mimeType: "audio/webm" });
      mediaRecorderRef.current = mediaRecorder;
      mediaStreamRef.current = stream;
      attachMediaTrackListeners(stream);

      if (socket && socketStatus === "connected") {
        socket.emit("start-audio-stream", { sessionId });
      }

      mediaRecorder.ondataavailable = (event) => {
        try {
          if (event.data.size > 0 && socket && socketStatus === "connected") {
            setUploadStatus("uploading");
            socket.emit("audio-chunk", { sessionId, chunk: event.data });
          } else if (event.data.size > 0) {
            setUploadStatus("queued");
            setRecoveryMessage("Audio upload paused until the connection recovers.");
          }
        } catch (err) {
          setUploadStatus("failed");
          setError("Audio upload failed. Your typed answer is still saved.");
          logger.error("[InterviewSessionAudio] Audio chunk error:", err);
        }
      };

      mediaRecorder.onerror = (event) => {
        setUploadStatus("failed");
        setFailedAction("media");
        setError("Recording failed. Your answer is saved, and you can retry recording.");
        logger.error("[InterviewSessionAudio] Media recorder error:", event.error || event);
      };

      mediaRecorder.onstop = () => {
        setUploadStatus((status) => (status === "failed" ? "failed" : "idle"));
      };

      mediaRecorder.start(1000);
      setIsRecording(true);
      setUploadStatus("uploading");
      persistBackup({ uploadStatus: "uploading" });
    } catch (err) {
      logger.error("Error accessing microphone:", err);
      setIsRecording(false);
      setUploadStatus("failed");
      setFailedAction("media");
      setMediaWarning("Microphone access was denied or unavailable. Check your device and retry.");
      setError("Microphone access denied or unavailable.");
      persistBackup({ uploadStatus: "failed" });
    } finally {
      isStartingRef.current = false;
    }
  }, [attachMediaTrackListeners, persistBackup, sessionId, setError, setFailedAction, setMediaWarning, setRecoveryMessage, setUploadStatus, socket, socketStatus]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach((track) => track.stop());
    }
    clearMediaTrackListeners();
    mediaStreamRef.current = null;
    if (socket && socketStatus === "connected") {
      socket.emit("end-audio-stream", { sessionId });
    }
    setUploadStatus("idle");
    setIsRecording(false);
  }, [clearMediaTrackListeners, sessionId, socket, socketStatus, setUploadStatus]);

  const cleanupAudio = useCallback(() => {
    if (mediaRecorderRef.current) {
      if (mediaRecorderRef.current.state !== "inactive") {
        mediaRecorderRef.current.stop();
      }
      if (mediaRecorderRef.current.stream) {
        mediaRecorderRef.current.stream.getTracks().forEach((track) => track.stop());
      }
    }
    clearMediaTrackListeners();
    if (socket && socketStatus === "connected") {
      socket.emit("end-audio-stream", { sessionId });
    }
  }, [clearMediaTrackListeners, sessionId, socket, socketStatus]);

  return {
    isRecording,
    startRecording,
    stopRecording,
    cleanupAudio,
  };
};
