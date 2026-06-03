import { getOrCreateRoomState } from "../socket.js";

export const WHITEBOARD_ERROR_CODES = {
  INVALID_STROKE_PAYLOAD: "INVALID_STROKE_PAYLOAD",
  WHITEBOARD_PAYLOAD_TOO_LARGE: "WHITEBOARD_PAYLOAD_TOO_LARGE",
  CLEAR_CANVAS_FORBIDDEN: "CLEAR_CANVAS_FORBIDDEN",
};

const DEFAULT_MAX_WHITEBOARD_PAYLOAD_BYTES = 16 * 1024;
const DEFAULT_MAX_WHITEBOARD_POINTS = 1_000;
const DEFAULT_MAX_WHITEBOARD_DEPTH = 6;
const MAX_TEXT_LENGTH = 500;
const MAX_STRING_LENGTH = 1_000;
const ALLOWED_STROKE_TYPES = new Set(["freehand", "shape", "text"]);
const ALLOWED_SHAPES = new Set(["line", "rect", "circle", "arrow"]);
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

const isFiniteCoordinate = (value) =>
  typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 1;

const isSafeString = (value, maxLength = MAX_STRING_LENGTH) =>
  typeof value === "string" && value.length > 0 && value.length <= maxLength;

const isSafeColor = (value) =>
  typeof value === "string" && /^#[0-9a-fA-F]{3}([0-9a-fA-F]{3})?$/.test(value);

const isSafeWidth = (value) =>
  typeof value === "number" && Number.isFinite(value) && value >= 1 && value <= 100;

const isPoint = (value) =>
  value &&
  typeof value === "object" &&
  !Array.isArray(value) &&
  isFiniteCoordinate(value.x) &&
  isFiniteCoordinate(value.y);

const hasOnlyAllowedKeys = (value, allowedKeys) =>
  Object.keys(value).every((key) => allowedKeys.has(key));

const validateFreehandStroke = (strokeData, limits) => {
  const allowedKeys = new Set([
    "type",
    "x",
    "y",
    "prevX",
    "prevY",
    "points",
    "color",
    "width",
    "isEraser",
    "actionId",
  ]);

  if (!hasOnlyAllowedKeys(strokeData, allowedKeys)) return false;
  if (strokeData.color !== undefined && !isSafeColor(strokeData.color)) return false;
  if (strokeData.width !== undefined && !isSafeWidth(strokeData.width)) return false;
  if (strokeData.isEraser !== undefined && typeof strokeData.isEraser !== "boolean") return false;
  if (strokeData.actionId !== undefined && !isSafeString(strokeData.actionId, 128)) return false;

  if (strokeData.points !== undefined) {
    return (
      Array.isArray(strokeData.points) &&
      strokeData.points.length > 0 &&
      strokeData.points.length <= limits.maxPoints &&
      strokeData.points.every(isPoint)
    );
  }

  return (
    isFiniteCoordinate(strokeData.x) &&
    isFiniteCoordinate(strokeData.y) &&
    (strokeData.prevX === undefined || isFiniteCoordinate(strokeData.prevX)) &&
    (strokeData.prevY === undefined || isFiniteCoordinate(strokeData.prevY))
  );
};

const validateShapeStroke = (strokeData) => {
  const allowedKeys = new Set([
    "type",
    "shape",
    "startX",
    "startY",
    "endX",
    "endY",
    "color",
    "width",
    "actionId",
  ]);

  return (
    hasOnlyAllowedKeys(strokeData, allowedKeys) &&
    ALLOWED_SHAPES.has(strokeData.shape) &&
    isFiniteCoordinate(strokeData.startX) &&
    isFiniteCoordinate(strokeData.startY) &&
    isFiniteCoordinate(strokeData.endX) &&
    isFiniteCoordinate(strokeData.endY) &&
    (strokeData.color === undefined || isSafeColor(strokeData.color)) &&
    (strokeData.width === undefined || isSafeWidth(strokeData.width)) &&
    (strokeData.actionId === undefined || isSafeString(strokeData.actionId, 128))
  );
};

