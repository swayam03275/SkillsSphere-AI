import asyncHandler from "../../utils/asyncHandler.js";
import * as classroomService from "./service.js";

/**
 * @desc    Create a new live classroom session
 * @route   POST /api/classrooms/create
 * @access  Private (Tutors only)
 */
export const createClassroomSession = asyncHandler(async (req, res, next) => {
  const { title, subject, maxParticipants } = req.body;
  const session = await classroomService.createSession(req.user._id, {
    title,
    subject,
    maxParticipants,
  });

  res.status(201).json({
    success: true,
    message: "Classroom session created successfully",
    data: session,
  });
});

/**
 * @desc    Get all classroom sessions created by the logged-in tutor
 * @route   GET /api/classrooms/my-sessions
 * @access  Private (Tutors only)
 */
export const getTutorClassroomSessions = asyncHandler(async (req, res, next) => {
  const sessions = await classroomService.getTutorSessions(req.user._id);

  res.status(200).json({
    success: true,
    data: sessions,
  });
});

/**
 * @desc    Get classroom session metadata by room ID
 * @route   GET /api/classrooms/:roomId
 * @access  Private (Students and Tutors)
 */
export const getClassroomSessionByRoomId = asyncHandler(async (req, res, next) => {
  const { roomId } = req.params;
  const session = await classroomService.getSessionByRoomId(roomId);

  res.status(200).json({
    success: true,
    data: session,
  });
});

/**
 * @desc    End a live classroom session
 * @route   PATCH /api/classrooms/:roomId/end
 * @access  Private (Tutor host only)
 */
export const endClassroomSession = asyncHandler(async (req, res, next) => {
  const { roomId } = req.params;
  const session = await classroomService.endSession(roomId, req.user._id);

  res.status(200).json({
    success: true,
    message: "Classroom session ended successfully",
    data: session,
  });
});
