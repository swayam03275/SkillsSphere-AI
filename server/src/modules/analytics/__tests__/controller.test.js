import { afterEach, describe, it, mock } from "node:test";
import assert from "node:assert/strict";
import { getDashboardAnalytics } from "../controller.js";
import LearningProgress from "../../../database/models/LearningProgress.js";
import InterviewSession from "../../../database/models/InterviewSession.js";

const createResponse = () => {
  const res = {};
  res.status = mock.fn(() => res);
  res.json = mock.fn();
  return res;
};

describe("analytics controller", () => {
  afterEach(() => {
    mock.restoreAll();
  });

  it("includes the role field in student dashboard analytics data", async () => {
    mock.method(LearningProgress, "findOne", () => ({
      lean: mock.fn(async () => ({
        overallProgress: 72,
        roadmap: [
          { status: "completed" },
          { status: "in-progress" },
          { status: "completed" },
        ],
      })),
    }));
    mock.method(InterviewSession, "find", () => ({
      lean: mock.fn(async () => [
        { overallScore: 80 },
        { overallScore: 90 },
      ]),
    }));

    const req = { user: { _id: "student-1", role: "student" } };
    const res = createResponse();

    await getDashboardAnalytics(req, res);

    assert.equal(res.status.mock.calls[0].arguments[0], 200);
    assert.deepEqual(res.json.mock.calls[0].arguments[0], {
      success: true,
      data: {
        role: "student",
        roadmapProgress: 72,
        averageInterviewScore: 85,
        totalInterviews: 2,
        completedTopics: 2,
      },
    });
  });

  it("includes the role field in tutor dashboard analytics data", async () => {
    mock.method(InterviewSession, "aggregate", async () => [
      { averagePlatformScore: 80, totalMockInterviewsCompleted: 2 }
    ]);
    mock.method(LearningProgress, "countDocuments", async () => 9);

    const req = { user: { _id: "tutor-1", role: "tutor" } };
    const res = createResponse();

    await getDashboardAnalytics(req, res);

    assert.equal(res.status.mock.calls[0].arguments[0], 200);
    assert.deepEqual(res.json.mock.calls[0].arguments[0], {
      success: true,
      data: {
        role: "tutor",
        averagePlatformScore: 80,
        totalMockInterviewsCompleted: 2,
        activeStudents: 9,
      },
    });
  });

  it("includes the role field in recruiter dashboard analytics data", async () => {
    mock.method(InterviewSession, "aggregate", async () => [
      { _id: "React", count: 3 },
      { _id: "Node", count: 2 },
    ]);

    const req = { user: { _id: "recruiter-1", role: "recruiter" } };
    const res = createResponse();

    await getDashboardAnalytics(req, res);

    assert.equal(res.status.mock.calls[0].arguments[0], 200);
    assert.deepEqual(res.json.mock.calls[0].arguments[0], {
      success: true,
      data: {
        role: "recruiter",
        talentDensity: [
          { topic: "React", skilledCandidates: 3 },
          { topic: "Node", skilledCandidates: 2 },
        ],
        totalEliteCandidates: 5,
      },
    });
  });
});
