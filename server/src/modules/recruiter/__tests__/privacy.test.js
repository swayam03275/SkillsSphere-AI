import { afterEach, describe, it, mock } from "node:test";
import assert from "node:assert/strict";
import {
  buildRecruiterPrivacyMatch,
  inviteCandidate,
  searchTalent,
} from "../controller.js";
import Resume from "../../../database/models/Resume.js";
import User from "../../../database/models/User.js";
import JobPosting from "../../../database/models/JobPosting.js";

const createResponse = () => {
  const res = {};
  res.status = mock.fn(() => res);
  res.json = mock.fn();
  return res;
};

describe("recruiter candidate privacy", () => {
  afterEach(() => {
    mock.restoreAll();
  });

  it("builds a privacy filter that allows public/recruiter profiles and legacy defaults", () => {
    assert.deepEqual(buildRecruiterPrivacyMatch("userDoc"), {
      $and: [
        {
          $or: [
            {
              "userDoc.preferences.privacy.profileVisibility": {
                $in: ["public", "recruiters"],
              },
            },
            {
              "userDoc.preferences.privacy.profileVisibility": {
                $exists: false,
              },
            },
          ],
        },
        {
          $or: [
            {
              "userDoc.preferences.privacy.showResumeToRecruiters": true,
            },
            {
              "userDoc.preferences.privacy.showResumeToRecruiters": {
                $exists: false,
              },
            },
          ],
        },
      ],
    });
  });

  it("applies privacy filtering before talent finder pagination and returns allowed profiles", async () => {
    let receivedPipeline;
    mock.method(Resume, "aggregate", async (pipeline) => {
      receivedPipeline = pipeline;
      return [{
        metadata: [{ total: 2 }],
        data: [
          {
            _id: "resume-public",
            userDoc: {
              _id: "student-public",
              role: "student",
              name: "Public Student",
              preferences: {
                privacy: {
                  profileVisibility: "public",
                  showResumeToRecruiters: true,
                },
              },
            },
          },
          {
            _id: "resume-recruiters",
            userDoc: {
              _id: "student-recruiters",
              role: "student",
              name: "Recruiter-visible Student",
              preferences: {
                privacy: {
                  profileVisibility: "recruiters",
                  showResumeToRecruiters: true,
                },
              },
            },
          },
        ],
      }];
    });

    const req = { query: {} };
    const res = createResponse();
    const next = mock.fn();

    await searchTalent(req, res, next);

    const privacyStageIndex = receivedPipeline.findIndex(
      (stage) => stage.$match?.["userDoc.role"] === "student",
    );
    const facetStageIndex = receivedPipeline.findIndex((stage) => stage.$facet);

    assert.ok(privacyStageIndex >= 0);
    assert.ok(privacyStageIndex < facetStageIndex);
    assert.deepEqual(
      receivedPipeline[privacyStageIndex].$match,
      {
        "userDoc.role": "student",
        ...buildRecruiterPrivacyMatch("userDoc"),
      },
    );

    const body = res.json.mock.calls[0].arguments[0];
    assert.equal(body.pagination.total, 2);
    assert.deepEqual(
      body.data.map((candidate) => candidate.user._id),
      ["student-public", "student-recruiters"],
    );
    assert.equal(next.mock.calls.length, 0);
  });

  it("blocks direct recruiter actions when a candidate is not privacy-discoverable", async () => {
    mock.method(JobPosting, "findById", async () => ({
      _id: "507f1f77bcf86cd799439012",
      recruiter: { toString: () => "507f1f77bcf86cd799439013" },
    }));
    mock.method(User, "findOne", async () => null);

    const req = {
      body: {
        candidateId: "507f1f77bcf86cd799439011",
        jobId: "507f1f77bcf86cd799439012",
      },
      user: {
        _id: "507f1f77bcf86cd799439013",
      },
    };
    const res = createResponse();
    const next = mock.fn();

    await inviteCandidate(req, res, next);

    assert.equal(next.mock.calls.length, 1);
    assert.equal(next.mock.calls[0].arguments[0].statusCode, 404);
    assert.equal(
      next.mock.calls[0].arguments[0].message,
      "Candidate profile is not available to recruiters",
    );

    const candidateQuery = User.findOne.mock.calls[0].arguments[0];
    assert.equal(candidateQuery.role, "student");
    assert.deepEqual(
      { $and: candidateQuery.$and },
      buildRecruiterPrivacyMatch(),
    );
  });
});
