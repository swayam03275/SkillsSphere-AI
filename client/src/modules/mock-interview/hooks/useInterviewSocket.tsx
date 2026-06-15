import { useState, useEffect, useRef } from "react";
import { io } from "socket.io-client";
import { SOCKET_URL } from "../../../config/env";
import { loadInterviewSession } from "../../../utils/interviewSessionStorage";
import { getToken } from "../../../utils/authToken";
import logger from "../../../utils/logger";

export const useInterviewSocket = ({
  sessionId,
  user,
  session,
  isObserver,
  elapsedTime,
  uploadStatus,
  setAnswer,
  setError,
  setSubmitting,
  setUploadStatus,
  setRecoveryMessage,
  handleEvaluationResult,
  persistBackup,
  textareaRef,
  setFailedAction,
}) => {
  const [socket, setSocket] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [liveTyping, setLiveTyping] = useState("");
  const [socketStatus, setSocketStatus] = useState("connecting");
  
  const messageQueue = useRef([]);
  const wasConnected = useRef(false);

  useEffect(() => {
    if (!session || !user) return;
    const token = getToken();
    
    const newSocket = io(SOCKET_URL, {
      auth: { token },
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000
    });

    const handleConnect = () => {
      setSocketStatus("connected");
      newSocket.emit("join-interview", { sessionId });
      
      if (wasConnected.current) {
        const savedSession = loadInterviewSession();
        if (savedSession && savedSession.sessionId === sessionId) {
          newSocket.emit("rehydrate-interview", {
            sessionId,
            currentIndex: savedSession.currentIndex,
            previousMessages: savedSession.messages,
            activeTopic: session?.topic,
            lastAiResponse: session?.answers?.[savedSession.currentIndex]?.questionText,
            elapsedTime: savedSession.elapsedTime,
            uploadStatus: savedSession.uploadStatus,
          });
          setRecoveryMessage("Reconnected and resynced interview progress.");
          setTimeout(() => setRecoveryMessage(null), 3000);
          
          if (messageQueue.current.length > 0) {
            messageQueue.current.forEach(msg => newSocket.emit("submit-answer", msg));
            messageQueue.current = [];
            setUploadStatus("submitted");
          }
        }
      }
      wasConnected.current = true;
    };

    const handleDisconnect = () => {
      setSocketStatus("disconnected");
      setRecoveryMessage("Connection lost. Your answer is saved locally.");
      persistBackup();
    };

    const handleReconnectAttempt = () => {
      setSocketStatus("reconnecting");
      setRecoveryMessage("Reconnecting to the interview room...");
    };

    const handleParticipants = (pts) => {
      setParticipants(pts.filter(p => p.user.id !== user._id));
    };

    const handleParticipantJoined = (data) => {
      setParticipants(prev => [...prev.filter(p => p.socketId !== data.socketId), data]);
    };

    const handleParticipantLeft = (data) => {
      setParticipants(prev => prev.filter(p => p.socketId !== data.socketId));
    };

    const handleTyping = ({ text }) => {
      setLiveTyping(text);
    };

    const handleAnswerEvaluated = (data) => {
      handleEvaluationResult(data, textareaRef);
      setUploadStatus("idle");
    };

    const handleLiveTranscript = (data) => {
      if (data.transcript) {
        setAnswer((prev) => (prev ? prev + " " + data.transcript : data.transcript));
      }
    };

    const handleEvaluationError = (err) => {
      setError(err.message || "Failed to submit answer.");
      setUploadStatus("failed");
      setFailedAction("submit");
      logger.error("[InterviewSessionSocket] Evaluation error:", err);
      setSubmitting(false);
    };

    newSocket.on("connect", handleConnect);
    newSocket.on("disconnect", handleDisconnect);
    newSocket.io.on("reconnect_attempt", handleReconnectAttempt);
    newSocket.on("interview-participants", handleParticipants);
    newSocket.on("participant-joined", handleParticipantJoined);
    newSocket.on("participant-left", handleParticipantLeft);
    newSocket.on("interview-typing", handleTyping);
    newSocket.on("answer-evaluated", handleAnswerEvaluated);
    newSocket.on("live-transcript", handleLiveTranscript);
    newSocket.on("evaluation-error", handleEvaluationError);

    setSocket(newSocket);

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        if (newSocket && newSocket.disconnected) {
          newSocket.connect();
        }
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      newSocket.off("connect", handleConnect);
      newSocket.off("disconnect", handleDisconnect);
      newSocket.io.off("reconnect_attempt", handleReconnectAttempt);
      newSocket.off("interview-participants", handleParticipants);
      newSocket.off("participant-joined", handleParticipantJoined);
      newSocket.off("participant-left", handleParticipantLeft);
      newSocket.off("interview-typing", handleTyping);
      newSocket.off("answer-evaluated", handleAnswerEvaluated);
      newSocket.off("live-transcript", handleLiveTranscript);
      newSocket.off("evaluation-error", handleEvaluationError);
      
      newSocket.close();
    };
  }, [
    sessionId,
    user,
    session,
    handleEvaluationResult,
    persistBackup,
    setAnswer,
    setError,
    setRecoveryMessage,
    setSubmitting,
    setUploadStatus,
    textareaRef,
    setFailedAction,
  ]);

  const submitSocketAnswer = (transcript) => {
    if (socket && socketStatus === "connected") {
      socket.emit("submit-answer", { sessionId, transcript, audioBuffer: null });
      return true;
    } else if (socket && (socketStatus === "disconnected" || socketStatus === "reconnecting")) {
      messageQueue.current.push({ sessionId, transcript, audioBuffer: null });
      setUploadStatus("queued");
      setRecoveryMessage("Offline: answer queued and saved locally.");
      setTimeout(() => setRecoveryMessage(null), 3000);
      setSubmitting(false);
      return true;
    }
    return false;
  };

  const handleSendFeedback = (note) => {
    if (socket) {
      socket.emit("save-private-note", { sessionId, note });
    }
  };

  return {
    socket,
    socketStatus,
    participants,
    liveTyping,
    submitSocketAnswer,
    handleSendFeedback,
  };
};
