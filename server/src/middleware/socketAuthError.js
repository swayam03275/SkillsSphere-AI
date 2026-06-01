export const SOCKET_AUTH_ERROR_CODES = {
  missingToken: "SOCKET_AUTH_MISSING_TOKEN",
  invalidToken: "SOCKET_AUTH_INVALID_TOKEN",
};

export const getSocketAuthErrorMessage = (error, fallbackMessage = "Socket authentication failed") => {
  if (error instanceof Error && typeof error.message === "string" && error.message.trim()) {
    return error.message;
  }

  if (typeof error === "string" && error.trim()) {
    return error;
  }

  return fallbackMessage;
};

export const createSocketAuthError = (message, code) => {
  const error = new Error(message);
  error.data = { code };
  return error;
};