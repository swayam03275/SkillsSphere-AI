import fs from "fs";
import fsPromises from "fs/promises";

const HEADER_READ_BYTES = 8192;

/** PDF files begin with "%PDF" (hex 25 50 44 46) */
const isPdfSignature = (buffer) =>
  buffer.length >= 4 &&
  buffer[0] === 0x25 &&
  buffer[1] === 0x50 &&
  buffer[2] === 0x44 &&
  buffer[3] === 0x46;

/** DOCX is an OOXML package (ZIP archive) */
const isZipSignature = (buffer) =>
  buffer.length >= 4 &&
  buffer[0] === 0x50 &&
  buffer[1] === 0x4b &&
  (buffer[2] === 0x03 || buffer[2] === 0x05 || buffer[2] === 0x07) &&
  (buffer[3] === 0x04 || buffer[3] === 0x06 || buffer[3] === 0x08);

/** Legacy Microsoft Word (.doc) OLE compound document */
const isOleSignature = (buffer) =>
  buffer.length >= 8 &&
  buffer[0] === 0xd0 &&
  buffer[1] === 0xcf &&
  buffer[2] === 0x11 &&
  buffer[3] === 0xe0 &&
  buffer[4] === 0xa1 &&
  buffer[5] === 0xb1 &&
  buffer[6] === 0x1a &&
  buffer[7] === 0xe1;

/**
 * Plain text must not be a binary document in disguise and should not contain
 * null bytes or excessive control characters in the sampled header region.
 */
const isPlainTextContent = (buffer) => {
  if (!buffer.length) return false;
  if (isPdfSignature(buffer) || isZipSignature(buffer) || isOleSignature(buffer)) {
    return false;
  }

  const sample = buffer.subarray(0, Math.min(buffer.length, HEADER_READ_BYTES));
  let controlChars = 0;

  for (let i = 0; i < sample.length; i += 1) {
    const byte = sample[i];
    if (byte === 0) return false;
    if (byte === 9 || byte === 10 || byte === 13) continue;
    if (byte < 32 || byte === 127) controlChars += 1;
  }

  return controlChars / sample.length <= 0.05;
};

const EXTENSION_SIGNATURE_CHECKS = {
  ".pdf": {
    matches: isPdfSignature,
    mismatchMessage:
      "The file is not a valid PDF. Only authentic PDF documents are accepted.",
  },
  ".docx": {
    matches: isZipSignature,
    mismatchMessage:
      "The file is not a valid DOCX document. Only authentic Word (.docx) files are accepted.",
  },
  ".doc": {
    matches: isOleSignature,
    mismatchMessage:
      "The file is not a valid DOC document. Only authentic Word (.doc) files are accepted.",
  },
  ".txt": {
    matches: isPlainTextContent,
    mismatchMessage:
      "The file is not valid plain text. Rename or convert the file before uploading.",
  },
};

const getExtension = (originalName) =>
  (originalName || "").toLowerCase().match(/\.[^.]+$/)?.[0];

const sampleHeader = (buffer) => {
  const data = Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer);
  return data.subarray(0, Math.min(data.length, HEADER_READ_BYTES));
};

const validateHeaderForExtension = (header, extension) => {
  const rule = EXTENSION_SIGNATURE_CHECKS[extension];
  if (!rule) {
    return {
      valid: false,
      message:
        "Unsupported file type. Only PDF, DOC, DOCX, and TXT files are allowed.",
    };
  }

  if (!header.length) {
    return {
      valid: false,
      message: "The uploaded file is empty.",
    };
  }

  if (!rule.matches(header)) {
    return { valid: false, message: rule.mismatchMessage };
  }

  return { valid: true };
};

/**
 * Validate magic bytes from an in-memory buffer (before any disk write).
 * @param {Buffer} buffer
 * @param {string} originalName
 * @returns {{ valid: boolean, message?: string }}
 */
export const validateResumeBufferSignatureSync = (buffer, originalName) => {
  const extension = getExtension(originalName);

  if (!extension) {
    return {
      valid: false,
      message:
        "Unsupported file type. Only PDF, DOC, DOCX, and TXT files are allowed.",
    };
  }

  if (!buffer || !buffer.length) {
    return {
      valid: false,
      message: "The uploaded file is empty.",
    };
  }

  return validateHeaderForExtension(sampleHeader(buffer), extension);
};

/**
 * Read the first HEADER_READ_BYTES of a file without blocking the event loop.
 * @param {string} filePath
 * @returns {Promise<Buffer>}
 */
const readFileHeader = async (filePath) => {
  const fh = await fsPromises.open(filePath, "r");
  try {
    const buffer = Buffer.alloc(HEADER_READ_BYTES);
    const { bytesRead } = await fh.read(buffer, 0, HEADER_READ_BYTES, 0);
    return buffer.subarray(0, bytesRead);
  } finally {
    await fh.close();
  }
};

/**
 * Validate magic bytes from a file already on disk using non-blocking async I/O.
 * @param {string} filePath
 * @param {string} originalName
 * @returns {Promise<{ valid: boolean, message?: string }>}
 */
export const validateResumeFileSignature = async (filePath, originalName) => {
  const extension = getExtension(originalName);

  if (!extension) {
    return {
      valid: false,
      message:
        "Unsupported file type. Only PDF, DOC, DOCX, and TXT files are allowed.",
    };
  }

  let header;
  try {
    header = await readFileHeader(filePath);
  } catch {
    return {
      valid: false,
      message: "Unable to read the uploaded file for validation.",
    };
  }

  return validateHeaderForExtension(header, extension);
};

/** @deprecated Use validateResumeFileSignature (async) */
export const validateResumeFileSignatureSync = (filePath, originalName) => {
  const extension = getExtension(originalName);
  if (!extension) return { valid: false, message: "Unsupported file type. Only PDF, DOC, DOCX, and TXT files are allowed." };
  let header;
  try {
    const fd = fs.openSync(filePath, "r");
    try {
      const buf = Buffer.alloc(HEADER_READ_BYTES);
      const bytesRead = fs.readSync(fd, buf, 0, HEADER_READ_BYTES, 0);
      header = buf.subarray(0, bytesRead);
    } finally {
      fs.closeSync(fd);
    }
  } catch {
    return { valid: false, message: "Unable to read the uploaded file for validation." };
  }
  return validateHeaderForExtension(header, extension);
};

export const __testables = {
  isPdfSignature,
  isZipSignature,
  isOleSignature,
  isPlainTextContent,
  validateHeaderForExtension,
  sampleHeader,
};
