import assert from "node:assert/strict";
import test, { afterEach, mock } from "node:test";
import JobPosting from "../../../database/models/JobPosting.js";
import Resume from "../../../database/models/Resume.js";
import JobApplication from "../../../database/models/JobApplication.js";
import jobsRoutes from "../routes.js";

afterEach(() => {
  mock.restoreAll();
});

const getRecruiterRecommendationsRoute = () => {
  const layer = jobsRoutes.stack.find((stackLayer) => (
    stackLayer.route?.path === "/:id/recommendations" &&
    stackLayer.route?.methods?.get
  ));

  assert.ok(layer, "recruiter recommendations route should be registered");
  return layer.route.stack;
};

const invokeMiddleware = (middleware, req = {}) =>
  new Promise((resolve) => {
    middleware.handle(req, {}, (error) => {
      resolve(error);
    });
  });

test("recruiter recommendations route allows authenticated recruiter through role guard", async () => {
  const [roleGuard, controller] = getRecruiterRecommendationsRoute();
  
  // Mock JobPosting.findById
  mock.method(JobPosting, "findById", async () => ({
    _id: "job-123",
    recruiter: "recruiter-123",
    skills: ["React", "Node.js", "TypeScript"],
  }));

  // Mock Resume.find with populate and lean
  mock.method(Resume, "find", () => ({
    populate() {
      return this;
    },
    lean: async () => [
      {
        _id: "resume-1",
        user: { _id: "student-1", name: "Alice", email: "alice@example.com" },
        skills: ["React", "CSS"],
      },
      {
        _id: "resume-2",
        user: { _id: "student-2", name: "Bob", email: "bob@example.com" },
        skills: ["React", "Node.js", "TypeScript", "Docker"],
      }
    ],
  }));

  // Mock JobApplication.exists
  mock.method(JobApplication, "exists", async () => false);

  const error = await invokeMiddleware(roleGuard, {
    user: { role: "recruiter" },
  });

  assert.equal(error, undefined);

  const response = await new Promise((resolve, reject) => {
    const res = {
      statusCode: null,
      status(code) {
        this.statusCode = code;
        return this;
      },
      json(data) {
        resolve({ statusCode: this.statusCode, data });
      },
    };

    controller.handle(
      {
        params: { id: "job-123" },
        user: { _id: "recruiter-123", role: "recruiter" },
      },
      res,
      reject,
    );
  });

  assert.equal(response.statusCode, 200);
  assert.equal(response.data.success, true);
  assert.equal(response.data.recommendations.length, 2);
  
  // Top match should be Bob (React, Node.js, TypeScript overlap 3/3 = 100%)
  const topMatch = response.data.recommendations[0];
  assert.equal(topMatch.applicant.name, "Bob");
  assert.equal(topMatch.aiMatchScore, 100);
  assert.equal(topMatch.matchCategory, "Excellent Match");
  assert.deepEqual(topMatch.matchingSkills, ["react", "node.js", "typescript"]);
  assert.deepEqual(topMatch.missingSkills, []);

  // Second match should be Alice (React overlap 1/3 = 33%)
  const secondMatch = response.data.recommendations[1];
  assert.equal(secondMatch.applicant.name, "Alice");
  assert.equal(secondMatch.aiMatchScore, 33);
  assert.equal(secondMatch.matchCategory, "Growth Potential");
  assert.deepEqual(secondMatch.matchingSkills, ["react"]);
  assert.deepEqual(secondMatch.missingSkills, ["node.js", "typescript"]);
});

test("recruiter recommendations route denies unauthorized recruiter of different job", async () => {
  const [, controller] = getRecruiterRecommendationsRoute();
  
  // Mock JobPosting.findById returning job owned by recruiter-456
  mock.method(JobPosting, "findById", async () => ({
    _id: "job-123",
    recruiter: "recruiter-456",
    skills: ["React"],
  }));

  const responsePromise = new Promise((resolve, reject) => {
    controller.handle(
      {
        params: { id: "job-123" },
        user: { _id: "recruiter-123", role: "recruiter" },
      },
      {},
      (err) => {
        if (err) resolve(err);
        else reject(new Error("Expected error to be thrown"));
      }
    );
  });

  const error = await responsePromise;
  assert.equal(error.statusCode, 403);
  assert.match(error.message, /do not have permission/i);
});

test("recruiter recommendations route denies non-recruiter roles", async () => {
  const [roleGuard] = getRecruiterRecommendationsRoute();

  for (const role of ["student", "tutor"]) {
    const error = await invokeMiddleware(roleGuard, {
      user: { role },
    });

    assert.equal(error.statusCode, 403);
    assert.match(error.message, /do not have permission/i);
  }
});
