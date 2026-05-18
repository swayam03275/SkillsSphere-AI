import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "fs/promises";
import path from "path";
import {
  validateAndPersistResumeFile,
  removeUploadedFile,
} from "../uploadResume.js";

const uploadDirectory = path.join(process.cwd(), "src", "uploads");

const runMiddleware = (middleware, req) =>
  new Promise((resolve, reject) => {
    const res = {
      statusCode: 200,
      body: null,
      status(code) {
        this.statusCode = code;
        return this;
      },
      json(payload) {
        this.body = payload;
        resolve({ statusCode: this.statusCode, body: payload });
      },
    };

    middleware(req, res, (err) => {
      if (err) reject(err);
      else resolve({ statusCode: 200, body: null, nextCalled: true });
    });
  });

describe("validateAndPersistResumeFile middleware", () => {
  it("returns 400 and never writes spoofed pdf to uploads", async () => {
    const before = new Set(await fs.readdir(uploadDirectory).catch(() => []));

    const req = {
      file: {
        buffer: Buffer.from("plain text content only"),
        originalname: "resume.pdf",
        mimetype: "application/pdf",
        size: 22,
      },
    };

    const result = await runMiddleware(validateAndPersistResumeFile, req);

    assert.equal(result.statusCode, 400);
    assert.equal(result.body.success, false);
    assert.match(result.body.message, /not a valid PDF/i);
    assert.equal(req.file, undefined);

    const after = new Set(await fs.readdir(uploadDirectory).catch(() => []));
    assert.equal(after.size, before.size);
    for (const name of after) {
      if (!before.has(name)) {
        await fs.unlink(path.join(uploadDirectory, name)).catch(() => {});
      }
    }
  });

  it("persists authentic pdf to uploads after validation", async () => {
    const req = {
      file: {
        buffer: Buffer.from("%PDF-1.4\n%EOF"),
        originalname: "resume.pdf",
        mimetype: "application/pdf",
        size: 12,
      },
    };

    const result = await runMiddleware(validateAndPersistResumeFile, req);

    assert.equal(result.nextCalled, true);
    assert.ok(req.file?.path);
    assert.ok(req.file?.filename?.endsWith(".pdf"));

    const onDisk = await fs.readFile(req.file.path);
    assert.equal(onDisk.subarray(0, 5).toString(), "%PDF-");

    removeUploadedFile(req.file.path);
  });
});
