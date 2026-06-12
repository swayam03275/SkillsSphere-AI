import LearningProgress from "../../database/models/LearningProgress.js";
import User from "../../database/models/User.js";
import RoadmapComment from "../../database/models/RoadmapComment.js";
import asyncHandler from "../../utils/asyncHandler.js";
import AppError from "../../utils/AppError.js";
import { getIO } from "../../utils/socketIO.js";
import { createNotification } from "../notifications/service.js";
import { generateDetailedRoadmap } from "../../utils/geminiService.js";

import logger from "../../utils/logger.js";

/**
 * Get the current user's learning progress and roadmap
 */
export const getMyProgress = asyncHandler(async (req, res) => {
  const progress = await LearningProgress.findOne({ user: req.user._id });
  
  if (!progress) {
    return res.status(200).json({
      success: true,
      data: null,
      message: "No active roadmap found. Please generate one from your analysis."
    });
  }

  res.status(200).json({
    success: true,
    data: progress
  });
});

/**
 * Generate or Update a roadmap based on analysis results
 */
export const syncRoadmap = asyncHandler(async (req, res) => {
  const { targetRole, topics } = req.body;

  if (!targetRole || !Array.isArray(topics)) {
    throw new AppError("Target role and topics are required", 400);
  }

  if (typeof targetRole !== "string" || targetRole.trim().length === 0 || targetRole.trim().length > 100) {
    throw new AppError("Target role must be between 1 and 100 characters", 400);
  }

  if (topics.length > 50) {
    throw new AppError("Roadmap topics exceed the maximum allowed limit of 50", 413);
  }

  for (const topic of topics) {
    const name = typeof topic === "string" ? topic : (topic?.text || topic?.topicName || "");
    if (!name || name.trim().length === 0) {
      throw new AppError("Each topic must have a non-empty name", 400);
    }
    if (name.trim().length > 200) {
      throw new AppError("Each topic name must not exceed 200 characters", 400);
    }
  }

  let progress = await LearningProgress.findOne({ user: req.user._id });

  // 1. Generate detailed roadmap via Gemini API
  let roadmapData;
  const aiResult = await generateDetailedRoadmap(targetRole, topics);
  
  if (aiResult.success && Array.isArray(aiResult.data)) {
    // Safely format AI output to match schema
    roadmapData = aiResult.data.map(topic => ({
      topicName: topic.topicName || "Unknown Topic",
      type: ["learning", "contribution"].includes(topic.type) ? topic.type : "learning",
      status: "not_started",
      resources: Array.isArray(topic.resources) ? topic.resources.map(res => ({
        title: res.title || "Study Resource",
        url: res.url || "https://google.com/search?q=" + encodeURIComponent(topic.topicName || "learning"),
        type: ["video", "article", "documentation"].includes(res.type) ? res.type : "article",
        tutorAssigned: false
      })) : []
    }));
  } else {
    // 2. Fallback: Basic string mapping if AI fails or times out
    logger.warn("AI Roadmap generation failed, falling back to basic mapping. Reason:", aiResult.error);
    roadmapData = topics.map(topic => {
      const topicName = typeof topic === "string" ? topic : topic.text;
      const type = typeof topic === "string" ? "learning" : topic.type;
      return {
        topicName,
        type: ["learning", "contribution"].includes(type) ? type : "learning",
        status: "not_started",
        resources: []
      };
    });
  }

  if (progress) {
    // If roadmap exists, we merge (don't overwrite completed topics)
    const existingTopics = new Map(progress.roadmap.map(t => [t.topicName, t]));
    
    progress.targetRole = targetRole;
    progress.roadmap = roadmapData.map(topic => {
      if (existingTopics.has(topic.topicName)) {
        // Keep existing topic status, but we can merge new resources if we wanted.
        // For simplicity, we just keep the old topic so we don't lose status/completion.
        return existingTopics.get(topic.topicName);
      }
      return topic;
    });
  } else {
    progress = new LearningProgress({
      user: req.user._id,
      targetRole,
      roadmap: roadmapData
    });
  }

  await progress.save();

  res.status(201).json({
    success: true,
    message: "Roadmap synced successfully",
    data: progress
  });
});

/**
 * Update the status of a specific topic in the roadmap
 */
