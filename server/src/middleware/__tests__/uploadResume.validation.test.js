import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "fs/promises";
import path from "path";
import {
  fileFilter,
  validateAndPersistResumeFile,
  persistValidatedResumeFile,
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

const runFileFilter = (file) =>
  new Promise((resolve) => {
    fileFilter(null, file, (error, accepted) => {
      resolve({ error, accepted });
    });
  });

describe("fileFilter", () => {
  it("rejects allowed extensions when the mimetype is incorrect", async () => {
    const result = await runFileFilter({
      originalname: "resume.docx",
      mimetype: "application/octet-stream",
    });

    assert.equal(result.accepted, false);
    assert.equal(result.error?.code, "INVALID_FILE_TYPE");
  });

  it("rejects files with unsupported extensions", async () => {
    const result = await runFileFilter({
      originalname: "resume.exe",
      mimetype: "application/octet-stream",
    });

    assert.equal(result.accepted, false);
    assert.equal(result.error?.code, "INVALID_FILE_TYPE");
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

    assert.equal(result.statusCode, 415);
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

    await removeUploadedFile(req.file.path);
  });
});

describe("persistValidatedResumeFile", () => {
  it("is an async function and resolves with filename and filePath", async () => {
    // Verify the function itself is declared async
    assert.equal(
      persistValidatedResumeFile.constructor.name,
      "AsyncFunction",
      "persistValidatedResumeFile should be an async function"
    );

    const { filename, filePath } = await persistValidatedResumeFile(
      Buffer.from("%PDF-1.4\n%EOF"),
      "test.pdf"
    );
    assert.ok(filename.endsWith(".pdf"));
    assert.ok(filePath.includes("uploads"));

    // Verify file is actually on disk
    const onDisk = await fs.readFile(filePath);
    assert.equal(onDisk.subarray(0, 5).toString(), "%PDF-");

    await removeUploadedFile(filePath);
  });
});

describe("removeUploadedFile", () => {
  it("asynchronously removes a file that exists", async () => {
    // Write a temp file to remove
    const tmpPath = path.join(uploadDirectory, `__test-remove-${Date.now()}.txt`);
    await fs.writeFile(tmpPath, "temp");

    // Confirm it exists
    await assert.doesNotReject(fs.access(tmpPath));

    await removeUploadedFile(tmpPath);

    // Confirm it is gone — readFile should fail after deletion
    let fileStillExists = false;
    try {
      await fs.readFile(tmpPath);
      fileStillExists = true;
    } catch {
      fileStillExists = false;
    }
    assert.equal(fileStillExists, false, "file should have been deleted");
  });

  it("does not throw when file does not exist", async () => {
    const fakePath = path.join(uploadDirectory, "__nonexistent-file.pdf");
    await assert.doesNotReject(removeUploadedFile(fakePath));
  });

  it("does not throw when called with null or undefined", async () => {
    await assert.doesNotReject(removeUploadedFile(null));
    await assert.doesNotReject(removeUploadedFile(undefined));
  });
});
