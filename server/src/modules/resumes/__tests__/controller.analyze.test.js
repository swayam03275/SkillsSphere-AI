import assert from "node:assert/strict";
import test, { afterEach, mock } from "node:test";
import express from "express";
import globalErrorHandler from "../../../middleware/errorMiddleware.js";
import AnalysisHistory from "../../../database/models/AnalysisHistory.js";
import Resume from "../../../database/models/Resume.js";
import {
  analyzeResume,
  resetResumeControllerDependencies,
  setResumeControllerDependencies,
  listResumes,
  setActiveResume,
  renameResume,
  deleteResume,
} from "../controller.js";

// Mock MongoDB interactions on AnalysisHistory to prevent database buffering timeouts
mock.method(AnalysisHistory, "create", async () => ({}));
mock.method(AnalysisHistory, "countDocuments", async () => 0);
mock.method(AnalysisHistory, "find", () => ({
  sort: () => ({
    limit: () => ({
      select: async () => []
    })
  })
}));
mock.method(AnalysisHistory, "deleteMany", async () => ({}));
mock.method(Resume, "countDocuments", async () => 0);

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
        path: "/uploads/test-resume.pdf",
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
    findCachedAnalysis: async () => null,
    saveCachedAnalysis: async () => ({}),
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
  assert.deepEqual(body.skillMatch.matchedSkills, ["javascript", "nodejs"]);
  assert.deepEqual(body.skillMatch.missingSkills, ["mongodb"]);
  assert.equal(body.keywordMatch.weight, 0.15);
  assert.ok(body.keywordMatch.matchedKeywords.includes("javascript"));
  assert.ok(body.keywordMatch.missingKeywords.includes("mongodb"));
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
  assert.ok(body.skillMatch && typeof body.skillMatch === "object");
  assert.ok(body.keywordMatch && typeof body.keywordMatch === "object");
  assert.equal(body.experienceMatch.score, 100);
  assert.equal(body.experienceMatch.weight, 0);
  assert.deepEqual(body.experienceMatch.feedback, ["Could not detect required experience from the job description"]);
  assert.equal(body.experienceMatch.candidateExperience, 3);
  assert.equal(body.experienceMatch.requiredExperience, 0);
  assert.equal(body.experienceMatch.experienceGap, 0);
  assert.deepEqual(
    body.evaluatorBreakdown.map((item) => item.key),
    ["experienceMatch"],
  );
  assert.equal(body.overallScore, 53);
  assert.equal(savedPayloads[0].aggregatedScore, 53);
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
    "score",
    "breakdown",
    "skillMatch",
    "keywordMatch",
    "experienceMatch",
    "consistencyMatch",
    "readabilityMatch",
    "impactMatch",
    "atsOptimization",
    "techStandard",
    "gapAnalysis",
    "classification",
    "isJDProvided",
    "mode",
    "verifiedLinks",
    "file",
    "evaluatorBreakdown",
    "overallScore",
  ]);
});

test("analyze resume returns cached result on cache hit and skips pipeline execution", async () => {
  let findCalled = false;
  let savedToDb = false;

  setResumeControllerDependencies({
    parseResume: async () => parsedResume,
    upsertResume: async (userId, payload) => {
      savedToDb = true;
      return {
        _id: "64f1f77bcf86cd7994390111",
        ...payload,
        user: userId,
      };
    },
    findCachedAnalysis: async (resumeHash, jdHash) => {
      findCalled = true;
      return {
        resumeHash,
        jdHash,
        score: 85,
        similarity: 85,
        summary: "Cached analysis summary",
        details: {
          score: 85,
          classification: { level: "Advanced", label: "Highly Qualified candidate" },
          breakdown: {
            skillMatch: { score: 90, weight: 0.4 },
            experienceMatch: { score: 80, weight: 0.4 }
          },
          gapAnalysis: { suggestions: [{ text: "Master GraphQL", priority: "Strategic" }] }
        },
        meta: {
          safeData: {
            name: "Ada Lovelace",
            skills: ["JavaScript", "React"]
          },
          verifiedLinks: []
        }
      };
    },
    saveCachedAnalysis: async () => ({})
  });

  const { status, body } = await postAnalyze({
    jobSkills: JSON.stringify(["JavaScript", "React"]),
    jobDescription: "Need JavaScript React developer.",
  });

  assert.equal(status, 200);
  assert.equal(body.success, true);
  assert.equal(body.score, 85);
  assert.equal(body.classification.level, "Advanced");
  assert.equal(body.resumeId, "64f1f77bcf86cd7994390111");
  assert.equal(findCalled, true);
  assert.equal(savedToDb, true);
  assert.deepEqual(body.gapAnalysis, { suggestions: [{ text: "Master GraphQL", priority: "Strategic" }] });
});