export const updateTopicStatus = asyncHandler(async (req, res) => {
  const { topicId, status } = req.body;

  if (!["not_started", "in_progress", "completed"].includes(status)) {
    throw new AppError("Invalid status value", 400);
  }

  const progress = await LearningProgress.findOne({ user: req.user._id });

  if (!progress) {
    throw new AppError("No active roadmap found", 404);
  }

  const topic = progress.roadmap.id(topicId);
  if (!topic) {
    throw new AppError("Topic not found in roadmap", 404);
  }

  topic.status = status;
  if (status === "completed") {
    topic.completedAt = Date.now();
  }

  // --- Achievement Calculation Logic ---
  let newBadgesEarned = [];
  if (status === "completed") {
    const hasBadge = (badgeName) => progress.achievements?.some(a => a.badge === badgeName);
    
    // 1. First Milestone Completed
    const completedTopics = progress.roadmap.filter(t => t.status === "completed");
    if (completedTopics.length === 1 && !hasBadge("First Milestone Completed")) {
      progress.achievements.push({ badge: "First Milestone Completed" });
      newBadgesEarned.push("First Milestone Completed");
    }

    // 2. Open Source Explorer
    if (topic.type === "contribution" && !hasBadge("Open Source Explorer")) {
      progress.achievements.push({ badge: "Open Source Explorer" });
      newBadgesEarned.push("Open Source Explorer");
    }

    // 3. Roadmap Champion
    // overallProgress is calculated in a pre-save hook, but we can do a quick calc here
    const totalTopics = progress.roadmap.length;
    if (totalTopics > 0 && completedTopics.length === totalTopics && !hasBadge("Roadmap Champion")) {
      progress.achievements.push({ badge: "Roadmap Champion" });
      newBadgesEarned.push("Roadmap Champion");
    }
  }
  // -------------------------------------

  await progress.save();

  // Create system comment
  try {
    const systemComment = await RoadmapComment.create({
      roadmap: progress._id,
      milestoneId: topicId,
      sender: req.user._id,
      content: `Marked milestone as ${status.replace("_", " ")}`,
      type: "status_change",
    });
    const populated = await systemComment.populate("sender", "name email role");
    const io = getIO();
    if (io) {
      io.to(`roadmap_${progress._id}`).emit("new-roadmap-comment", populated);
    }
  } catch (error) {
    logger.error("Failed to save status change comment log:", error);
  }

  res.status(200).json({
    success: true,
    message: `Topic marked as ${status.replace("_", " ")}`,
    data: progress,
    newBadges: newBadgesEarned
  });
});

/**
 * Get all active student roadmaps (Tutors only)
 */
export const getStudentsRoadmaps = asyncHandler(async (req, res) => {
    const roadmaps = await LearningProgress.find({ tutorsTracking: req.user._id })
  .populate({ path: "user", match: { role: "student" }, select: "name email role" })
  .lean();
const studentRoadmaps = roadmaps.filter(r => r.user !== null);

  res.status(200).json({
    success: true,
    data: studentRoadmaps
  });
});

/**
 * Get a specific student's learning progress by student ID (Tutors only)
 */
export const getStudentRoadmap = asyncHandler(async (req, res) => {
  const { studentId } = req.params;

  const progress = await LearningProgress.findOne({ user: studentId })
    .populate("user", "name email role")
    .lean();

  if (!progress) {
    throw new AppError("No active roadmap found for this student", 404);
  }

  // Verify the tutor actually has this student
  if (!progress.tutorsTracking || !progress.tutorsTracking.some(id => id.toString() === req.user._id.toString())) {
    throw new AppError("You are not authorized to view this student's roadmap", 403);
  }

  res.status(200).json({
    success: true,
    data: progress
  });
});

/**
 * Assign a custom resource to a student's topic (Tutors only)
 */
