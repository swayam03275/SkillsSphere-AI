import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { submitAnswer, completeInterview } from "../services/interviewService";
import { apiRequest } from "../../../services/apiClient";
import {
  saveInterviewSession,
  loadInterviewSession,
  clearInterviewSession
} from "../../../utils/interviewSessionStorage";
import { analyzeText, debounce } from "../utils/sentiment";
import logger from "../../../utils/logger";

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

export const useInterviewState = (sessionId, isObserver) => {
  const navigate = useNavigate();
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [isLastQuestion, setIsLastQuestion] = useState(false);
  const [lastScores, setLastScores] = useState(null);
  const [showScores, setShowScores] = useState(false);
  const [answer, setAnswer] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [analysis, setAnalysis] = useState(null);
  const [requestStatus, setRequestStatus] = useState(null);
  const [uploadStatus, setUploadStatus] = useState("idle");
  const [mediaWarning, setMediaWarning] = useState(null);
  const [recoveryMessage, setRecoveryMessage] = useState(null);
  const [failedAction, setFailedAction] = useState(null);

  const debouncedAnalyze = useRef(
    debounce((text) => {
      setAnalysis(analyzeText(text));
    }, 500)
  ).current;

  // Persist backup to LocalStorage
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

  // Timer progression
  useEffect(() => {
    const timer = setInterval(() => {
      setElapsedTime((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Sync state with localStorage backup
  useEffect(() => {
    if (session && !isObserver) {
      persistBackup();
    }
  }, [session, isObserver, persistBackup]);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  // Load session from API or localStorage rehydration
  useEffect(() => {
    if (!sessionId) return;

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
        logger.error("[InterviewSessionState] Fetch Error:", err);
      } finally {
        setRequestStatus(null);
        setLoading(false);
      }
    };
    fetchSession();
  }, [sessionId]);

  const handleEvaluationResult = useCallback((data, textareaRef) => {
    setLastScores(data.scores);
    setShowScores(true);
    setAnswer("");
    setSubmitting(false);
    setRequestStatus(null);
    setUploadStatus("idle");
    setFailedAction(null);

    if (data.isLastQuestion) {
      setIsLastQuestion(true);
    } else if (data.nextQuestion) {
      setTimeout(() => {
        setCurrentQuestion(data.nextQuestion);
        setCurrentIndex(data.nextQuestion.index);
        setShowScores(false);
        setLastScores(null);
        if (textareaRef?.current) textareaRef.current.focus();
      }, 3000);
    }
  }, []);

  const handleAnswerChange = (e, socket) => {
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

  const submitAnswerApi = async (textareaRef) => {
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

    try {
      const res = await retryRecoverable(
        () => submitAnswer(sessionId, transcript),
        (attempt) => setRequestStatus(`Retrying answer submission (${attempt}/${MAX_RETRY_ATTEMPTS})...`),
      );
      handleEvaluationResult(res.data, textareaRef);
    } catch (err) {
      setUploadStatus("failed");
      setFailedAction("submit");
      setError(
        err.message === "Request timeout"
          ? "Answer submission timed out. Your answer is saved and can be retried."
          : err.message || "Failed to submit answer. Your answer is saved and can be retried.",
      );
      logger.error("[InterviewSessionState] Submit error:", err);
      setSubmitting(false);
      setRequestStatus(null);
      throw err; // throw so socket handler caller knows
    }
  };

  const completeInterviewApi = async () => {
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
      setFailedAction("complete");
      setError(
        err.message === "Request timeout"
          ? "Saving results timed out. Please retry when your connection is stable."
          : err.message || "Failed to complete interview.",
      );
      logger.error("[InterviewSessionState] Complete error:", err);
      setCompleting(false);
      setRequestStatus(null);
      throw err;
    }
  };

  return {
    session,
    setSession,
    loading,
    error,
    setError,
    currentIndex,
    setCurrentIndex,
    elapsedTime,
    setElapsedTime,
    currentQuestion,
    setCurrentQuestion,
    isLastQuestion,
    setIsLastQuestion,
    lastScores,
    setLastScores,
    showScores,
    setShowScores,
    answer,
    setAnswer,
    submitting,
    setSubmitting,
    completing,
    setCompleting,
    analysis,
    requestStatus,
    setRequestStatus,
    uploadStatus,
    setUploadStatus,
    mediaWarning,
    setMediaWarning,
    recoveryMessage,
    setRecoveryMessage,
    persistBackup,
    handleAnswerChange,
    submitAnswerApi,
    completeInterviewApi,
    handleEvaluationResult,
    failedAction,
    setFailedAction,
    formatTime,
  };
};
