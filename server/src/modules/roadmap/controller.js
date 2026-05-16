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
