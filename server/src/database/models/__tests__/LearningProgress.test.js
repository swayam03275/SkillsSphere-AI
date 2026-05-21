import test from "node:test";
import assert from "node:assert/strict";
import mongoose from "mongoose";
import LearningProgress from "../LearningProgress.js";

const validUserObjectId = new mongoose.Types.ObjectId();
const tutorUserObjectId = new mongoose.Types.ObjectId();

const createValidLearningProgress = () => ({
  user: validUserObjectId,
  targetRole: "Frontend Engineer",
  roadmap: [
    {
      topicName: "HTML/CSS Basics",
      status: "completed",
      isVerified: false,
    },
    {
      topicName: "JavaScript Deep Dive",
      status: "in_progress",
      isVerified: false,
    },
    {
      topicName: "React Framework",
      status: "not_started",
      isVerified: false,
    }
  ]
});

// ========== VALID DOCUMENT TESTS ==========
test("LearningProgress - validates a fully correct document", () => {
  const progress = new LearningProgress(createValidLearningProgress());
  const errors = progress.validateSync();
  assert.equal(errors, undefined, "Valid document should not have validation errors");
});

test("LearningProgress - model exports correctly with correct name", () => {
  assert.equal(LearningProgress.modelName, "LearningProgress");
  assert.equal(LearningProgress.collection.name, "learningprogresses");
});

// ========== REQUIRED FIELDS TESTS ==========
test("LearningProgress - rejects missing user", () => {
  const data = createValidLearningProgress();
  delete data.user;
  const progress = new LearningProgress(data);
  const errors = progress.validateSync();
  assert.ok(errors, "Should have validation errors");
  assert.ok(errors.errors.user, "Should have user error");
});

test("LearningProgress - rejects missing targetRole", () => {
  const data = createValidLearningProgress();
  delete data.targetRole;
  const progress = new LearningProgress(data);
  const errors = progress.validateSync();
  assert.ok(errors, "Should have validation errors");
  assert.ok(errors.errors.targetRole, "Should have targetRole error");
});

// ========== ENUM & DEFAULT VALIDATIONS ==========
test("LearningProgress - rejects invalid topic status enum", () => {
  const data = createValidLearningProgress();
  data.roadmap[0].status = "invalid_status";
  const progress = new LearningProgress(data);
  const errors = progress.validateSync();
  assert.ok(errors, "Should have validation errors");
  assert.ok(errors.errors["roadmap.0.status"], "Should have roadmap topic status error");
});

test("LearningProgress - default status is not_started", () => {
  const progress = new LearningProgress({
    user: validUserObjectId,
    targetRole: "Backend Engineer",
    roadmap: [{ topicName: "Node.js Basics" }]
  });
  assert.equal(progress.roadmap[0].status, "not_started", "Status should default to 'not_started'");
});

// ========== TUTOR-ASSIGNED RESOURCES ==========
test("LearningProgress - validates resources with tutor assignments", () => {
  const progress = new LearningProgress({
    user: validUserObjectId,
    targetRole: "Full Stack Developer",
    roadmap: [
      {
        topicName: "Node.js Basics",
        resources: [
          {
            title: "Advanced NodeJS Guide",
            url: "https://nodejs.org",
            type: "documentation",
            tutorAssigned: true,
            assignedBy: tutorUserObjectId
          }
        ]
      }
    ]
  });

  const errors = progress.validateSync();
  assert.equal(errors, undefined, "Tutor-assigned resources should be valid");
  assert.equal(progress.roadmap[0].resources[0].tutorAssigned, true);
  assert.equal(progress.roadmap[0].resources[0].assignedBy.toString(), tutorUserObjectId.toString());
});

test("LearningProgress - rejects invalid resource type", () => {
  const progress = new LearningProgress({
    user: validUserObjectId,
    targetRole: "Full Stack Developer",
    roadmap: [
      {
        topicName: "Node.js Basics",
        resources: [
          {
            title: "Advanced NodeJS Guide",
            url: "https://nodejs.org",
            type: "book", // Invalid type (must be video, article, or documentation)
            tutorAssigned: true,
            assignedBy: tutorUserObjectId
          }
        ]
      }
    ]
  });

  const errors = progress.validateSync();
  assert.ok(errors, "Should have validation errors for invalid resource type");
  assert.ok(errors.errors["roadmap.0.resources.0.type"]);
});

// ========== PRE-SAVE MIDDLEWARE: OVERALL PROGRESS ==========
test("LearningProgress - calculates overall progress before save (or manual call)", async () => {
  const progress = new LearningProgress({
    user: validUserObjectId,
    targetRole: "DevOps Engineer",
    roadmap: [
      { topicName: "Docker", status: "completed" },
      { topicName: "Kubernetes", status: "in_progress" },
      { topicName: "CI/CD", status: "completed" },
      { topicName: "Cloud", status: "not_started" }
    ]
  });

  const saveHooks = progress.schema.s.hooks._pres.get("save");
  const preSaveHook = saveHooks.find(h => h.fn.toString().includes("overallProgress") || h.fn.toString().includes("roadmap")).fn;
  
  await new Promise((resolve) => {
    preSaveHook.call(progress, resolve);
  });
  
  // 2 out of 4 topics are completed -> 50%
  assert.equal(progress.overallProgress, 50, "Overall progress should be 50%");
});

test("LearningProgress - calculates overall progress as 0 for empty roadmap", async () => {
  const progress = new LearningProgress({
    user: validUserObjectId,
    targetRole: "DevOps Engineer",
    roadmap: []
  });

  const saveHooks = progress.schema.s.hooks._pres.get("save");
  const preSaveHook = saveHooks.find(h => h.fn.toString().includes("overallProgress") || h.fn.toString().includes("roadmap")).fn;
  
  await new Promise((resolve) => {
    preSaveHook.call(progress, resolve);
  });
  
  assert.equal(progress.overallProgress, 0, "Overall progress should default to 0 for empty roadmap");
});
