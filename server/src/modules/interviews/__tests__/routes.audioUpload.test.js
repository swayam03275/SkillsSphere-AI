import { afterEach, describe, it, mock } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import express from "express";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import interviewRoutes from "../routes.js";
import InterviewSession from "../../../database/models/InterviewSession.js";
import QuestionBank from "../../../database/models/QuestionBank.js";
import User from "../../../database/models/User.js";
import globalErrorHandler from "../../../middleware/errorMiddleware.js";

process.env.JWT_SECRET = "test_secret_for_interview_audio_routes";
process.env.AI_LIMIT_MAX = "100";
process.env.NODE_ENV = "production";

const AUDIO_LIMIT_BYTES = 10 * 1024 * 1024;
const WEBM_HEADER = Buffer.from([0x1a, 0x45, 0xdf, 0xa3]);
const SESSION_ID = "64f1f77bcf86cd7994390aaa";
const OWNER_ID = new mongoose.Types.ObjectId("64f1f77bcf86cd7994390a01");
const OTHER_USER_ID = new mongoose.Types.ObjectId("64f1f77bcf86cd7994390b02");
const nativeFetch = globalThis.fetch.bind(globalThis);

const createUser = (overrides = {}) => ({
  _id: OWNER_ID,
  email: "student@example.com",
  name: "Student User",
  role: "student",
  ...overrides,
});

const createToken = (userId = OWNER_ID, options = {}) =>
  jwt.sign({ userId: userId.toString() }, process.env.JWT_SECRET, options);

const createWebmBuffer = (size = WEBM_HEADER.length) => {
  const buffer = Buffer.alloc(size);
  WEBM_HEADER.copy(buffer, 0);
  return buffer;
};

const createTestServer = async () => {
  const app = express();

  app.use(express.json());
  app.use("/api/interviews", interviewRoutes);
  app.use(globalErrorHandler);

  const server = http.createServer(app);

  return new Promise((resolve) => {
    server.listen(0, "127.0.0.1", () => {
      const { port } = server.address();
      resolve({
        baseUrl: `http://127.0.0.1:${port}`,
        close: () => new Promise((done) => server.close(done)),
      });
    });
  });
};

const postAnswer = async ({
  baseUrl,
  token = createToken(),
  sessionId = SESSION_ID,
  fields = {},
  file,
} = {}) => {
  const form = new FormData();

  for (const [key, value] of Object.entries(fields)) {
    form.append(key, value);
  }

  if (file) {
    form.append(
      file.fieldName || "audio",
      new Blob([file.buffer], { type: file.type }),
      file.name,
    );
  }

  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;

  return nativeFetch(`${baseUrl}/api/interviews/${sessionId}/answer`, {
    method: "POST",
    headers,
    body: form,
  });
};

const parseJson = async (response) => ({
  status: response.status,
  body: await response.json(),
});

const mockAuthenticatedUser = (user = createUser()) => {
  mock.method(User, "findById", () => ({
    select: async (projection) => {
      assert.equal(projection, "-password");
      return user;
    },
  }));
};

const mockAiServiceUnavailable = () => {
  const fetchMock = mock.method(globalThis, "fetch", async () => ({
    ok: false,
    status: 503,
    json: async () => ({}),
  }));

  return fetchMock;
};

const mockInterviewPipeline = ({
  ownerId = OWNER_ID,
  sessionFound = true,
} = {}) => {
  const questionId = new mongoose.Types.ObjectId("64f1f77bcf86cd7994390c03");
  const save = mock.fn(async () => {});
  const session = {
    _id: new mongoose.Types.ObjectId(SESSION_ID),
    userId: ownerId,
    status: "in_progress",
    currentQuestionIndex: 0,
    totalQuestions: 1,
    answers: [
      {
        questionId,
        questionText: "Explain closures in JavaScript.",
        scores: {},
        concepts: {
          expected: ["closures"],
          detected: [],
          missed: [],
        },
      },
    ],
    save,
  };
  const findQueries = [];
  const findOneMock = mock.method(InterviewSession, "findOne", async (query) => {
    findQueries.push(query);

    if (!sessionFound) return null;
    if (query.userId?.toString() !== ownerId.toString()) return null;

    return session;
  });
  const findByIdMock = mock.method(QuestionBank, "findById", async (id) => {
    assert.equal(id.toString(), questionId.toString());
    return {
      _id: questionId,
      expectedAnswer: "Closures preserve access to lexical scope.",
      expectedConcepts: ["closures"],
    };
  });

  return {
    findByIdMock,
    findOneMock,
    findQueries,
    save,
    session,
  };
};

