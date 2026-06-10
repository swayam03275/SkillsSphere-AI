// @ts-nocheck
/**
 * @typedef {Object} InterviewMessage
 * @property {string} role - The role of the sender, e.g. "candidate", "ai", "system"
 * @property {string} content - The content of the message
 * @property {number} timestamp - The time the message was sent
 */

/**
 * @typedef {Object} InterviewSession
 * @property {string} sessionId - The unique ID of the interview session
 * @property {number} currentIndex - The current question index
 * @property {InterviewMessage[]} messages - Chat history/messages exchanged
 * @property {string} [activeTopic] - The topic of the current interview question
 * @property {string} [lastAiResponse] - The last AI generated response for rehydration
 * @property {number} timestamp - The time the session context was last updated
 */

/**
 * @typedef {Object} HydrationPayload
 * @property {string} sessionId
 * @property {number} currentIndex
 * @property {InterviewMessage[]} previousMessages
 * @property {string} [activeTopic]
 * @property {string} [lastAiResponse]
 */

const STORAGE_KEY = "mockInterviewSession";
const SESSION_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes

/**
 * Saves the interview session context to sessionStorage
 * @param {InterviewSession} session 
 */
export function saveInterviewSession(session) {
  try {
    session.timestamp = Date.now();
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  } catch (error) {
    logger.error("Error saving interview session:", error);
  }
}

/**
 * Loads the interview session context from sessionStorage
 * @returns {InterviewSession | null}
 */
export function loadInterviewSession() {
  try {
    const data = sessionStorage.getItem(STORAGE_KEY);
    if (!data) return null;
    
    const session = JSON.parse(data);
    if (isSessionExpired(session)) {
      clearInterviewSession();
      return null;
    }
    
    return session;
  } catch (error) {
    logger.error("Error loading interview session (data might be corrupted):", error);
    clearInterviewSession();
    return null;
  }
}

/**
 * Clears the interview session context from sessionStorage
 */
export function clearInterviewSession() {
  sessionStorage.removeItem(STORAGE_KEY);
}

/**
 * Checks if the loaded session has expired based on inactivity timeout
 * @param {InterviewSession} session 
 * @returns {boolean}
 */
export function isSessionExpired(session) {
  if (!session || !session.timestamp) return true;
  return (Date.now() - session.timestamp) > SESSION_TIMEOUT_MS;
}
