import { useState, useEffect, useRef, useCallback } from "react";
import {
  createClassroomSession,
  getTutorClassroomSessions,
  endClassroomSession,
  getActiveClassroomSessions,
} from "../services/classroomService";
import logger from "../../../utils/logger";

export const useClassroomsDashboard = (token, isTutor, navigate) => {
  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState("");
  const [maxParticipants, setMaxParticipants] = useState(30);
  const [joinRoomId, setJoinRoomId] = useState("");

  const [sessions, setSessions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isListLoading, setIsListLoading] = useState(false);
  const [error, setError] = useState(null);

  // Request consistency tracking
  const latestRequestRef = useRef(0);
  const isMountedRef = useRef(true);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const reconcileSessions = (incomingSessions = []) => {
    const uniqueSessions = new Map();

    incomingSessions.forEach((session) => {
      if (session?.roomId) {
        uniqueSessions.set(session.roomId, session);
      }
    });

    return [...uniqueSessions.values()];
  };

  const safeSetSessions = (data) => {
    if (!isMountedRef.current) return;
    setSessions(reconcileSessions(data));
  };

  const safeSetError = (message) => {
    if (!isMountedRef.current) return;
    setError(message);
  };

  const fetchMySessions = useCallback(async () => {
    const requestId = ++latestRequestRef.current;

    try {
      if (isMountedRef.current) {
        setIsListLoading(true);
        setError(null);
      }

      const res = await getTutorClassroomSessions(token);

      if (
        requestId !== latestRequestRef.current ||
        !isMountedRef.current
      ) {
        return;
      }

      if (res.success && res.data) {
        safeSetSessions(res.data);
      }
    } catch (err) {
      if (
        requestId !== latestRequestRef.current ||
        !isMountedRef.current
      ) {
        return;
      }

      logger.error("Failed to load sessions", err);
      safeSetError(
        "Failed to load your classroom sessions. Please try again."
      );
    } finally {
      if (
        requestId === latestRequestRef.current &&
        isMountedRef.current
      ) {
        setIsListLoading(false);
      }
    }
  }, [token]);

  const fetchActiveSessions = useCallback(async () => {
    const requestId = ++latestRequestRef.current;

    try {
      if (isMountedRef.current) {
        setIsListLoading(true);
        setError(null);
      }

      const res = await getActiveClassroomSessions(token);

      if (
        requestId !== latestRequestRef.current ||
        !isMountedRef.current
      ) {
        return;
      }

      if (res.success && res.data) {
        safeSetSessions(res.data);
      }
    } catch (err) {
      if (
        requestId !== latestRequestRef.current ||
        !isMountedRef.current
      ) {
        return;
      }

      logger.error("Failed to load active sessions", err);
      safeSetError(
        "Failed to load active classrooms. Please try again."
      );
    } finally {
      if (
        requestId === latestRequestRef.current &&
        isMountedRef.current
      ) {
        setIsListLoading(false);
      }
    }
  }, [token]);

  const refreshSessions = useCallback(() => {
    if (isTutor) {
      return fetchMySessions();
    }

    return fetchActiveSessions();
  }, [isTutor, fetchMySessions, fetchActiveSessions]);

  useEffect(() => {
    if (!token) return;

    refreshSessions();
  }, [token, refreshSessions]);

  const handleStartSession = async (e) => {
    e.preventDefault();

    if (!title.trim()) {
      safeSetError("Session title is required.");
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const res = await createClassroomSession(
        {
          title: title.trim(),
          subject: subject.trim(),
          maxParticipants: Number(maxParticipants),
        },
        token
      );

      if (res.success && res.data?.roomId) {
        navigate(`/classrooms/${res.data.roomId}`);
      }
    } catch (err) {
      logger.error("Failed to create room", err);
      safeSetError(
        err.message || "Failed to create live classroom session."
      );
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
      }
    }
  };

  const handleEndSession = async (roomId) => {
    if (
      !window.confirm(
        "Are you sure you want to end this live session? All participants will be disconnected."
      )
    ) {
      return;
    }

    const previousSessions = [...sessions];

    // Optimistic update
    setSessions((prev) =>
      prev.filter((session) => session.roomId !== roomId)
    );

    try {
      setError(null);

      const res = await endClassroomSession(roomId, token);

      if (res.success) {
        await refreshSessions();
      } else {
        setSessions(previousSessions);
      }
    } catch (err) {
      logger.error("Failed to end session", err);

      // Rollback on failure
      setSessions(previousSessions);

      safeSetError(
        err.message || "Failed to end the session."
      );
    }
  };

  const handleJoinSession = (e) => {
    e.preventDefault();

    const trimmedRoomId = joinRoomId.trim();

    if (!trimmedRoomId) {
      safeSetError("Please enter a valid room ID.");
      return;
    }

    navigate(`/classrooms/${trimmedRoomId}`);
  };

  return {
    title,
    setTitle,
    subject,
    setSubject,
    maxParticipants,
    setMaxParticipants,
    joinRoomId,
    setJoinRoomId,
    sessions,
    isLoading,
    isListLoading,
    error,
    setError,
    fetchMySessions,
    fetchActiveSessions,
    refreshSessions,
    handleStartSession,
    handleEndSession,
    handleJoinSession,
  };
};