import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  saveInterviewAnswerDraft,
  loadInterviewAnswerDraft,
  clearInterviewAnswerDraft,
  saveInterviewSession,
  loadInterviewSession,
  clearInterviewSession,
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

const SESSION_KEY = "skillssphere.mockInterview.backup";

describe("interview session backup", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it("saveInterviewSession stores normalized backup under the session key", () => {
    saveInterviewSession({
      sessionId: "session-x",
      currentIndex: 2,
      answer: "Mock answer content",
      transcripts: { q1: "transcript text" },
      messages: [{ id: "m1", text: "hello" }],
      elapsedTime: 120000,
    });

    const stored = localStorage.getItem(SESSION_KEY);
    expect(stored).not.toBeNull();
    const parsed = JSON.parse(stored!);
    expect(parsed.sessionId).toBe("session-x");
    expect(parsed.currentIndex).toBe(2);
    expect(parsed.answer).toBe("Mock answer content");
  });

  it("loadInterviewSession returns null when no session is stored", () => {
    expect(loadInterviewSession()).toBeNull();
  });

  it("loadInterviewSession correctly parses and returns a stored backup", () => {
    const backup = {
      sessionId: "session-y",
      currentIndex: 5,
      answer: "Stored answer",
      transcripts: { q2: "transcript 2" },
      messages: [{ id: "m2", text: "stored message" }],
      elapsedTime: 90000,
      uploadStatus: "uploading",
      currentQuestion: "q2",
      savedAt: Date.now(),
    };
    localStorage.setItem(SESSION_KEY, JSON.stringify(backup));

    const result = loadInterviewSession();
    expect(result).not.toBeNull();
    expect(result!.sessionId).toBe("session-y");
    expect(result!.currentIndex).toBe(5);
    expect(result!.answer).toBe("Stored answer");
    expect(result!.transcripts).toEqual({ q2: "transcript 2" });
    expect(result!.messages).toEqual([{ id: "m2", text: "stored message" }]);
    expect(result!.elapsedTime).toBe(90000);
  });

  it("loadInterviewSession returns null and clears storage for invalid backup", () => {
    localStorage.setItem(SESSION_KEY, "{not-json");
    expect(loadInterviewSession()).toBeNull();
    expect(localStorage.getItem(SESSION_KEY)).toBeNull();
  });

  it("clearInterviewSession removes the session storage key", () => {
    localStorage.setItem(SESSION_KEY, JSON.stringify({ sessionId: "session-z" }));
    clearInterviewSession();
    expect(localStorage.getItem(SESSION_KEY)).toBeNull();
  });

  it("saveInterviewSession normalizes invalid fields gracefully", () => {
    saveInterviewSession({
      sessionId: "session-w",
      // @ts-expect-error intentionally pass invalid types
      currentIndex: "not-a-number",
      answer: 123,
      transcripts: "not-an-object",
      messages: "not-an-array",
      elapsedTime: null,
    });

    const stored = localStorage.getItem(SESSION_KEY);
    const parsed = JSON.parse(stored!);
    expect(parsed.sessionId).toBe("session-w");
    // NaN becomes null in JSON; elapsedTime with null becomes 0 via Math.max
    expect(parsed.currentIndex).toBeNull(); // NaN serializes to null in JSON
    expect(parsed.elapsedTime).toBe(0); // normalized from null
    expect(parsed.answer).toBe(""); // normalized
    expect(parsed.transcripts).toEqual({}); // normalized
    expect(parsed.messages).toEqual([]); // normalized
    expect(parsed.elapsedTime).toBe(0); // normalized
  });

  it("clearInterviewAnswerDraft with no params clears all drafts", () => {
    saveInterviewAnswerDraft({
      sessionId: "session-1",
      currentIndex: 0,
      questionId: "q1",
      answer: "Draft 1",
    });
    saveInterviewAnswerDraft({
      sessionId: "session-2",
      currentIndex: 0,
      questionId: "q1",
      answer: "Draft 2",
    });

    clearInterviewAnswerDraft();

    expect(localStorage.getItem(DRAFT_STORAGE_KEY)).toBeNull();
  });
});
