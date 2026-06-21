import assert from "node:assert/strict";
import test, { afterEach, mock } from "node:test";
import mongoose from "mongoose";
import InterviewSession from "../../../database/models/InterviewSession.js";
import {
  getBookmarkedQuestions,
  updateQuestionBookmark,
} from "../service.js";

afterEach(() => {
  mock.restoreAll();
});

const userId = new mongoose.Types.ObjectId("64f1f77bcf86cd7994390a01");
const sessionId = new mongoose.Types.ObjectId("64f1f77bcf86cd7994390aaa");
const questionId = new mongoose.Types.ObjectId("64f1f77bcf86cd7994390c03");

const createSessionDoc = (overrides = {}) => ({
  _id: sessionId,
  userId,
  answers: [
    {
      questionId,
      questionText: "What are React hooks?",
      bookmarked: false,
    },
  ],
  save: mock.fn(async () => {}),
  ...overrides,
});

test("updateQuestionBookmark - sets bookmark state for an owned question", async () => {
  const session = createSessionDoc();
  const findOneMock = mock.method(InterviewSession, "findOne", async (query) => {
    assert.equal(query._id, sessionId.toString());
    assert.equal(query.userId, userId);
    return session;
  });

  const result = await updateQuestionBookmark({
    sessionId: sessionId.toString(),
    userId,
    questionId: questionId.toString(),
    bookmarked: true,
  });

  assert.equal(result.bookmarked, true);
  assert.equal(session.answers[0].bookmarked, true);
  assert.equal(session.save.mock.callCount(), 1);
  assert.deepEqual(session.save.mock.calls[0].arguments[0], { validateModifiedOnly: true });
  assert.equal(findOneMock.mock.callCount(), 1);
});

test("updateQuestionBookmark - toggles bookmark when no explicit state is provided", async () => {
  const session = createSessionDoc({
    answers: [
      {
        questionId,
        questionText: "What are React hooks?",
        bookmarked: true,
      },
    ],
  });
  mock.method(InterviewSession, "findOne", async () => session);

  const result = await updateQuestionBookmark({
    sessionId: sessionId.toString(),
    userId,
    questionId: questionId.toString(),
  });

  assert.equal(result.bookmarked, false);
  assert.equal(session.answers[0].bookmarked, false);
});

test("updateQuestionBookmark - rejects missing sessions and unknown questions", async () => {
  mock.method(InterviewSession, "findOne", async () => null);

  await assert.rejects(
    updateQuestionBookmark({
      sessionId: sessionId.toString(),
      userId,
      questionId: questionId.toString(),
      bookmarked: true,
    }),
    /interview session not found/i,
  );

  mock.restoreAll();
  mock.method(InterviewSession, "findOne", async () => createSessionDoc({ answers: [] }));

  await assert.rejects(
    updateQuestionBookmark({
      sessionId: sessionId.toString(),
      userId,
      questionId: questionId.toString(),
      bookmarked: true,
    }),
    /question not found/i,
  );
});

test("getBookmarkedQuestions - returns flattened bookmarked answers", async () => {
  const secondQuestionId = new mongoose.Types.ObjectId("64f1f77bcf86cd7994390d04");
  const sessions = [
    {
      _id: sessionId,
      topic: "react",
      difficulty: "medium",
      status: "completed",
      overallScore: 82,
      createdAt: new Date("2026-06-01T10:00:00.000Z"),
      completedAt: new Date("2026-06-01T10:30:00.000Z"),
      answers: [
        {
          questionId,
          questionText: "What are React hooks?",
          transcript: "Hooks share stateful logic.",
          bookmarked: true,
          scores: { technical: 80 },
        },
        {
          questionId: secondQuestionId,
          questionText: "What is JSX?",
          bookmarked: false,
        },
      ],
    },
  ];

  const findMock = mock.method(InterviewSession, "find", (query) => {
    assert.equal(query.userId, userId);
    assert.equal(query["answers.bookmarked"], true);
    return {
      select: () => ({
        sort: () => ({
          limit: () => ({
            lean: async () => sessions,
          }),
        }),
      }),
    };
  });

  const bookmarks = await getBookmarkedQuestions(userId);

  assert.equal(findMock.mock.callCount(), 1);
  assert.equal(bookmarks.length, 1);
  assert.equal(bookmarks[0].questionText, "What are React hooks?");
  assert.equal(bookmarks[0].topic, "react");
  assert.equal(bookmarks[0].bookmarked, true);
});
