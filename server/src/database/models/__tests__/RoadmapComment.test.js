import test from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";
import RoadmapComment from "../RoadmapComment.js";

const mockRoadmapId = new mongoose.Types.ObjectId();
const mockMilestoneId = new mongoose.Types.ObjectId();
const mockSenderId = new mongoose.Types.ObjectId();

test("RoadmapComment - validates a fully correct document", () => {
  const comment = new RoadmapComment({
    roadmap: mockRoadmapId,
    milestoneId: mockMilestoneId,
    sender: mockSenderId,
    content: "Keep up the good work on this milestone!",
    type: "comment",
  });
  const errors = comment.validateSync();
  assert.equal(errors, undefined, "Valid roadmap comment should not have validation errors");
});

test("RoadmapComment - model exports correctly with correct name", () => {
  assert.equal(RoadmapComment.modelName, "RoadmapComment");
  assert.equal(RoadmapComment.collection.name, "roadmapcomments");
});

test("RoadmapComment - rejects missing roadmap", () => {
  const comment = new RoadmapComment({
    milestoneId: mockMilestoneId,
    sender: mockSenderId,
    content: "Missing roadmap",
  });
  const errors = comment.validateSync();
  assert.ok(errors, "Should have validation errors");
  assert.ok(errors.errors.roadmap, "Should have roadmap field error");
});

test("RoadmapComment - rejects missing milestoneId", () => {
  const comment = new RoadmapComment({
    roadmap: mockRoadmapId,
    sender: mockSenderId,
    content: "Missing milestone",
  });
  const errors = comment.validateSync();
  assert.ok(errors, "Should have validation errors");
  assert.ok(errors.errors.milestoneId, "Should have milestoneId field error");
});

test("RoadmapComment - rejects missing content", () => {
  const comment = new RoadmapComment({
    roadmap: mockRoadmapId,
    milestoneId: mockMilestoneId,
    sender: mockSenderId,
  });
  const errors = comment.validateSync();
  assert.ok(errors, "Should have validation errors");
  assert.ok(errors.errors.content, "Should have content field error");
});

test("RoadmapComment - rejects invalid comment type enum", () => {
  const comment = new RoadmapComment({
    roadmap: mockRoadmapId,
    milestoneId: mockMilestoneId,
    sender: mockSenderId,
    content: "Invalid type",
    type: "super_chat",
  });
  const errors = comment.validateSync();
  assert.ok(errors, "Should have validation errors");
  assert.ok(errors.errors.type, "Should have comment type error");
});
