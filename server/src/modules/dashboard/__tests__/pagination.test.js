import test, { mock, afterEach } from "node:test";
import assert from "node:assert/strict";
import AnalysisHistory from "../../../database/models/AnalysisHistory.js";
import CoverLetter from "../../../database/models/CoverLetter.js";
import Resume from "../../../database/models/Resume.js";
import { getHistory } from "../controller.js";
import { getCoverLetters } from "../../coverLetters/controller.js";
import { listResumes } from "../../resumes/controller.js";

const invokeController = (controller, req) =>
  new Promise((resolve, reject) => {
    const res = {
      statusCode: 200,
      status(code) {
        this.statusCode = code;
        return this;
      },
      json(payload) {
        resolve({ statusCode: this.statusCode, body: payload });
      },
    };
    controller(req, res, (err) => {
      if (err) {
        reject(err);
      }
    });
  });

afterEach(() => {
  mock.restoreAll();
});

test("getHistory - returns paginated analysis history successfully", async () => {
  const mockHistory = [{ _id: "h1", score: 80 }, { _id: "h2", score: 90 }];
  
  const mockFind = () => ({
    sort: () => ({
      skip: () => ({
        limit: () => ({
          lean: async () => mockHistory
        })
      })
    })
  });

  mock.method(AnalysisHistory, "find", mockFind);
  mock.method(AnalysisHistory, "countDocuments", async () => 20);

  const req = {
    user: { _id: "user123" },
    query: { page: "2", limit: "5" }
  };

  const result = await invokeController(getHistory, req);

  assert.equal(result.statusCode, 200);
  assert.equal(result.body.success, true);
  assert.deepEqual(result.body.data, mockHistory);
  assert.deepEqual(result.body.pagination, {
    page: 2,
    limit: 5,
    total: 20,
    pages: 4
  });
});

test("getCoverLetters - returns paginated cover letters successfully", async () => {
  const mockLetters = [{ _id: "cl1", content: "Letter 1" }];

  const mockFind = () => ({
    sort: () => ({
      skip: () => ({
        limit: () => ({
          lean: async () => mockLetters
        })
      })
    })
  });

  mock.method(CoverLetter, "find", mockFind);
  mock.method(CoverLetter, "countDocuments", async () => 15);

  const req = {
    user: { _id: "user123" },
    query: { page: "1", limit: "10" }
  };

  const result = await invokeController(getCoverLetters, req);

  assert.equal(result.statusCode, 200);
  assert.equal(result.body.success, true);
  assert.deepEqual(result.body.data, mockLetters);
  assert.equal(result.body.totalCount, 15);
  assert.equal(result.body.totalPages, 2);
  assert.equal(result.body.currentPage, 1);
});

test("listResumes - returns paginated resumes successfully", async () => {
  const mockResumes = [{ _id: "r1", title: "Resume 1" }];

  const mockFind = () => ({
    select: () => ({
      sort: () => ({
        skip: () => ({
          limit: () => ({
            lean: async () => mockResumes
          })
        })
      })
    })
  });

  mock.method(Resume, "find", mockFind);
  mock.method(Resume, "countDocuments", async () => 3);

  const req = {
    user: { _id: "user123" },
    query: { page: "1", limit: "2" }
  };

  const result = await invokeController(listResumes, req);

  assert.equal(result.statusCode, 200);
  assert.equal(result.body.success, true);
  assert.deepEqual(result.body.data, mockResumes);
  assert.equal(result.body.totalCount, 3);
  assert.equal(result.body.totalPages, 2);
  assert.equal(result.body.currentPage, 1);
});
