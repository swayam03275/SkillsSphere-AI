import assert from "node:assert/strict";
import test, { afterEach } from "node:test";
import express from "express";
import globalErrorHandler from "../../../middleware/errorMiddleware.js";
import {
  analyzeResume,
  resetResumeControllerDependencies,
  setResumeControllerDependencies,
} from "../controller.js";

const parsedResume = {
  name: "Ada Lovelace",
  email: "ada@example.com",
  phone: "1234567890",
  skills: ["JavaScript", "React", "Node.js"],
  education: ["BSc Computer Science"],
  experience: ["Software Engineer with 3 years experience"],
  projects: ["Resume analyzer"],
  certifications: ["AWS Certified"],
  linkedin: "https://www.linkedin.com/in/ada",
  github: "https://github.com/ada",
  portfolio: "https://ada.dev",
  keywords: ["JavaScript", "React", "Node.js"],
  extractedTextLength: 128,
  resumeText:
    "Ada Lovelace JavaScript React Node.js developer with 3 years experience building APIs.",
};

afterEach(() => {
  resetResumeControllerDependencies();
});

const createApp = () => {
  const app = express();

  app.use(express.json());
  app.post(
    "/api/resume/analyze",
    (req, res, next) => {
      req.file = {
        originalname: "resume.pdf",
        filename: "test-resume.pdf",
        path: "uploads/test-resume.pdf",
        size: 12 * 1024,
        mimetype: "application/pdf",
      };
      req.user = { _id: "64f1f77bcf86cd7994390000" };
      next();
    },

    analyzeResume,
  );
  app.use(globalErrorHandler);

  return app;
};

const postAnalyze = async (body = {}) => {
  const app = createApp();
  const server = app.listen(0);

  try {
    const { port } = server.address();
    const response = await fetch(`http://127.0.0.1:${port}/api/resume/analyze`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });

    return {
      status: response.status,
      body: await response.json(),
    };
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
};

const stubControllerDependencies = () => {
  const savedPayloads = [];

  setResumeControllerDependencies({
    parseResume: async () => parsedResume,
    upsertResume: async (userId, payload) => {
      savedPayloads.push({ ...payload, user: userId });
      return {
        _id: "64f1f77bcf86cd7994390111",
        ...payload,
        user: userId,
      };
    },

  });

  return savedPayloads;
};

const assertLegacyAnalyzeResponse = (body) => {
  assert.equal(body.success, true);
  assert.equal(typeof body.message, "string");
  assert.equal(body.resumeId, "64f1f77bcf86cd7994390111");
  assert.ok(body.data);
  assert.ok(body.skillMatch);
  assert.ok(body.keywordMatch);
  assert.ok(body.experienceMatch);
  assert.deepEqual(body.file, {
    originalName: "resume.pdf",
    storedName: "test-resume.pdf",
    path: "/uploads/test-resume.pdf",
    size: "12.00 KB",
    mimeType: "application/pdf",
  });
  assert.equal(body.data.resumeText, undefined);
};

test("analyze with jobDescription preserves legacy fields and includes evaluator breakdown", async () => {
  const savedPayloads = stubControllerDependencies();

  const { status, body } = await postAnalyze({
    jobSkills: JSON.stringify(["JavaScript", "Node.js", "MongoDB"]),
    jobDescription: "Need JavaScript Node.js developer with 2 years experience and MongoDB.",
  });

  assert.equal(status, 200);
  assertLegacyAnalyzeResponse(body);
  assert.equal(body.skillMatch.score, 67);
  assert.deepEqual(body.skillMatch.matchedSkills, ["javascript", "node.js"]);
  assert.deepEqual(body.skillMatch.missingSkills, ["mongodb"]);
  assert.equal(body.keywordMatch.weight, 0.2);
  assert.ok(body.keywordMatch.matchedKeywords.includes("JavaScript"));
  assert.ok(body.keywordMatch.missingKeywords.includes("MongoDB"));
  assert.equal(body.experienceMatch.score, 100);
  assert.equal(body.experienceMatch.candidateExperience, 3);
  assert.equal(body.experienceMatch.requiredExperience, 2);
  assert.equal(body.experienceMatch.experienceGap, 0);
  assert.deepEqual(
    body.evaluatorBreakdown.map((item) => item.key),
    ["skillMatch", "keywordMatch", "experienceMatch"],
  );
  assert.equal(typeof body.overallScore, "number");
  assert.equal(savedPayloads[0].aggregatedScore, body.overallScore);
  assert.deepEqual(savedPayloads[0].evaluatorBreakdown, body.evaluatorBreakdown);
});

test("analyze rejects invalid jobSkills JSON", async () => {
  stubControllerDependencies();

  const { status, body } = await postAnalyze({
    jobSkills: "foo",
  });

  assert.equal(status, 400);
  assert.equal(body.success, false);
  assert.equal(body.message, "jobSkills must be a valid JSON array");
});

test("analyze without jobDescription still works with empty optional evaluator fields", async () => {
  const savedPayloads = stubControllerDependencies();

  const { status, body } = await postAnalyze();

  assert.equal(status, 200);
  assertLegacyAnalyzeResponse(body);
  assert.deepEqual(body.skillMatch, {});
  assert.deepEqual(body.keywordMatch, {});
  assert.deepEqual(body.experienceMatch, {
    score: 0,
    weight: 0.2,
    feedback: ["Could not detect required experience from the job description"],
    candidateExperience: 3,
    requiredExperience: 0,
    experienceGap: 0,
  });
  assert.deepEqual(
    body.evaluatorBreakdown.map((item) => item.key),
    ["experienceMatch"],
  );
  assert.equal(body.overallScore, 0);
  assert.equal(savedPayloads[0].aggregatedScore, 0);
});

test("analyze response shape regression is protected", async () => {
  stubControllerDependencies();

  const { status, body } = await postAnalyze({
    jobDescription: "Need JavaScript developer with 2 years experience.",
  });

  assert.equal(status, 200);
  assert.deepEqual(Object.keys(body), [
    "success",
    "message",
    "resumeId",
    "data",
    "skillMatch",
    "keywordMatch",
    "experienceMatch",
    "file",
    "evaluatorBreakdown",
    "overallScore",
  ]);
});

