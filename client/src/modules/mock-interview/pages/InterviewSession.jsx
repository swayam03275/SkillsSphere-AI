import React, { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { io } from "socket.io-client";
import { submitAnswer, completeInterview } from "../services/interviewService";
import { apiRequest } from "../../../services/apiClient";
import { SOCKET_URL } from "../../../config/env";
import InterviewSessionSkeleton from "../components/InterviewSessionSkeleton";
import ObserverPanel from "../components/ObserverPanel";
import RealtimeSentimentIndicator from "../components/RealtimeSentimentIndicator";
import { analyzeText, debounce } from "../utils/sentiment";
import Navbar from "../../../modules/landing/components/Navbar";
import Footer from "../../../modules/landing/components/Footer";

import {
  saveInterviewSession,
  loadInterviewSession,
  clearInterviewSession
} from "../../../utils/interviewSessionStorage";
import logger from "../../../utils/logger";
import {
  Send,
  CheckCircle,
  Clock,
  ChevronRight,
  Trophy,
  Loader2,
  AlertCircle,
  Target,
  MessageSquare,
  Brain,
  Mic,
  MicOff,
  Activity,
  Wifi,
  WifiOff,
  RefreshCw,
  Info
} from "lucide-react";
import { useDocumentTitle } from "../../../hooks/useDocumentTitle";

const TOKEN_KEY = "skillssphere.auth.token";
const REQUEST_TIMEOUT_MS = 20000;
const MAX_RETRY_ATTEMPTS = 3;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const isRecoverableError = (error) => {
  const status = Number(error?.status || 0);
  return (
    error?.name === "AbortError" ||
    error?.message === "Request timeout" ||
    status === 0 ||
    status >= 500
  );
};

const withTimeout = async (operation, timeoutMs = REQUEST_TIMEOUT_MS) => {
  let timeoutId;
  try {
    return await Promise.race([
      operation(),
      new Promise((_, reject) => {
        timeoutId = window.setTimeout(() => {
          const error = new Error("Request timeout");
          error.status = 0;
          reject(error);
        }, timeoutMs);
      }),
    ]);
  } finally {
    window.clearTimeout(timeoutId);
  }
};

const retryRecoverable = async (operation, onRetry) => {
  let lastError;

  for (let attempt = 1; attempt <= MAX_RETRY_ATTEMPTS; attempt += 1) {
    try {
      return await withTimeout(operation);
    } catch (error) {
      lastError = error;
      if (!isRecoverableError(error) || attempt === MAX_RETRY_ATTEMPTS) {
        throw error;
      }

      const delay = 500 * 2 ** (attempt - 1);
      onRetry?.(attempt + 1, delay);
      await sleep(delay);
    }
  }

  throw lastError;
};

const InterviewSession = () => {
  useDocumentTitle("Interview Session");
  const { id: sessionId } = useParams();
  const navigate = useNavigate();
  const textareaRef = useRef(null);
  const { user } = useSelector((state) => state.auth);

  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [answer, setAnswer] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [error, setError] = useState(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [lastScores, setLastScores] = useState(null);
  const [showScores, setShowScores] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [isLastQuestion, setIsLastQuestion] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [requestStatus, setRequestStatus] = useState(null);
  const [uploadStatus, setUploadStatus] = useState("idle");
  const [mediaWarning, setMediaWarning] = useState(null);

  const debouncedAnalyze = useRef(
    debounce((text) => {
      setAnalysis(analyzeText(text));
    }, 500)
  ).current;

  const messageQueue = useRef([]);
  const wasConnected = useRef(false);
  const [recoveryMessage, setRecoveryMessage] = useState(null);

  // Socket & Multi-role state
  const [socket, setSocket] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [liveTyping, setLiveTyping] = useState("");
  const [socketStatus, setSocketStatus] = useState("connecting");
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef(null);
  const mediaStreamRef = useRef(null);
  const mediaTrackCleanupRef = useRef([]);
  const failedActionRef = useRef(null);

  const isObserver = user && session && user._id !== session.userId;

  const persistBackup = useCallback(
    (overrides = {}) => {
      if (!sessionId) return;

      const transcriptMap = session?.answers?.reduce((acc, item, index) => {
        if (item?.transcript) {
          acc[index] = item.transcript;
        }
        return acc;
      }, {}) || {};

      saveInterviewSession({
        sessionId,
        currentIndex,
        answer,
        transcripts: transcriptMap,
        messages: answer
          ? [{ role: "candidate", content: answer, timestamp: Date.now() }]
          : [],
        elapsedTime,
        uploadStatus,
        currentQuestion,
        ...overrides,
      });
    },
    [
      answer,
      currentIndex,
      currentQuestion,
      elapsedTime,
      session,
      sessionId,
      uploadStatus,
    ],
  );

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
    [clearMediaTrackListeners, persistBackup],
  );

  // Timer
  useEffect(() => {
    const timer = setInterval(() => {
      setElapsedTime((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (session && !isObserver) {
      persistBackup();
    }
  }, [session, isObserver, persistBackup]);

  // Fetch session on mount
  useEffect(() => {
    const fetchSession = async () => {
      try {
        const token =
          localStorage.getItem(TOKEN_KEY) || sessionStorage.getItem(TOKEN_KEY);
        setRequestStatus("Loading interview session...");
        const res = await retryRecoverable(
          () =>
            apiRequest(`/api/interviews/${sessionId}`, {
              method: "GET",
              token,
            }),
          (attempt) => setRequestStatus(`Retrying session load (${attempt}/${MAX_RETRY_ATTEMPTS})...`),
        );
        const data = res.data;
        setSession(data);

        let idx = 0;
        const savedSession = loadInterviewSession();
        if (savedSession && savedSession.sessionId === sessionId) {
           idx = Math.min(savedSession.currentIndex, data.answers.length - 1);
           setElapsedTime(savedSession.elapsedTime || 0);
           setUploadStatus(savedSession.uploadStatus || "idle");
           setAnswer(savedSession.answer || savedSession.messages?.at(-1)?.content || "");
           setRecoveryMessage("Recovered saved interview progress.");
           setTimeout(() => setRecoveryMessage(null), 3000);
        } else {
          const unansweredIdx = data.answers.findIndex(
            (a) => !a.transcript && !a.scores,
          );
          idx = unansweredIdx >= 0 ? unansweredIdx : 0;
        }

        setCurrentIndex(idx);
        setCurrentQuestion({
          questionText: data.answers[idx]?.questionText,
          questionId: data.answers[idx]?.questionId,
        });
        setIsLastQuestion(idx === data.answers.length - 1);
        
        saveInterviewSession({
          sessionId,
          currentIndex: idx,
          answer: savedSession?.answer || "",
          elapsedTime: savedSession?.elapsedTime || 0,
          uploadStatus: savedSession?.uploadStatus || "idle",
          currentQuestion: {
            questionText: data.answers[idx]?.questionText,
            questionId: data.answers[idx]?.questionId,
          },
          messages: savedSession?.messages || [],
        });
      } catch (err) {
        setError(
          err.message === "Request timeout"
            ? "The interview session request timed out. Please check your connection and try again."
            : "Failed to load interview session.",
        );
        logger.error("[InterviewSession] Error:", err);
      } finally {
        setRequestStatus(null);
        setLoading(false);
      }
    };
    fetchSession();
  }, [sessionId]);

  // Socket Connection
  useEffect(() => {
    if (!session || !user) return;
    const token = localStorage.getItem(TOKEN_KEY) || sessionStorage.getItem(TOKEN_KEY);
    
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
      handleEvaluationResult(data);
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
      failedActionRef.current = "submit";
      logger.error("[InterviewSession] Socket evaluation error:", err);
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
      if (mediaRecorderRef.current) {
        if (mediaRecorderRef.current.state !== "inactive") {
          mediaRecorderRef.current.stop();
        }
        if (mediaRecorderRef.current.stream) {
          mediaRecorderRef.current.stream.getTracks().forEach((track) => track.stop());
        }
      }
      clearMediaTrackListeners();
      if (newSocket && newSocket.connected) {
        newSocket.emit("end-audio-stream", { sessionId });
      }
      newSocket.close();
    };
  }, [clearMediaTrackListeners, persistBackup, session, user, sessionId]);

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const handleEvaluationResult = (data) => {
    setLastScores(data.scores);
    setShowScores(true);
    setAnswer("");
    setSubmitting(false);
    setRequestStatus(null);
    setUploadStatus("idle");
    failedActionRef.current = null;

    if (data.isLastQuestion) {
      setIsLastQuestion(true);
    } else if (data.nextQuestion) {
      setTimeout(() => {
        setCurrentQuestion(data.nextQuestion);
        setCurrentIndex(data.nextQuestion.index);
        setShowScores(false);
        setLastScores(null);
        if (textareaRef.current) textareaRef.current.focus();
      }, 3000);
    }
  };

  const handleSubmitAnswer = async () => {
    if (!answer.trim() || submitting || requestStatus) return;
    const transcript = answer.trim();
    setSubmitting(true);
    setError(null);
    setRequestStatus(null);
    setUploadStatus("submitting");
    persistBackup({
      answer: transcript,
      uploadStatus: "submitting",
      messages: [{ role: "candidate", content: transcript, timestamp: Date.now() }],
    });

    if (socket && socketStatus === "connected") {
      socket.emit("submit-answer", { sessionId, transcript, audioBuffer: null });
    } else if (socket && (socketStatus === "disconnected" || socketStatus === "reconnecting")) {
      messageQueue.current.push({ sessionId, transcript, audioBuffer: null });
      setUploadStatus("queued");
      setRecoveryMessage("Offline: answer queued and saved locally.");
      setTimeout(() => setRecoveryMessage(null), 3000);
      setSubmitting(false);
      return;
    } else {
      try {
        const res = await retryRecoverable(
          () => submitAnswer(sessionId, transcript),
          (attempt) => setRequestStatus(`Retrying answer submission (${attempt}/${MAX_RETRY_ATTEMPTS})...`),
        );
        handleEvaluationResult(res.data);
      } catch (err) {
        failedActionRef.current = "submit";
        setUploadStatus("failed");
        setError(
          err.message === "Request timeout"
            ? "Answer submission timed out. Your answer is saved and can be retried."
            : err.message || "Failed to submit answer. Your answer is saved and can be retried.",
        );
        logger.error("[InterviewSession] Submit error:", err);
        setSubmitting(false);
        setRequestStatus(null);
      }
    }
  };

  const handleComplete = async () => {
    if (completing || requestStatus) return;
    setCompleting(true);
    setError(null);

    try {
      await retryRecoverable(
        () => completeInterview(sessionId),
        (attempt) => setRequestStatus(`Retrying final submission (${attempt}/${MAX_RETRY_ATTEMPTS})...`),
      );
      clearInterviewSession();
      navigate(`/mock-interview/${sessionId}/results`, { replace: true });
    } catch (err) {
      failedActionRef.current = "complete";
      setError(
        err.message === "Request timeout"
          ? "Saving results timed out. Please retry when your connection is stable."
          : err.message || "Failed to complete interview.",
      );
      logger.error("[InterviewSession] Complete error:", err);
    } finally {
      setCompleting(false);
      setRequestStatus(null);
    }
  };

  const handleManualRetry = () => {
    if (failedActionRef.current === "submit") {
      handleSubmitAnswer();
    } else if (failedActionRef.current === "complete") {
      handleComplete();
    } else if (failedActionRef.current === "media") {
      startRecording();
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && e.ctrlKey && !submitting) {
      handleSubmitAnswer();
    }
  };

  const handleAnswerChange = (e) => {
    const nextAnswer = e.target.value;
    setAnswer(nextAnswer);
    debouncedAnalyze(nextAnswer);
    
    persistBackup({
      answer: nextAnswer,
      messages: [{ role: "candidate", content: nextAnswer, timestamp: Date.now() }],
    });

    if (socket && !isObserver) {
      socket.emit("interview-typing", { sessionId, text: nextAnswer });
    }
  };

  const handleSendFeedback = (note) => {
    if (socket) {
      socket.emit("save-private-note", { sessionId, note });
    }
  };

  const startRecording = async () => {
    try {
      setMediaWarning(null);
      setError(null);
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
          failedActionRef.current = "media";
          setError("Audio upload failed. Your typed answer is still saved.");
          logger.error("[InterviewSession] Audio chunk error:", err);
        }
      };

      mediaRecorder.onerror = (event) => {
        setUploadStatus("failed");
        failedActionRef.current = "media";
        setError("Recording failed. Your answer is saved, and you can retry recording.");
        logger.error("[InterviewSession] Media recorder error:", event.error || event);
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
      failedActionRef.current = "media";
      setMediaWarning("Microphone access was denied or unavailable. Check your device and retry.");
      setError("Microphone access denied or unavailable.");
      persistBackup({ uploadStatus: "failed" });
    }
  };

  const stopRecording = () => {
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
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-[#020617] pt-24">
        <Navbar />
        <InterviewSessionSkeleton />
      </div>
    );
  }

  if (error && !session) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-[#020617] flex flex-col pt-24">
        <Navbar />
        <div className="flex-1 flex flex-col items-center justify-center p-8">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 p-10 rounded-3xl flex flex-col items-center max-w-md text-center shadow-xl">
            <AlertCircle size={56} className="text-red-500 mb-6" />
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Session Error</h2>
            <p className="text-slate-600 dark:text-slate-400 mb-8">{error}</p>
            <button
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3.5 rounded-xl font-bold transition-all shadow-lg hover:shadow-blue-500/25"
              onClick={() => navigate("/mock-interview")}
            >
              Return to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  const totalQuestions = session?.totalQuestions || session?.answers?.length || 0;
  const progressPercent = totalQuestions
    ? ((currentIndex + 1) / totalQuestions) * 100
    : 0;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#020617] flex flex-col font-sans transition-colors duration-300 pt-24">
      <Navbar />

      <main className="flex-1 w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pb-12 mt-24 sm:mt-28 flex flex-col lg:flex-row gap-8 items-start">
        
        {/* LEFT COLUMN: Telemetry & Status */}
        <div className="w-full lg:w-1/3 flex flex-col gap-6">
          <div className="flex justify-start">
            <button
              onClick={() => {
                if (window.confirm("Are you sure you want to exit? Your progress may be lost.")) {
                  navigate("/dashboard");
                }
              }}
              className="inline-flex items-center gap-2 text-sm text-red-500 hover:text-red-400 transition-colors"
            >
              <AlertCircle size={16} />
              Exit Session
            </button>
          </div>
          
          {/* Status Card */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-sm border border-slate-200 dark:border-white/10 flex flex-col gap-6">
            <div className="flex items-center gap-4 border-b border-slate-100 dark:border-white/5 pb-5">
              <div className="w-14 h-14 rounded-2xl bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center border border-blue-100 dark:border-blue-500/20">
                <Activity className="text-blue-600 dark:text-blue-400" size={28} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white capitalize">{session?.topic}</h3>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-400 mt-1 inline-block uppercase tracking-wider">
                  {session?.difficulty}
                </span>
              </div>
            </div>

            <div className="flex flex-col gap-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-500 dark:text-slate-400 font-medium">Session Time</span>
                <div className="flex items-center gap-2 font-mono text-lg font-bold text-slate-900 dark:text-white">
                  <Clock size={16} className="text-slate-400" />
                  {formatTime(elapsedTime)}
                </div>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-500 dark:text-slate-400 font-medium">Connection</span>
                <div className="flex items-center gap-2">
                  {socketStatus === "connected" ? <Wifi size={16} className="text-emerald-500" /> : <WifiOff size={16} className="text-red-500" />}
                  <span className={`text-sm font-bold capitalize ${socketStatus === "connected" ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
                    {socketStatus}
                  </span>
                </div>
              </div>
              {recoveryMessage && (
                <div className="text-xs text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-500/10 p-2 rounded-lg flex items-center gap-2" role="status">
                  <RefreshCw size={14} className={socketStatus === "connected" ? "" : "animate-spin"} /> {recoveryMessage}
                </div>
              )}
              {requestStatus && (
                <div className="text-xs text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-500/10 p-2 rounded-lg flex items-center gap-2" role="status">
                  <Loader2 size={14} className="animate-spin" /> {requestStatus}
                </div>
              )}
              {mediaWarning && (
                <div className="text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10 p-2 rounded-lg flex items-center gap-2" role="alert">
                  <MicOff size={14} /> {mediaWarning}
                </div>
              )}
              {uploadStatus !== "idle" && (
                <div className="text-xs text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-white/5 p-2 rounded-lg">
                  Audio status: <span className="font-bold capitalize">{uploadStatus}</span>
                </div>
              )}
            </div>
          </div>

          {/* Progress Card */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-sm border border-slate-200 dark:border-white/10 flex flex-col gap-4">
            <div className="flex justify-between items-end mb-2">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Interview Progress</h3>
              <span className="text-sm font-bold text-blue-600 dark:text-blue-400 font-mono">
                {currentIndex + 1} / {totalQuestions}
              </span>
            </div>
            <div className="h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden shadow-inner">
              <div
                className="h-full bg-blue-600 dark:bg-blue-500 rounded-full transition-all duration-500"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-1.5">
              <Info size={14} /> Answer all questions to see final analytics.
            </p>
          </div>

        </div>

        {/* RIGHT COLUMN: Interaction Zone */}
        <div className="flex-1 w-full flex flex-col gap-6">
          
          {/* Question Card */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 sm:p-10 shadow-sm border border-slate-200 dark:border-white/10 flex flex-col">
            <div className="inline-flex self-start items-center gap-2 px-3 py-1 rounded-lg bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 text-xs font-bold tracking-wide uppercase mb-6">
              Question {currentIndex + 1}
            </div>
            <h2 className="text-2xl sm:text-3xl font-semibold leading-relaxed text-slate-900 dark:text-white tracking-tight">
              {currentQuestion?.questionText || "Loading question..."}
            </h2>
          </div>

          {!showScores && !isObserver && (
            <div className="w-full">
              <RealtimeSentimentIndicator analysis={analysis} />
            </div>
          )}

          {/* Score Flash */}
          {showScores && lastScores && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 animate-[fadeInUp_0.4s_ease-out]">
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-3xl p-6 flex flex-col items-center text-center shadow-sm hover:border-blue-500/30 transition-colors">
                <Brain size={24} className="text-blue-500 mb-3" />
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Technical</span>
                <strong className="text-3xl font-black text-slate-900 dark:text-white">{lastScores.technical}%</strong>
              </div>
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-3xl p-6 flex flex-col items-center text-center shadow-sm hover:border-emerald-500/30 transition-colors">
                <MessageSquare size={24} className="text-emerald-500 mb-3" />
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Communication</span>
                <strong className="text-3xl font-black text-slate-900 dark:text-white">{lastScores.communication}%</strong>
              </div>
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-3xl p-6 flex flex-col items-center text-center shadow-sm hover:border-amber-500/30 transition-colors">
                <Target size={24} className="text-amber-500 mb-3" />
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Relevance</span>
                <strong className="text-3xl font-black text-slate-900 dark:text-white">{lastScores.relevance}%</strong>
              </div>
            </div>
          )}

          {/* Answer Input */}
          {!showScores && (
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-200 dark:border-white/10 flex flex-col">
              
              {isObserver ? (
                <div className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 h-56 overflow-y-auto">
                  <span className="text-xs font-bold uppercase tracking-widest text-emerald-600 dark:text-emerald-500 mb-4 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span> Candidate Typing
                  </span>
                  <p className="text-base text-slate-700 dark:text-slate-300 font-mono leading-relaxed whitespace-pre-wrap">
                    {liveTyping || <span className="text-slate-400 italic">Waiting for input...</span>}
                  </p>
                </div>
              ) : (
                <textarea
                  ref={textareaRef}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-white/5 rounded-2xl p-6 text-slate-900 dark:text-slate-100 text-lg leading-relaxed resize-y min-h-[180px] focus:outline-none focus:border-blue-500 dark:focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 placeholder:text-slate-400 dark:placeholder:text-slate-600 transition-all shadow-inner"
                  placeholder="Type your answer here... (Ctrl+Enter to submit)"
                  value={answer}
                  onChange={handleAnswerChange}
                  onKeyDown={handleKeyDown}
                  disabled={submitting}
                  rows={5}
                />
              )}
              
              <div className="flex flex-col sm:flex-row items-center justify-between mt-6 gap-4">
                
                <div className="flex items-center gap-4 w-full sm:w-auto">
                  <span className="text-sm font-semibold text-slate-500 dark:text-slate-400">
                    {isObserver ? liveTyping.trim().split(/\s+/).filter(Boolean).length : answer.trim().split(/\s+/).filter(Boolean).length} words
                  </span>
                  {error && (
                    <span className="text-sm font-semibold text-red-500 flex flex-wrap items-center gap-1.5 bg-red-50 dark:bg-red-500/10 px-3 py-1 rounded-lg">
                      <AlertCircle size={16} /> {error}
                      {failedActionRef.current && (
                        <button
                          type="button"
                          onClick={handleManualRetry}
                          disabled={submitting || completing || Boolean(requestStatus)}
                          className="ml-2 underline underline-offset-2 disabled:opacity-50"
                        >
                          Retry
                        </button>
                      )}
                    </span>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
                  {!isObserver && (
                    <button
                      className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl font-bold transition-all ${
                        isRecording 
                          ? "bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-500/30 animate-[pulse_1.5s_ease-in-out_infinite]" 
                          : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-white/5"
                      }`}
                      onClick={isRecording ? stopRecording : startRecording}
                      disabled={submitting || Boolean(requestStatus)}
                    >
                      {isRecording ? <><MicOff size={18} /> Stop</> : <><Mic size={18} /> Record</>}
                    </button>
                  )}

                  {!isObserver && (
                    <button
                      className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-blue-500/25 hover:-translate-y-0.5"
                      onClick={handleSubmitAnswer}
                      disabled={!answer.trim() || submitting || Boolean(requestStatus)}
                    >
                      {submitting ? (
                        <><Loader2 className="animate-spin" size={18} /> Evaluating</>
                      ) : (
                        <><Send size={18} /> Submit</>
                      )}
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Completion State */}
          {showScores && isLastQuestion && (
            <div className="mt-4 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 rounded-3xl p-8 flex flex-col items-center gap-6 text-center shadow-sm">
              <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-500/20 flex items-center justify-center">
                <CheckCircle size={32} className="text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Interview Complete!</h3>
                <p className="text-slate-600 dark:text-slate-400">All questions have been evaluated successfully.</p>
              </div>
              <button
                className="w-full sm:w-auto bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-100 border-none py-3.5 px-8 rounded-xl font-bold cursor-pointer flex justify-center items-center gap-2 transition-all shadow-lg hover:-translate-y-0.5 disabled:opacity-50"
                onClick={handleComplete}
                disabled={completing || Boolean(requestStatus)}
              >
                {completing ? (
                  <><Loader2 className="animate-spin" size={18} /> Saving Results...</>
                ) : (
                  <><Trophy size={18} /> View Detailed Analytics</>
                )}
              </button>
              {error && (
                <span className="text-sm font-semibold text-red-500 flex items-center justify-center gap-1.5 bg-red-50 dark:bg-red-500/10 px-3 py-2 rounded-lg mt-2">
                  <AlertCircle size={16} /> {error}
                  {failedActionRef.current && (
                    <button
                      type="button"
                      onClick={handleManualRetry}
                      disabled={submitting || completing || Boolean(requestStatus)}
                      className="ml-2 underline underline-offset-2 disabled:opacity-50"
                    >
                      Retry
                    </button>
                  )}
                </span>
              )}
            </div>
          )}

          {showScores && !isLastQuestion && (
            <div className="mt-4 p-4 flex items-center justify-center gap-3 text-slate-500 dark:text-slate-400 font-medium">
              <Loader2 className="animate-spin text-blue-500" size={18} />
              Loading next question...
            </div>
          )}
        </div>
      </main>

      {/* Observer Panel */}
      {isObserver && (
        <ObserverPanel 
          participants={participants} 
          onSendFeedback={handleSendFeedback} 
          isConductor={true} 
        />
      )}
          <Footer />
    </div>
  );
};

export default InterviewSession;