const assertNoInterviewProcessing = () => {
  const findOneMock = mock.method(InterviewSession, "findOne", async () => {
    throw new Error("Interview lookup should not run for invalid uploads");
  });
  const findByIdMock = mock.method(QuestionBank, "findById", async () => {
    throw new Error("Question lookup should not run for invalid uploads");
  });

  return { findOneMock, findByIdMock };
};

describe("interview audio upload route security", () => {
  afterEach(() => {
    mock.restoreAll();
  });

  it("allows a valid authenticated owner to upload supported audio at exactly 10 MB", async () => {
    mockAuthenticatedUser();
    const pipeline = mockInterviewPipeline();
    const fetchMock = mockAiServiceUnavailable();
    const server = await createTestServer();

    try {
      const response = await postAnswer({
        baseUrl: server.baseUrl,
        fields: { transcript: "Closures keep access to lexical scope." },
        file: {
          name: "answer.webm",
          type: "audio/webm",
          buffer: createWebmBuffer(AUDIO_LIMIT_BYTES),
        },
      });
      const { status, body } = await parseJson(response);

      assert.equal(status, 200);
      assert.equal(body.success, true);
      assert.equal(body.message, "Answer submitted successfully");
      assert.equal(body.data.transcript, "Closures keep access to lexical scope.");
      assert.equal(pipeline.findOneMock.mock.calls.length, 1);
      assert.equal(pipeline.findQueries[0].userId.toString(), OWNER_ID.toString());
      assert.equal(pipeline.findByIdMock.mock.calls.length, 1);
      assert.equal(pipeline.save.mock.calls.length, 1);
      assert.equal(fetchMock.mock.calls.length, 1);
    } finally {
      await server.close();
    }
  });

  it("rejects non-audio and unsupported MIME uploads before interview processing", async () => {
    mockAuthenticatedUser();
    const processing = assertNoInterviewProcessing();
    const server = await createTestServer();

    try {
      const response = await postAnswer({
        baseUrl: server.baseUrl,
        file: {
          name: "notes.txt",
          type: "text/plain",
          buffer: Buffer.from("not audio"),
        },
      });
      const { status, body } = await parseJson(response);

      assert.equal(status, 400);
      assert.equal(body.success, false);
      assert.equal(body.message, "Unsupported audio file type");

      const unsupportedAudioResponse = await postAnswer({
        baseUrl: server.baseUrl,
        file: {
          name: "answer.aac",
          type: "audio/aac",
          buffer: Buffer.from("unsupported audio container"),
        },
      });
      const unsupportedAudio = await parseJson(unsupportedAudioResponse);

      assert.equal(unsupportedAudio.status, 400);
      assert.equal(unsupportedAudio.body.success, false);
      assert.equal(unsupportedAudio.body.message, "Unsupported audio file type");
      assert.equal(processing.findOneMock.mock.calls.length, 0);
      assert.equal(processing.findByIdMock.mock.calls.length, 0);
    } finally {
      await server.close();
    }
  });

  it("rejects renamed files that spoof an allowed audio MIME type", async () => {
    mockAuthenticatedUser();
    const processing = assertNoInterviewProcessing();
    const server = await createTestServer();

    try {
      const response = await postAnswer({
        baseUrl: server.baseUrl,
        file: {
          name: "payload.webm",
          type: "audio/webm",
          buffer: Buffer.from("I am not a WebM file"),
        },
      });
      const { status, body } = await parseJson(response);

      assert.equal(status, 400);
      assert.equal(body.success, false);
      assert.equal(body.message, "Unsupported audio file type");
      assert.equal(processing.findOneMock.mock.calls.length, 0);
      assert.equal(processing.findByIdMock.mock.calls.length, 0);
    } finally {
      await server.close();
    }
  });

  it("rejects oversized audio uploads with a safe response before business logic", async () => {
    mockAuthenticatedUser();
    const processing = assertNoInterviewProcessing();
    const server = await createTestServer();

    try {
      const response = await postAnswer({
        baseUrl: server.baseUrl,
        file: {
          name: "too-large.webm",
          type: "audio/webm",
          buffer: createWebmBuffer(AUDIO_LIMIT_BYTES + 1),
        },
      });
      const { status, body } = await parseJson(response);

      assert.equal(status, 413);
      assert.equal(body.success, false);
      assert.equal(body.message, "Audio file size must be 10 MB or less");
      assert.equal(processing.findOneMock.mock.calls.length, 0);
      assert.equal(processing.findByIdMock.mock.calls.length, 0);
    } finally {
      await server.close();
    }
  });

  it("returns validation errors for missing file and empty upload requests", async () => {
    mockAuthenticatedUser();
    const processing = assertNoInterviewProcessing();
    const server = await createTestServer();

    try {
      const missingResponse = await postAnswer({ baseUrl: server.baseUrl });
      const missing = await parseJson(missingResponse);

      assert.equal(missing.status, 400);
      assert.equal(missing.body.success, false);
      assert.equal(
        missing.body.message,
        "Either a transcript or audio file is required",
      );

      const wrongFieldResponse = await postAnswer({
        baseUrl: server.baseUrl,
        file: {
          fieldName: "voice",
          name: "answer.webm",
          type: "audio/webm",
          buffer: createWebmBuffer(),
        },
      });
      const wrongField = await parseJson(wrongFieldResponse);

      assert.equal(wrongField.status, 400);
      assert.equal(wrongField.body.success, false);
      assert.equal(wrongField.body.message, "Invalid audio upload");

      const emptyFileResponse = await postAnswer({
        baseUrl: server.baseUrl,
        file: {
          name: "empty.webm",
          type: "audio/webm",
          buffer: Buffer.alloc(0),
        },
      });
      const emptyFile = await parseJson(emptyFileResponse);

      assert.equal(emptyFile.status, 400);
      assert.equal(emptyFile.body.success, false);
      assert.equal(emptyFile.body.message, "Audio file cannot be empty");
      assert.equal(processing.findOneMock.mock.calls.length, 0);
      assert.equal(processing.findByIdMock.mock.calls.length, 0);
    } finally {
      await server.close();
    }
  });

  it("rejects unauthenticated and expired-token uploads before Multer or processing", async () => {
    const userLookup = mock.method(User, "findById", async () => {
      throw new Error("User lookup should not run without a valid token");
    });
    const processing = assertNoInterviewProcessing();
    const server = await createTestServer();

    try {
      const unauthenticatedResponse = await postAnswer({
        baseUrl: server.baseUrl,
        token: null,
        file: {
          name: "not-audio.txt",
          type: "text/plain",
          buffer: Buffer.from("would fail if Multer ran first"),
        },
      });
      const unauthenticated = await parseJson(unauthenticatedResponse);

      assert.equal(unauthenticated.status, 401);
      assert.match(unauthenticated.body.message, /not logged in/i);

      const expiredToken = createToken(OWNER_ID, { expiresIn: -1 });
      const expiredResponse = await postAnswer({
        baseUrl: server.baseUrl,
        token: expiredToken,
        file: {
          name: "answer.webm",
          type: "audio/webm",
          buffer: createWebmBuffer(),
        },
      });
      const expired = await parseJson(expiredResponse);

      assert.equal(expired.status, 401);
      assert.match(expired.body.message, /expired/i);

      const invalidTokenResponse = await postAnswer({
        baseUrl: server.baseUrl,
        token: "not-a-valid-jwt",
        file: {
          name: "answer.webm",
          type: "audio/webm",
          buffer: createWebmBuffer(),
        },
      });
      const invalidToken = await parseJson(invalidTokenResponse);

      assert.equal(invalidToken.status, 401);
      assert.match(invalidToken.body.message, /invalid token/i);
      assert.equal(userLookup.mock.calls.length, 0);
      assert.equal(processing.findOneMock.mock.calls.length, 0);
      assert.equal(processing.findByIdMock.mock.calls.length, 0);
    } finally {
      await server.close();
    }
  });

  it("prevents users from uploading audio to another user's interview", async () => {
    mockAuthenticatedUser(createUser({ _id: OTHER_USER_ID }));
    const pipeline = mockInterviewPipeline({ ownerId: OWNER_ID });
    const server = await createTestServer();

    try {
      const response = await postAnswer({
        baseUrl: server.baseUrl,
        token: createToken(OTHER_USER_ID),
        fields: {
          transcript: "Trying to answer another user's interview.",
          userId: OWNER_ID.toString(),
        },
        file: {
          name: "answer.webm",
          type: "audio/webm",
          buffer: createWebmBuffer(),
        },
      });
      const { status, body } = await parseJson(response);

      assert.equal(status, 404);
      assert.equal(body.success, false);
      assert.equal(body.message, "Active interview session not found");
      assert.equal(pipeline.findOneMock.mock.calls.length, 1);
      assert.equal(pipeline.findQueries[0].userId.toString(), OTHER_USER_ID.toString());
      assert.equal(pipeline.findByIdMock.mock.calls.length, 0);
      assert.equal(pipeline.save.mock.calls.length, 0);
      assert.equal(pipeline.session.currentQuestionIndex, 0);
      assert.equal(pipeline.session.answers[0].transcript, undefined);
    } finally {
      await server.close();
    }
  });
});
