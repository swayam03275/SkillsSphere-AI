import LearningProgress from "../../database/models/LearningProgress.js";
import asyncHandler from "../../utils/asyncHandler.js";
import AppError from "../../utils/AppError.js";

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

  let progress = await LearningProgress.findOne({ user: req.user._id });

  const roadmapData = topics.map(topic => ({
    topicName: topic,
    status: "not_started"
  }));

  if (progress) {
    // If roadmap exists, we merge (don't overwrite completed topics)
    const existingTopics = new Map(progress.roadmap.map(t => [t.topicName, t]));
    
    progress.targetRole = targetRole;
    progress.roadmap = topics.map(topicName => {
      if (existingTopics.has(topicName)) {
        return existingTopics.get(topicName);
      }
      return { topicName, status: "not_started" };
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

  await progress.save();

  res.status(200).json({
    success: true,
    message: `Topic marked as ${status.replace("_", " ")}`,
    data: progress
  });
});

/**
 * Get all active student roadmaps (Tutors only)
 */
export const getStudentsRoadmaps = asyncHandler(async (req, res) => {
  const roadmaps = await LearningProgress.find()
    .populate("user", "name email role")
    .lean();

  // Filter only those whose user role is "student"
  const studentRoadmaps = roadmaps.filter(r => r.user && r.user.role === "student");

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

  if (!["video", "article", "documentation"].includes(type)) {
    throw new AppError("Invalid resource type", 400);
  }

  const progress = await LearningProgress.findOne({ user: studentId });
  if (!progress) {
    throw new AppError("Roadmap not found for this student", 404);
  }

  const topic = progress.roadmap.id(topicId);
  if (!topic) {
    throw new AppError("Topic not found in student's roadmap", 404);
  }

  // Push new resource with tutorAssigned: true
  topic.resources.push({
    title,
    url,
    type,
    tutorAssigned: true,
    assignedBy: req.user._id
  });

  await progress.save();

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

  await progress.save();

  res.status(200).json({
    success: true,
    message: isVerified ? "Milestone verified by tutor" : "Milestone verification removed",
    data: progress
  });
});
