import { describe, it, mock } from "node:test";
import assert from "node:assert/strict";

describe("formatJobResponse", () => {
  it("omits result until completed", async () => {
    const { formatJobResponse } = await import("../service.js");

    const queued = formatJobResponse({
      _id: "abc123",
      type: "RESUME_ANALYZE",
      status: "queued",
      progress: { percent: 0, stage: "queued" },
      result: { score: 90 },
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    assert.equal(queued.status, "queued");
    assert.equal(queued.result, undefined);

    const done = formatJobResponse({
      _id: "abc123",
      type: "RESUME_ANALYZE",
      status: "completed",
      progress: { percent: 100, stage: "completed" },
      result: { score: 90 },
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    assert.equal(done.result.score, 90);
  });
});