export const assignTutorResource = asyncHandler(async (req, res) => {
  const { studentId, topicId, title, url, type } = req.body;

  if (!studentId || !topicId || !title || !url || !type) {
    throw new AppError("studentId, topicId, title, url, and type are required", 400);
  }

  if (title.trim().length === 0 || title.trim().length > 200) {
    throw new AppError("Resource title must be between 1 and 200 characters", 400);
  }

  const trimmedUrl = url.trim();
  if (trimmedUrl.length > 2048) {
    throw new AppError("Resource URL must not exceed 2048 characters", 400);
  }
  if (!/^https?:\/\//i.test(trimmedUrl)) {
    throw new AppError("Invalid URL: Must start with http:// or https://", 400);
  }

  if (!["video", "article", "documentation"].includes(type)) {
    throw new AppError("Invalid resource type", 400);
  }

  const progress = await LearningProgress.findOne({ user: studentId });
  if (!progress) {
    throw new AppError("Roadmap not found for this student", 404);
  }

  // Verify authorization
  if (!progress.tutorsTracking || !progress.tutorsTracking.some(id => id.toString() === req.user._id.toString())) {
    throw new AppError("You are not authorized to assign resources to this student", 403);
  }

  const topic = progress.roadmap.id(topicId);
  if (!topic) {
    throw new AppError("Topic not found in student's roadmap", 404);
  }

  // Prevent duplicate resource links on the same topic
  const urlTrimmed = url.trim().toLowerCase();
  const isDuplicate = topic.resources.some(
    (res) => res.url.trim().toLowerCase() === urlTrimmed
  );
  if (isDuplicate) {
    throw new AppError("This resource URL has already been assigned to this topic", 400);
  }

  // Push new resource with tutorAssigned: true
  topic.resources.push({
    title: title.trim(),
    url: url.trim(),
    type,
    tutorAssigned: true,
    assignedBy: req.user._id
  });

  await progress.save();

  // Create system comment log and send notification
  try {
    const systemComment = await RoadmapComment.create({
      roadmap: progress._id,
      milestoneId: topicId,
      sender: req.user._id,
      content: `Assigned resource: "${title.trim()}" (${type})`,
      type: "task_assigned",
    });
    const populated = await systemComment.populate("sender", "name email role");
    const io = getIO();
    if (io) {
      io.to(`roadmap_${progress._id}`).emit("new-roadmap-comment", populated);
      
      // Notify student
      const notif = await createNotification({
        userId: studentId,
        title: "New Resource Assigned",
        message: `Tutor ${req.user.name} assigned resource "${title.trim()}" to "${topic.topicName}"`,
        type: "system",
        metadata: { roadmapId: progress._id.toString(), milestoneId: topicId }
      });
      io.to(`user_${studentId}`).emit("new-notification", notif);
    }
  } catch (error) {
    logger.error("Failed to process resource assignment notification/log:", error);
  }

  res.status(200).json({
    success: true,
    message: "Resource assigned successfully by tutor",
    data: progress
  });
});

/**
 * Verify or unverify a student's milestone/topic (Tutors only)
 */
export const verifyTopic = asyncHandler(async (req, res) => {
  const { studentId, topicId, isVerified } = req.body;

  if (!studentId || !topicId || isVerified === undefined) {
    throw new AppError("studentId, topicId, and isVerified are required", 400);
  }

  const progress = await LearningProgress.findOne({ user: studentId });
  if (!progress) {
    throw new AppError("Roadmap not found for this student", 404);
  }

  // Verify authorization
  if (!progress.tutorsTracking || !progress.tutorsTracking.some(id => id.toString() === req.user._id.toString())) {
    throw new AppError("You are not authorized to verify topics for this student", 403);
  }

  const topic = progress.roadmap.id(topicId);
  if (!topic) {
    throw new AppError("Topic not found in student's roadmap", 404);
  }

  topic.isVerified = isVerified;
  if (isVerified) {
    topic.verifiedBy = req.user._id;
    topic.verifiedAt = new Date();
    // Toggling verified automatically completes the topic if it isn't completed already
    topic.status = "completed";
    topic.completedAt = new Date();
  } else {
    topic.verifiedBy = null;
    topic.verifiedAt = null;
  }

  // --- Achievement Calculation Logic ---
  let newBadgesEarned = [];
  if (isVerified) {
    const hasBadge = (badgeName) => progress.achievements?.some(a => a.badge === badgeName);
    
    // 1. First Milestone Completed
    const completedTopics = progress.roadmap.filter(t => t.status === "completed");
    if (completedTopics.length === 1 && !hasBadge("First Milestone Completed")) {
      progress.achievements.push({ badge: "First Milestone Completed" });
      newBadgesEarned.push("First Milestone Completed");
    }

    // 2. Open Source Explorer
    if (topic.type === "contribution" && !hasBadge("Open Source Explorer")) {
      progress.achievements.push({ badge: "Open Source Explorer" });
      newBadgesEarned.push("Open Source Explorer");
    }

    // 3. Roadmap Champion
    const totalTopics = progress.roadmap.length;
    if (totalTopics > 0 && completedTopics.length === totalTopics && !hasBadge("Roadmap Champion")) {
      progress.achievements.push({ badge: "Roadmap Champion" });
      newBadgesEarned.push("Roadmap Champion");
    }
  }
  // -------------------------------------

  await progress.save();

  // Create system comment log and send notification
  try {
    const systemComment = await RoadmapComment.create({
      roadmap: progress._id,
      milestoneId: topicId,
      sender: req.user._id,
      content: isVerified ? "Milestone verified by tutor" : "Milestone verification removed",
      type: "status_change",
    });
    const populated = await systemComment.populate("sender", "name email role");
    const io = getIO();
    if (io) {
      io.to(`roadmap_${progress._id}`).emit("new-roadmap-comment", populated);
      
      // Notify student
      const notif = await createNotification({
        userId: studentId,
        title: isVerified ? "Milestone Verified" : "Milestone Verification Removed",
        message: `Tutor ${req.user.name} ${isVerified ? "verified" : "removed verification for"} milestone "${topic.topicName}"`,
        type: "system",
        metadata: { roadmapId: progress._id.toString(), milestoneId: topicId }
      });
      io.to(`user_${studentId}`).emit("new-notification", notif);
    }
  } catch (error) {
    logger.error("Failed to process milestone verification notification/log:", error);
  }

  res.status(200).json({
    success: true,
    message: isVerified ? "Milestone verified by tutor" : "Milestone verification removed",
    data: progress,
    newBadges: newBadgesEarned
  });
});