const validateTextStroke = (strokeData) => {
  const allowedKeys = new Set(["type", "text", "x", "y", "color", "size", "actionId"]);

  return (
    hasOnlyAllowedKeys(strokeData, allowedKeys) &&
    isSafeString(strokeData.text, MAX_TEXT_LENGTH) &&
    isFiniteCoordinate(strokeData.x) &&
    isFiniteCoordinate(strokeData.y) &&
    (strokeData.color === undefined || isSafeColor(strokeData.color)) &&
    (strokeData.size === undefined || isSafeWidth(strokeData.size)) &&
    (strokeData.actionId === undefined || isSafeString(strokeData.actionId, 128))
  );
};

export const validateWhiteboardStrokePayload = (strokeData) => {
  const limits = getWhiteboardLimits();

  if (!strokeData || typeof strokeData !== "object" || Array.isArray(strokeData)) {
    return {
      isValid: false,
      error: safeError(
        WHITEBOARD_ERROR_CODES.INVALID_STROKE_PAYLOAD,
        "Invalid whiteboard stroke payload.",
      ),
    };
  }

  if (getPayloadSizeBytes(strokeData) > limits.maxPayloadBytes) {
    return {
      isValid: false,
      error: safeError(
        WHITEBOARD_ERROR_CODES.WHITEBOARD_PAYLOAD_TOO_LARGE,
        "Whiteboard stroke payload is too large.",
      ),
    };
  }

  if (getNestedDepth(strokeData) > limits.maxDepth) {
    return {
      isValid: false,
      error: safeError(
        WHITEBOARD_ERROR_CODES.INVALID_STROKE_PAYLOAD,
        "Invalid whiteboard stroke payload.",
      ),
    };
  }

  if (!ALLOWED_STROKE_TYPES.has(strokeData.type)) {
    return {
      isValid: false,
      error: safeError(
        WHITEBOARD_ERROR_CODES.INVALID_STROKE_PAYLOAD,
        "Invalid whiteboard stroke payload.",
      ),
    };
  }

  const isValid =
    (strokeData.type === "freehand" && validateFreehandStroke(strokeData, limits)) ||
    (strokeData.type === "shape" && validateShapeStroke(strokeData)) ||
    (strokeData.type === "text" && validateTextStroke(strokeData));

  if (!isValid) {
    return {
      isValid: false,
      error: safeError(
        WHITEBOARD_ERROR_CODES.INVALID_STROKE_PAYLOAD,
        "Invalid whiteboard stroke payload.",
      ),
    };
  }

  return { isValid: true, strokeData };
};

const optimizeStrokePoints = (points) => {
  if (!Array.isArray(points) || points.length < 3) return points;
  const optimized = [points[0]];
  for (let i = 1; i < points.length - 1; i += 1) {
    const current = points[i];
    const last = optimized[optimized.length - 1];
    if (
      current &&
      last &&
      typeof current.x === "number" &&
      typeof current.y === "number" &&
      typeof last.x === "number" &&
      typeof last.y === "number"
    ) {
      const dx = current.x - last.x;
      const dy = current.y - last.y;
      const distSq = dx * dx + dy * dy;
      if (distSq > 0.000025) { // 0.005 squared distance
        optimized.push(current);
      }
    }
  }
  optimized.push(points[points.length - 1]);
  return optimized;
};

export const canClearWhiteboard = (socket) =>
  CLEAR_CANVAS_ROLES.has(socket.data?.user?.role);

export default function registerWhiteboardHandler(io, socket) {
  // Draw stroke event
  socket.on("draw-stroke", ({ roomId, strokeData }) => {
    if (!socket.data || socket.data.roomId !== roomId) {
      socket.emit("unauthorized", {
        message: "Cross-classroom action detected",
      });
      return;
    }

    const validation = validateWhiteboardStrokePayload(strokeData);
    if (!validation.isValid) {
      emitWhiteboardError(
        socket,
        validation.error.errorCode,
        validation.error.message,
      );
      return;
    }

    const validatedStroke = { ...validation.strokeData };
    if (validatedStroke.points && Array.isArray(validatedStroke.points)) {
      validatedStroke.points = optimizeStrokePoints(validatedStroke.points);
    }

    const payload = {
      strokeData: validatedStroke,
      sender: socket.data.user,
    };

    const state = getOrCreateRoomState(roomId);
    if (state.whiteboard.length >= 2000) {
      state.whiteboard.shift();
    }
    state.whiteboard.push(payload);

    socket.to(roomId).emit("draw-stroke", payload);
  });

  // Clear canvas event
  socket.on("clear-canvas", ({ roomId }) => {
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
    socket.to(roomId).emit("clear-canvas");
  });
}
