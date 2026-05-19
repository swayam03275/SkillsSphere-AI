import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "fs/promises";
import os from "os";
import path from "path";
import {
  validateResumeFileSignature,
  validateResumeBufferSignatureSync,
  __testables,
} from "../validateFileSignature.js";

const { isPdfSignature, isZipSignature, isOleSignature, isPlainTextContent } =
  __testables;

const writeTempFile = async (name, content) => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "resume-sig-"));
  const filePath = path.join(dir, name);
  await fs.writeFile(filePath, content);
  return { filePath, dir };
};

const cleanupDir = async (dir) => {
  await fs.rm(dir, { recursive: true, force: true });
};

describe("magic byte helpers", () => {
  it("detects PDF signature", () => {
    assert.equal(isPdfSignature(Buffer.from("%PDF-1.4\n")), true);
    assert.equal(isPdfSignature(Buffer.from("not a pdf")), false);
  });

  it("detects ZIP/DOCX signature", () => {
    assert.equal(isZipSignature(Buffer.from([0x50, 0x4b, 0x03, 0x04])), true);
    assert.equal(isZipSignature(Buffer.from("%PDF-1.4")), false);
  });

  it("detects OLE/DOC signature", () => {
    const ole = Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]);
    assert.equal(isOleSignature(ole), true);
    assert.equal(isOleSignature(Buffer.from("plain text")), false);
  });

  it("rejects plain text that is actually PDF bytes", () => {
    assert.equal(isPlainTextContent(Buffer.from("%PDF-1.4 fake")), false);
  });

  it("accepts genuine plain text", () => {
    assert.equal(
      isPlainTextContent(Buffer.from("John Doe\nSoftware Engineer\nSkills: JS")),
      true
    );
  });
});

describe("validateResumeBufferSignatureSync", () => {
  it("rejects a .txt file renamed to .pdf from buffer", () => {
    const fakePdf = Buffer.from("This is only plain text pretending to be a resume.");
    const result = validateResumeBufferSignatureSync(fakePdf, "resume.pdf");
    assert.equal(result.valid, false);
    assert.match(result.message, /not a valid PDF/i);
  });

  it("accepts a buffer with a real PDF header", () => {
    const realPdf = Buffer.from("%PDF-1.4\n1 0 obj\n<<>>\nendobj\n");
    const result = validateResumeBufferSignatureSync(realPdf, "resume.pdf");
    assert.equal(result.valid, true);
  });

  it("accepts a .txt buffer with plain text content", () => {
    const txt = Buffer.from("Name: Jane\nEmail: jane@example.com");
    const result = validateResumeBufferSignatureSync(txt, "resume.txt");
    assert.equal(result.valid, true);
  });

  it("rejects empty buffers", () => {
    const result = validateResumeBufferSignatureSync(Buffer.alloc(0), "empty.pdf");
    assert.equal(result.valid, false);
    assert.match(result.message, /empty/i);
  });
});

describe("validateResumeFileSignature (disk)", () => {
  it("rejects a .txt file renamed to .pdf on disk", async () => {
    const fakePdf = "This is only plain text pretending to be a resume.";
    const { filePath, dir } = await writeTempFile("fake.pdf", fakePdf);

    try {
      const result = await validateResumeFileSignature(filePath, "resume.pdf");
      assert.equal(result.valid, false);
      assert.match(result.message, /not a valid PDF/i);
    } finally {
      await cleanupDir(dir);
    }
  });

  it("accepts a file with a real PDF header on disk", async () => {
    const { filePath, dir } = await writeTempFile(
      "real.pdf",
      "%PDF-1.4\n1 0 obj\n<<>>\nendobj\n"
    );

    try {
      const result = await validateResumeFileSignature(filePath, "resume.pdf");
      assert.equal(result.valid, true);
    } finally {
      await cleanupDir(dir);
    }
  });
});