/**
 * Add a custom milestone to a student's roadmap (Tutors only)
 */
export const addTutorMilestone = asyncHandler(async (req, res) => {
  const { studentId, topicName } = req.body;

  if (!studentId || !topicName) {
    throw new AppError("studentId and topicName are required", 400);
  }

  if (topicName.trim().length === 0 || topicName.trim().length > 200) {
    throw new AppError("Topic name must be between 1 and 200 characters", 400);
  }

  const progress = await LearningProgress.findOne({ user: studentId });
  if (!progress) {
    throw new AppError("Roadmap not found for this student", 404);
  }

  // Verify authorization
  if (!progress.tutorsTracking || !progress.tutorsTracking.some(id => id.toString() === req.user._id.toString())) {
    throw new AppError("You are not authorized to add milestones to this student", 403);
  }

  // Check for duplicates
  const isDuplicate = progress.roadmap.some(
    (t) => t.topicName.trim().toLowerCase() === topicName.trim().toLowerCase()
  );
  if (isDuplicate) {
    throw new AppError("This milestone already exists in the roadmap", 400);
  }

  progress.roadmap.push({
    topicName: topicName.trim(),
    status: "not_started",
    addedByTutor: true
  });

  await progress.save();

  // Create system comment log and send notification
  try {
    const newTopic = progress.roadmap[progress.roadmap.length - 1];
    if (newTopic) {
      const systemComment = await RoadmapComment.create({
        roadmap: progress._id,
        milestoneId: newTopic._id,
        sender: req.user._id,
        content: `Custom milestone added by tutor: "${topicName.trim()}"`,
        type: "status_change",
      });
      const populated = await systemComment.populate("sender", "name email role");
      const io = getIO();
      if (io) {
        io.to(`roadmap_${progress._id}`).emit("new-roadmap-comment", populated);
        
        // Notify student
        const notif = await createNotification({
          userId: studentId,
          title: "New Custom Milestone Added",
          message: `Tutor ${req.user.name} added custom milestone "${topicName.trim()}" to your roadmap`,
          type: "system",
          metadata: { roadmapId: progress._id.toString(), milestoneId: newTopic._id.toString() }
        });
        io.to(`user_${studentId}`).emit("new-notification", notif);
      }
    }
  } catch (error) {
    logger.error("Failed to process custom milestone notification/log:", error);
  }

  res.status(201).json({
    success: true,
    message: "Custom milestone added successfully by tutor",
    data: progress
  });
});

/**
 * Opt-in for a recruiter to track the roadmap (Student only)
 */
export const optInRecruiterTracking = asyncHandler(async (req, res) => {
  const { recruiterId } = req.body;

  if (!recruiterId) {
    throw new AppError("Recruiter ID is required", 400);
  }

  const recruiter = await User.findById(recruiterId);
  if (!recruiter || recruiter.role !== "recruiter") {
    throw new AppError("Invalid user ID or user is not a recruiter", 403);
  }

  const progress = await LearningProgress.findOne({ user: req.user._id });
  if (!progress) {
    throw new AppError("You do not have an active roadmap", 404);
  }

  if (!progress.recruitersTracking.includes(recruiterId)) {
    progress.recruitersTracking.push(recruiterId);
    await progress.save();
  }

  res.status(200).json({
    success: true,
    message: "Opted in for tracking successfully"
  });
});

/**
 * Opt-in for a tutor to track the roadmap and interviews
 */
export const optInTutorTracking = asyncHandler(async (req, res) => {
  const { tutorId } = req.body;

  if (!tutorId) {
    throw new AppError("Tutor ID is required", 400);
  }

  const tutor = await User.findById(tutorId);
  if (!tutor || tutor.role !== "tutor") {
    throw new AppError("Invalid user ID or user is not a tutor", 403);
  }

  const progress = await LearningProgress.findOne({ user: req.user._id });
  if (!progress) {
    throw new AppError("You do not have an active roadmap", 404);
  }

  if (!progress.tutorsTracking) {
    progress.tutorsTracking = [];
  }

  if (!progress.tutorsTracking.includes(tutorId)) {
    progress.tutorsTracking.push(tutorId);
    await progress.save();
  }

  res.status(200).json({
    success: true,
    message: "Assigned tutor successfully"
  });
});

