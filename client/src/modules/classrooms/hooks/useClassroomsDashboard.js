import { useState, useEffect } from "react";
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

  useEffect(() => {
    if (token) {
      if (isTutor) {
        fetchMySessions();
      } else {
        fetchActiveSessions();
      }
    }
  }, [isTutor, token]);

  const fetchMySessions = async () => {
    try {
      setIsListLoading(true);
      setError(null);
      const res = await getTutorClassroomSessions(token);
      if (res.success && res.data) {
        setSessions(res.data);
      }
    } catch (err) {
      logger.error("Failed to load sessions", err);
      setError("Failed to load your classroom sessions. Please try again.");
    } finally {
      setIsListLoading(false);
    }
  };

  const fetchActiveSessions = async () => {
    try {
      setIsListLoading(true);
      setError(null);
      const res = await getActiveClassroomSessions(token);
      if (res.success && res.data) {
        setSessions(res.data);
      }
    } catch (err) {
      logger.error("Failed to load active sessions", err);
      setError("Failed to load active classrooms. Please try again.");
    } finally {
      setIsListLoading(false);
    }
  };

  const handleStartSession = async (e) => {
    e.preventDefault();
    if (!title.trim()) return;

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
      setError(err.message || "Failed to create live classroom session.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleEndSession = async (roomId) => {
    if (!window.confirm("Are you sure you want to end this live session? All participants will be disconnected.")) {
      return;
    }

    try {
      setError(null);
      const res = await endClassroomSession(roomId, token);
      if (res.success) {
        fetchMySessions();
      }
    } catch (err) {
      logger.error("Failed to end session", err);
      setError(err.message || "Failed to end the session.");
    }
  };

  const handleJoinSession = (e) => {
    e.preventDefault();
    if (joinRoomId.trim()) {
      navigate(`/classrooms/${joinRoomId.trim()}`);
    }
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
    handleStartSession,
    handleEndSession,
    handleJoinSession,
  };
};
