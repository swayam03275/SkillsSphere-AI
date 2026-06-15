import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  saveInterviewAnswerDraft,
  loadInterviewAnswerDraft,
  clearInterviewAnswerDraft,
} from "../interviewSessionStorage";

const DRAFT_STORAGE_KEY = "skillssphere.mockInterview.answerDrafts";

describe("interview answer draft storage", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it("saves and restores a draft for the active session question", () => {
    saveInterviewAnswerDraft({
      sessionId: "session-1",
      currentIndex: 0,
      questionId: "q1",
      answer: "React state is component memory.",
    });

    expect(
      loadInterviewAnswerDraft({
        sessionId: "session-1",
        currentIndex: 0,
        questionId: "q1",
      }),
    ).toMatchObject({
      sessionId: "session-1",
      currentIndex: 0,
      questionId: "q1",
      answer: "React state is component memory.",
    });
  });

  it("keeps drafts scoped by session and question", () => {
    saveInterviewAnswerDraft({
      sessionId: "session-1",
      currentIndex: 0,
      questionId: "q1",
      answer: "First answer",
    });

    expect(
      loadInterviewAnswerDraft({
        sessionId: "session-2",
        currentIndex: 0,
        questionId: "q1",
      }),
    ).toBeNull();
    expect(
      loadInterviewAnswerDraft({
        sessionId: "session-1",
        currentIndex: 1,
        questionId: "q2",
      }),
    ).toBeNull();
  });

  it("clears a saved draft after submission", () => {
    const draftRef = {
      sessionId: "session-1",
      currentIndex: 0,
      questionId: "q1",
    };

    saveInterviewAnswerDraft({
      ...draftRef,
      answer: "Submitted answer",
    });
    clearInterviewAnswerDraft(draftRef);

    expect(loadInterviewAnswerDraft(draftRef)).toBeNull();
  });

  it("removes a draft when the answer is emptied", () => {
    const draftRef = {
      sessionId: "session-1",
      currentIndex: 0,
      questionId: "q1",
    };

    saveInterviewAnswerDraft({
      ...draftRef,
      answer: "Temporary answer",
    });
    saveInterviewAnswerDraft({
      ...draftRef,
      answer: "   ",
    });

    expect(loadInterviewAnswerDraft(draftRef)).toBeNull();
  });

  it("fails safely and clears corrupted draft storage", () => {
    localStorage.setItem(DRAFT_STORAGE_KEY, "{not-json");

    expect(
      loadInterviewAnswerDraft({
        sessionId: "session-1",
        currentIndex: 0,
        questionId: "q1",
      }),
    ).toBeNull();
    expect(localStorage.getItem(DRAFT_STORAGE_KEY)).toBeNull();
  });
});