/**
 * Get all roadmaps tracked by the current recruiter (Recruiter only)
 */
export const getTrackedRoadmaps = asyncHandler(async (req, res) => {
  const roadmaps = await LearningProgress.find({ recruitersTracking: req.user._id })
    .populate("user", "name email role")
    .lean();

  res.status(200).json({
    success: true,
    data: roadmaps
  });
});

/**
 * Get comments/collaboration feed for a specific learning roadmap
 */
export const getRoadmapComments = asyncHandler(async (req, res) => {
  const { id: roadmapId } = req.params;
  const { milestoneId } = req.query;

  const progress = await LearningProgress.findById(roadmapId);
  if (!progress) {
    throw new AppError("Roadmap not found", 404);
  }

  // Auth check: student themselves, tracking tutor, or tracking recruiter
  const isStudent = progress.user.toString() === req.user._id.toString();
  const isTutor = progress.tutorsTracking && progress.tutorsTracking.some(id => id.toString() === req.user._id.toString());
  const isRecruiter = progress.recruitersTracking && progress.recruitersTracking.some(id => id.toString() === req.user._id.toString());

  if (!isStudent && !isTutor && !isRecruiter) {
    throw new AppError("You are not authorized to view comments for this roadmap", 403);
  }

  const query = { roadmap: roadmapId };
  if (milestoneId) {
    query.milestoneId = milestoneId;
  }

  const comments = await RoadmapComment.find(query)
    .populate("sender", "name email role")
    .sort({ createdAt: 1 });

  res.status(200).json({
    success: true,
    data: comments
  });
});

/**
 * Add a comment or collaboration log on a milestone
 */
export const postRoadmapComment = asyncHandler(async (req, res) => {
  const { id: roadmapId } = req.params;
  const { milestoneId, content, type = "comment" } = req.body;

  if (!milestoneId || !content) {
    throw new AppError("milestoneId and content are required", 400);
  }

  const progress = await LearningProgress.findById(roadmapId).populate("user", "name email");
  if (!progress) {
    throw new AppError("Roadmap not found", 404);
  }

  // Auth check
  const isStudent = progress.user._id.toString() === req.user._id.toString();
  const isTutor = progress.tutorsTracking && progress.tutorsTracking.some(id => id.toString() === req.user._id.toString());
  const isRecruiter = progress.recruitersTracking && progress.recruitersTracking.some(id => id.toString() === req.user._id.toString());

  if (!isStudent && !isTutor && !isRecruiter) {
    throw new AppError("You are not authorized to comment on this roadmap", 403);
  }

  // Find the milestone name for the notification
  const milestone = progress.roadmap.id(milestoneId);
  const milestoneName = milestone ? milestone.topicName : "Milestone";

  const comment = await RoadmapComment.create({
    roadmap: roadmapId,
    milestoneId,
    sender: req.user._id,
    content,
    type
  });

  const populatedComment = await comment.populate("sender", "name email role");

  // Emit in real-time via Socket.io
  const io = getIO();
  if (io) {
    io.to(`roadmap_${roadmapId}`).emit("new-roadmap-comment", populatedComment);
  }

  // Send notifications
  try {
    if (isStudent && progress.tutorsTracking && progress.tutorsTracking.length > 0) {
      for (const tutorId of progress.tutorsTracking) {
        const notif = await createNotification({
          userId: tutorId,
          title: "New Roadmap Comment",
          message: `${req.user.name} commented on "${milestoneName}": ${content}`,
          type: "message",
          metadata: { roadmapId, milestoneId }
        });
        if (io) {
          io.to(`user_${tutorId}`).emit("new-notification", notif);
        }
      }
    } else if (isTutor && progress.user) {
      const notif = await createNotification({
        userId: progress.user._id,
        title: "New Roadmap Comment",
        message: `Tutor ${req.user.name} commented on "${milestoneName}": ${content}`,
        type: "message",
        metadata: { roadmapId, milestoneId }
      });
      if (io) {
        io.to(`user_${progress.user._id}`).emit("new-notification", notif);
      }
    }
  } catch (error) {
    logger.error("Error creating comment notification:", error);
  }

  res.status(201).json({
    success: true,
    data: populatedComment
  });
});
