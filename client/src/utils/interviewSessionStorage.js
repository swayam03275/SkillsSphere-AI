const STORAGE_KEY = "skillssphere.mockInterview.backup";

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
