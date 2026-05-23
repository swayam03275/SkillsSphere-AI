import { describe, it, afterEach, mock } from "node:test";
import assert from "node:assert/strict";
import * as jobService from "../service.js";
import JobPosting from "../../../database/models/JobPosting.js";
import JobApplication from "../../../database/models/JobApplication.js";
import Resume from "../../../database/models/Resume.js";

describe("Job Service Analytics Aggregator", () => {
  const mockRecruiterId = "recruiter123";
  const mockJobIds = ["job1", "job2"];

  afterEach(() => {
    mock.restoreAll();
  });

  it("should aggregate detailed hiring intelligence analytics accurately", async () => {
    // 1. Mock JobPosting find
    mock.method(JobPosting, "find", () => ({
      select: mock.fn(() => ({
        lean: mock.fn(async () => [
          { _id: "job1", title: "React Dev" },
          { _id: "job2", title: "Python Dev" }
        ])
      }))
    }));

    // 2. Mock JobApplication countDocuments
    mock.method(JobApplication, "countDocuments", async () => 3);

    // 3. Mock JobApplication aggregate for statuses
    mock.method(JobApplication, "aggregate", async (args) => {
      // If doing status aggregation
      if (args[1] && args[1].$group && args[1].$group._id === "$status") {
        return [
          { _id: "pending", count: 1 },
          { _id: "shortlisted", count: 2 }
        ];
      }
      // If doing per job aggregation
      return [
        { _id: "job1", count: 2, title: "React Dev", status: "open" },
        { _id: "job2", count: 1, title: "Python Dev", status: "open" }
      ];
    });

    // 4. Mock JobApplication.find lean list
    const mockApps = [
      {
        _id: "app1",
        job: "job1",
        aiMatchScore: 90,
        matchCategory: "Excellent Match",
        matchBreakdown: {
          atsCompatibility: 85,
          contributionActivity: "High",
          careerReadiness: "High"
        },
        resume: "resume1"
      },
      {
        _id: "app2",
        job: "job1",
        aiMatchScore: 78,
        matchCategory: "Moderate Match",
        matchBreakdown: {
          atsCompatibility: 75,
          contributionActivity: "Medium",
          careerReadiness: "Medium"
        },
        resume: "resume2"
      },
      {
        _id: "app3",
        job: "job2",
        aiMatchScore: 40,
        matchCategory: "Weak Alignment",
        matchBreakdown: {
          atsCompatibility: 35,
          contributionActivity: "Low",
          careerReadiness: "Low"
        },
        resume: "resume3"
      }
    ];

    mock.method(JobApplication, "find", (query) => {
      return {
        select: mock.fn(() => ({
          populate: mock.fn(() => ({
            lean: mock.fn(async () => {
              // This mocks populated query for resumes in specialization logic
              return mockApps.map(app => ({
                ...app,
                resume: app.resume === "resume1"
                  ? { _id: "resume1", skills: ["html", "css", "react", "javascript"] }
                  : app.resume === "resume2"
                    ? { _id: "resume2", skills: ["python", "django", "node.js"] }
                    : { _id: "resume3", skills: ["docker", "kubernetes", "aws"] }
              }));
            })
          }))
        })),
        lean: mock.fn(async () => mockApps)
      };
    });

    // 5. Execute getApplicantAnalytics
    const result = await jobService.getApplicantAnalytics(mockRecruiterId);

    // 6. Assertions
    assert.equal(result.totalApplicants, 3);
    assert.deepEqual(result.applicantsByStatus, { pending: 1, reviewed: 0, shortlisted: 2, rejected: 0 });
    
    // AI Score distributions assertions
    assert.equal(result.averageAiMatchScore, 69); // Math.round((90 + 78 + 40) / 3) = 69
    assert.equal(result.topCandidatesCount, 1); // app1 score >= 85
    assert.equal(result.matchCategoryDistribution["Excellent Match"], 1);
    assert.equal(result.matchCategoryDistribution["Moderate Match"], 1);
    assert.equal(result.matchCategoryDistribution["Weak Alignment"], 1);

    // ATS Compatibility assertions
    assert.equal(result.averageAtsScore, 65); // Math.round((85 + 75 + 35) / 3) = 65
    assert.equal(result.atsReadyPercentage, 33); // 1 out of 3 = 33%
    assert.equal(result.lowAtsCount, 1); // app3 ats < 50

    // Contribution indicators assertions
    assert.equal(result.ossContributorCount, 2); // app1, app2 are High/Medium
    assert.equal(result.ossContributorPercentage, 67); // 2 out of 3 = 67%
    assert.equal(result.activeRoadmapCount, 2); // app1, app2 are High/Medium

    // Specializations counts assertions
    assert.equal(result.specializationCounts.frontend, 1); // resume1
    assert.equal(result.specializationCounts.backend, 1); // resume2 has python, django, node.js
    assert.equal(result.specializationCounts.devops, 1); // resume3 has docker, kubernetes, aws
    assert.equal(result.specializationCounts.fullstack, 0);
  });
});
