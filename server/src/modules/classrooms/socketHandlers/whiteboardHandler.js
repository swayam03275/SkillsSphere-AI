import { getOrCreateRoomState, persistRoomState } from "../roomStateManager.js";

export const WHITEBOARD_ERROR_CODES = {
  INVALID_STROKE_PAYLOAD: "INVALID_STROKE_PAYLOAD",
  WHITEBOARD_PAYLOAD_TOO_LARGE: "WHITEBOARD_PAYLOAD_TOO_LARGE",
  CLEAR_CANVAS_FORBIDDEN: "CLEAR_CANVAS_FORBIDDEN",
};

const DEFAULT_MAX_WHITEBOARD_PAYLOAD_BYTES = 16 * 1024;
const DEFAULT_MAX_WHITEBOARD_POINTS = 1_000;
const DEFAULT_MAX_WHITEBOARD_DEPTH = 6;
const CLEAR_CANVAS_ROLES = new Set(["admin", "tutor"]);

const getPositiveIntEnv = (key, fallback) => {
  const value = Number(process.env[key]);
  return Number.isSafeInteger(value) && value > 0 ? value : fallback;
};

export const getWhiteboardLimits = () => ({
  maxPayloadBytes: getPositiveIntEnv(
    "MAX_WHITEBOARD_PAYLOAD_BYTES",
    DEFAULT_MAX_WHITEBOARD_PAYLOAD_BYTES,
  ),
  maxPoints: getPositiveIntEnv("MAX_WHITEBOARD_POINTS", DEFAULT_MAX_WHITEBOARD_POINTS),
  maxDepth: getPositiveIntEnv("MAX_WHITEBOARD_PAYLOAD_DEPTH", DEFAULT_MAX_WHITEBOARD_DEPTH),
});

const safeError = (errorCode, message) => ({
  errorCode,
  message,
});

const emitWhiteboardError = (socket, errorCode, message) => {
  socket.emit("whiteboard-error", safeError(errorCode, message));
};

const getPayloadSizeBytes = (value) => {
  try {
    return Buffer.byteLength(JSON.stringify(value), "utf8");
  } catch {
    return Infinity;
  }
};

const getNestedDepth = (value, seen = new WeakSet()) => {
  if (!value || typeof value !== "object") return 0;
  if (seen.has(value)) return Infinity;
  seen.add(value);

  const childValues = Array.isArray(value) ? value : Object.values(value);
  if (childValues.length === 0) return 1;

  return 1 + Math.max(...childValues.map((child) => getNestedDepth(child, seen)));
};

export const validateExcalidrawElements = (elements) => {
  const limits = getWhiteboardLimits();

  if (!Array.isArray(elements)) {
    return {
      isValid: false,
      error: safeError(
        WHITEBOARD_ERROR_CODES.INVALID_STROKE_PAYLOAD,
        "Invalid whiteboard payload.",
      ),
    };
  }

  if (getPayloadSizeBytes(elements) > limits.maxPayloadBytes) {
    return {
      isValid: false,
      error: safeError(
        WHITEBOARD_ERROR_CODES.WHITEBOARD_PAYLOAD_TOO_LARGE,
        "Whiteboard payload is too large.",
      ),
    };
  }

  if (getNestedDepth(elements) > limits.maxDepth) {
    return {
      isValid: false,
      error: safeError(
        WHITEBOARD_ERROR_CODES.INVALID_STROKE_PAYLOAD,
        "Invalid whiteboard payload.",
      ),
    };
  }

  if (elements.length > limits.maxPoints) {
    return {
      isValid: false,
      error: safeError(
        WHITEBOARD_ERROR_CODES.INVALID_STROKE_PAYLOAD,
        "Invalid whiteboard payload.",
      ),
    };
  }

  return { isValid: true, elements };
};

export const validateWhiteboardStrokePayload = (element) => {
  if (!element || typeof element !== "object" || Array.isArray(element)) {
    return {
      isValid: false,
      error: safeError(
        WHITEBOARD_ERROR_CODES.INVALID_STROKE_PAYLOAD,
        "Invalid whiteboard element payload."
      ),
    };
  }
  return { isValid: true, element };
};

export const canClearWhiteboard = (socket) =>
  CLEAR_CANVAS_ROLES.has(socket.data?.user?.role);

export default function registerWhiteboardHandler(io, socket) {
  // Excalidraw update event
  socket.on("excalidraw-update", async ({ roomId, elements }) => {
    if (!socket.data || socket.data.roomId !== roomId) {
      socket.emit("unauthorized", {
        message: "Cross-classroom action detected",
      });
      return;
    }

    const validation = validateExcalidrawElements(elements);
    if (!validation.isValid) {
      emitWhiteboardError(socket, validation.error.errorCode, validation.error.message);
      return;
    }

    if (elements.length === 0 && !canClearWhiteboard(socket)) {
      emitWhiteboardError(
        socket,
        WHITEBOARD_ERROR_CODES.CLEAR_CANVAS_FORBIDDEN,
        "You are not allowed to clear this whiteboard.",
      );
      return;
    }

    for (const element of elements) {
      const validation = validateWhiteboardStrokePayload(element);
      if (!validation.isValid) {
        emitWhiteboardError(socket, validation.error.errorCode, validation.error.message);
        return;
      }
    }

    const state = getOrCreateRoomState(roomId);
    // Excalidraw elements represent the full current state of the board
    state.whiteboard = elements;
    persistRoomState(roomId);

    socket.to(roomId).emit("excalidraw-update", { elements });
  });

  // Excalidraw pointer update event
  socket.on("excalidraw-pointer", async ({ roomId, pointer }) => {
    if (!socket.data || socket.data.roomId !== roomId) {
      return;
    }
    // Broadcast pointer to other users
    socket.to(roomId).emit("excalidraw-pointer", {
      pointer,
      senderId: socket.id,
      senderName: socket.data.user?.name || "Participant"
    });
  });

  // Clear canvas event
  socket.on("clear-canvas", async ({ roomId }) => {
    if (!socket.data || socket.data.roomId !== roomId) {
      socket.emit("unauthorized", {
        message: "Cross-classroom action detected",
      });
      return;
    }

    if (!canClearWhiteboard(socket)) {
      emitWhiteboardError(
        socket,
        WHITEBOARD_ERROR_CODES.CLEAR_CANVAS_FORBIDDEN,
        "You are not allowed to clear this whiteboard.",
      );
      return;
    }

    const state = getOrCreateRoomState(roomId);
    state.whiteboard = [];
    persistRoomState(roomId);
    socket.to(roomId).emit("clear-canvas");
  });
}
