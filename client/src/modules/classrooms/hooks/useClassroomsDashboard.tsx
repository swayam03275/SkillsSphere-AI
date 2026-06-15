// @ts-nocheck

import { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  fetchTutorSessions,
  fetchActiveSessions as fetchActiveSessionsThunk,
  createSession,
  endSession,
  clearClassroomsError,
} from "../../../features/classrooms/classroomsSlice";
import logger from "../../../utils/logger";

export const useClassroomsDashboard = (token, isTutor, navigate) => {
  const dispatch = useDispatch();
  
  // Local form state
  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState("");
  const [maxParticipants, setMaxParticipants] = useState(30);
  const [joinRoomId, setJoinRoomId] = useState("");
  
  // Global Redux state
  const { sessions, isLoading, isListLoading, error } = useSelector((state) => state.classrooms);

  useEffect(() => {
    if (token) {
      if (isTutor) {
        fetchMySessions();
      } else {
        fetchActiveSessions();
      }
    }
  }, [isTutor, token, dispatch]);

  const fetchMySessions = () => {
    dispatch(fetchTutorSessions(token));
  };

  const fetchActiveSessions = () => {
    dispatch(fetchActiveSessionsThunk(token));
  };

  const handleStartSession = async (e) => {
    e.preventDefault();
    if (!title.trim()) return;

    try {
      const res = await dispatch(
        createSession({
          sessionData: {
            title: title.trim(),
            subject: subject.trim(),
            maxParticipants: Number(maxParticipants),
          },
          token,
        })
      ).unwrap();

      if (res?.roomId) {
        navigate(`/classrooms/${res.roomId}`);
      }
    } catch (err) {
      logger.error("Failed to create room", err);
    }
  };

  const handleEndSession = async (roomId) => {
    if (!window.confirm("Are you sure you want to end this live session? All participants will be disconnected.")) {
      return;
    }

    try {
      await dispatch(endSession({ roomId, token })).unwrap();
      // Optionally re-fetch after ending, or rely on Redux reducer to filter it out
      if (isTutor) {
        fetchMySessions();
      } else {
        fetchActiveSessions();
      }
    } catch (err) {
      logger.error("Failed to end session", err);
    }
  };

  const handleJoinSession = (e) => {
    e.preventDefault();
    if (joinRoomId.trim()) {
      navigate(`/classrooms/${joinRoomId.trim()}`);
    }
  };

  const setCustomError = (errMessage) => {
    // We can simulate setError by creating a reducer action if we need to set local errors
    // but typically we should clear it if errMessage is null
    if (!errMessage) {
      dispatch(clearClassroomsError());
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
    setError: setCustomError,
    fetchMySessions,
    fetchActiveSessions,
    handleStartSession,
    handleEndSession,
    handleJoinSession,
  };
};
