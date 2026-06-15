// @ts-nocheck

const STORAGE_KEY = "skillssphere.mockInterview.backup";
const DRAFT_STORAGE_KEY = "skillssphere.mockInterview.answerDrafts";

const canUseStorage = () => typeof window !== "undefined" && window.localStorage;

const normalizeBackup = (backup) => {
  if (!backup || typeof backup !== "object" || !backup.sessionId) {
    return null;
  }

  return {
    sessionId: String(backup.sessionId),
    currentIndex: Math.max(0, Number(backup.currentIndex || 0)),
    answer: typeof backup.answer === "string" ? backup.answer : "",
    transcripts:
      backup.transcripts && typeof backup.transcripts === "object"
        ? backup.transcripts
        : {},
    messages: Array.isArray(backup.messages) ? backup.messages : [],
    elapsedTime: Math.max(0, Number(backup.elapsedTime || 0)),
    uploadStatus: backup.uploadStatus || "idle",
    currentQuestion: backup.currentQuestion || null,
    savedAt: Number(backup.savedAt || Date.now()),
  };
};

export const saveInterviewSession = (backup) => {
  if (!canUseStorage()) return;

  try {
    const normalized = normalizeBackup({
      ...backup,
      savedAt: Date.now(),
    });

    if (normalized) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
    }
  } catch {
    // Recovery backup is best-effort and must never interrupt the interview.
  }
};

export const loadInterviewSession = () => {
  if (!canUseStorage()) return null;

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return normalizeBackup(JSON.parse(raw));
  } catch {
    window.localStorage.removeItem(STORAGE_KEY);
    return null;
  }
};

export const clearInterviewSession = () => {
  if (!canUseStorage()) return;

  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Ignore cleanup failures.
  }
};

const getDraftKey = ({ sessionId, currentIndex, questionId }) => {
  if (!sessionId) return null;

  const normalizedIndex = Math.max(0, Number(currentIndex || 0));
  return [
    String(sessionId),
    String(questionId || "unknown-question"),
    normalizedIndex,
  ].join(":");
};

const readDrafts = () => {
  if (!canUseStorage()) return {};

  try {
    const raw = window.localStorage.getItem(DRAFT_STORAGE_KEY);
    if (!raw) return {};

    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? parsed
      : {};
  } catch {
    window.localStorage.removeItem(DRAFT_STORAGE_KEY);
    return {};
  }
};

const writeDrafts = (drafts) => {
  if (!canUseStorage()) return;

  try {
    window.localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(drafts));
  } catch {
    // Draft persistence is best-effort and must not block typing.
  }
};

export const saveInterviewAnswerDraft = ({
  sessionId,
  currentIndex,
  questionId,
  answer,
}) => {
  const draftKey = getDraftKey({ sessionId, currentIndex, questionId });
  if (!draftKey) return;

  const normalizedAnswer = typeof answer === "string" ? answer : "";
  const drafts = readDrafts();

  if (!normalizedAnswer.trim()) {
    delete drafts[draftKey];
  } else {
    drafts[draftKey] = {
      sessionId: String(sessionId),
      currentIndex: Math.max(0, Number(currentIndex || 0)),
      questionId: questionId ? String(questionId) : null,
      answer: normalizedAnswer,
      savedAt: Date.now(),
    };
  }

  writeDrafts(drafts);
};

export const loadInterviewAnswerDraft = ({
  sessionId,
  currentIndex,
  questionId,
}) => {
  const draftKey = getDraftKey({ sessionId, currentIndex, questionId });
  if (!draftKey) return null;

  const draft = readDrafts()[draftKey];
  if (!draft || typeof draft.answer !== "string") return null;

  return {
    sessionId: String(draft.sessionId || sessionId),
    currentIndex: Math.max(0, Number(draft.currentIndex || currentIndex || 0)),
    questionId: draft.questionId ? String(draft.questionId) : null,
    answer: draft.answer,
    savedAt: Number(draft.savedAt || Date.now()),
  };
};

export const clearInterviewAnswerDraft = ({
  sessionId,
  currentIndex,
  questionId,
} = {}) => {
  if (!canUseStorage()) return;

  if (!sessionId) {
    try {
      window.localStorage.removeItem(DRAFT_STORAGE_KEY);
    } catch {
      // Ignore cleanup failures.
    }
    return;
  }

  const draftKey = getDraftKey({ sessionId, currentIndex, questionId });
  if (!draftKey) return;

  const drafts = readDrafts();
  delete drafts[draftKey];
  writeDrafts(drafts);
};