test("analyze resume saves to cache on cache miss", async () => {
  let saveCalled = false;
  let savedCacheData = null;

  setResumeControllerDependencies({
    parseResume: async () => parsedResume,
    upsertResume: async (userId, payload) => {
      return {
        _id: "64f1f77bcf86cd7994390111",
        ...payload,
        user: userId,
      };
    },
    findCachedAnalysis: async () => null,
    saveCachedAnalysis: async (cacheData) => {
      saveCalled = true;
      savedCacheData = cacheData;
      return {};
    }
  });

  const { status, body } = await postAnalyze({
    jobSkills: JSON.stringify(["JavaScript", "React"]),
    jobDescription: "Need JavaScript React developer.",
  });

  assert.equal(status, 200);
  assert.equal(saveCalled, true);
  assert.ok(savedCacheData.resumeHash);
  assert.ok(savedCacheData.jdHash);
  assert.equal(savedCacheData.score, body.overallScore);
});

test("analyzeResume rejects upload when user already has 3 resumes", async () => {
  const originalCount = Resume.countDocuments;
  Resume.countDocuments = async () => 3;

  try {
    const req = {
      file: { path: "/test" },
      user: { _id: "user1" }
    };
    let nextError = null;
    const next = (err) => {
      nextError = err;
    };

    await analyzeResume(req, {}, next);
    assert.ok(nextError);
    assert.equal(nextError.statusCode, 400);
    assert.equal(nextError.message, "Maximum limit of 3 resumes reached. Please delete an existing version to upload a new one.");
  } finally {
    Resume.countDocuments = originalCount;
  }
});

test("listResumes returns list of resumes for user", async () => {
  const dummyResumes = [
    { _id: "1", title: "Resume 1", user: "user1", isActive: true },
    { _id: "2", title: "Resume 2", user: "user1", isActive: false },
  ];
  const originalFind = Resume.find;
  Resume.find = () => ({
    select: () => ({
      sort: () => ({
        lean: async () => dummyResumes
      })
    })
  });

  try {
    const req = { user: { _id: "user1" } };
    let jsonResult = null;
    const res = {
      status: (code) => {
        assert.equal(code, 200);
        return {
          json: (data) => {
            jsonResult = data;
          }
        };
      }
    };

    await listResumes(req, res, () => {});
    assert.equal(jsonResult.success, true);
    assert.deepEqual(jsonResult.data, dummyResumes);
  } finally {
    Resume.find = originalFind;
  }
});

test("setActiveResume updates active status", async () => {
  const dummyResume = {
    _id: "1",
    user: "user1",
    isActive: false,
    save: async function() {
      this.isActive = true;
      return this;
    }
  };

  const originalFindOne = Resume.findOne;
  const originalUpdateMany = Resume.updateMany;
  
  Resume.findOne = async () => dummyResume;
  Resume.updateMany = async () => ({});

  try {
    const req = { params: { id: "1" }, user: { _id: "user1" } };
    let jsonResult = null;
    const res = {
      status: (code) => {
        assert.equal(code, 200);
        return {
          json: (data) => {
            jsonResult = data;
          }
        };
      }
    };

    await setActiveResume(req, res, () => {});
    assert.equal(jsonResult.success, true);
    assert.equal(jsonResult.data.isActive, true);
  } finally {
    Resume.findOne = originalFindOne;
    Resume.updateMany = originalUpdateMany;
  }
});

test("renameResume updates resume title", async () => {
  const dummyResume = {
    _id: "1",
    title: "New Title"
  };

  const originalFindOneAndUpdate = Resume.findOneAndUpdate;
  Resume.findOneAndUpdate = () => ({
    select: async () => dummyResume
  });

  try {
    const req = { params: { id: "1" }, body: { title: "New Title" }, user: { _id: "user1" } };
    let jsonResult = null;
    const res = {
      status: (code) => {
        assert.equal(code, 200);
        return {
          json: (data) => {
            jsonResult = data;
          }
        };
      }
    };

    await renameResume(req, res, () => {});
    assert.equal(jsonResult.success, true);
    assert.equal(jsonResult.data.title, "New Title");
  } finally {
    Resume.findOneAndUpdate = originalFindOneAndUpdate;
  }
});

test("deleteResume deletes document", async () => {
  const dummyResume = {
    _id: "1",
    user: "user1",
    isActive: false
  };

  const originalFindOne = Resume.findOne;
  const originalDeleteOne = Resume.deleteOne;
  
  Resume.findOne = async () => dummyResume;
  Resume.deleteOne = async () => ({});

  try {
    const req = { params: { id: "1" }, user: { _id: "user1" } };
    let jsonResult = null;
    const res = {
      status: (code) => {
        assert.equal(code, 200);
        return {
          json: (data) => {
            jsonResult = data;
          }
        };
      }
    };

    await deleteResume(req, res, () => {});
    assert.equal(jsonResult.success, true);
    assert.equal(jsonResult.message, "Resume deleted successfully");
  } finally {
    Resume.findOne = originalFindOne;
    Resume.deleteOne = originalDeleteOne;
  }
});

