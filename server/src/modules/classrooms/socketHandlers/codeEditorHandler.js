import { getOrCreateRoomState, persistRoomState } from "../socket.js";
import {
  executeCode,
  validateCodeExecutionRequest,
} from "../../../utils/codeExecutor.js";

const CODE_EXECUTION_RATE_LIMITED = "RATE_LIMITED";
const DEFAULT_EXECUTION_RATE_LIMIT_MAX = 5;
const DEFAULT_EXECUTION_RATE_LIMIT_WINDOW_MS = 60_000;
const executionAttempts = new Map();

const getRateLimitConfig = () => {
  const maxAttempts = Number(process.env.CODE_EXECUTION_RATE_LIMIT_MAX);
  const windowMs = Number(process.env.CODE_EXECUTION_RATE_LIMIT_WINDOW_MS);

  return {
    maxAttempts:
      Number.isSafeInteger(maxAttempts) && maxAttempts > 0
        ? maxAttempts
        : DEFAULT_EXECUTION_RATE_LIMIT_MAX,
    windowMs:
      Number.isSafeInteger(windowMs) && windowMs > 0
        ? windowMs
        : DEFAULT_EXECUTION_RATE_LIMIT_WINDOW_MS,
  };
};

const getExecutionRateLimitKey = (socket, roomId) => {
  const userId = socket.data?.user?._id || socket.data?.user?.id || socket.id;
  return `${roomId}:${userId}`;
};

export const resetCodeExecutionRateLimits = () => {
  executionAttempts.clear();
};

export const checkCodeExecutionRateLimit = (socket, roomId, now = Date.now()) => {
  const { maxAttempts, windowMs } = getRateLimitConfig();
  const key = getExecutionRateLimitKey(socket, roomId);
  const currentAttempt = executionAttempts.get(key);

  if (!currentAttempt || now >= currentAttempt.resetAt) {
    executionAttempts.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true };
  }

  if (currentAttempt.count >= maxAttempts) {
    return {
      allowed: false,
      retryAfterMs: currentAttempt.resetAt - now,
    };
  }

  currentAttempt.count += 1;
  return { allowed: true };
};

const emitExecutionResult = (io, roomId, socket, result) => {
  io.to(roomId).emit("execution-result", {
    output: result.output,
    isError: result.isError,
    errorCode: result.errorCode,
    senderName: socket.data.user?.name || "Participant",
  });
};

export default function registerCodeEditorHandler(io, socket) {
  // Code change event
  socket.on("code-change", async ({ roomId, code }) => {
    if (!socket.data || socket.data.roomId !== roomId) {
      socket.emit("unauthorized", {
        message: "Cross-classroom action detected",
      });
      return;
    }

    if (typeof code !== "string") {
      socket.emit("error", { message: "Code must be a string" });
      return;
    }
    if (code.length > 100000) {
      socket.emit("error", { message: "Code length exceeds maximum allowed size (100KB)" });
      return;
    }

    const state = getOrCreateRoomState(roomId);
    state.code = code;
    persistRoomState(roomId);
    socket.to(roomId).emit("code-change", { code });
  });

  // Code cursor event
  socket.on("code-cursor", ({ roomId, cursorPosition }) => {
    if (!socket.data || socket.data.roomId !== roomId) {
      socket.emit("unauthorized", {
        message: "Cross-classroom action detected",
      });
      return;
    }

    if (!cursorPosition || (typeof cursorPosition !== "object" && typeof cursorPosition !== "number")) {
      socket.emit("error", { message: "Invalid cursor position payload" });
      return;
    }

    socket.to(roomId).emit("code-cursor", {
      cursorPosition,
      senderId: socket.id,
      senderName: socket.data.user?.name || "Participant",
    });
  });

  // Execute code event
  socket.on("execute-code-request", async ({ roomId, code, language }) => {
    if (!socket.data || socket.data.roomId !== roomId) {
      socket.emit("unauthorized", {
        message: "Cross-classroom action detected",
      });
      return;
    }

    if (typeof code !== "string" || typeof language !== "string") {
      socket.emit("error", { message: "Code and language must be strings" });
      return;
    }

    if (code.length > 50000) {
      socket.emit("error", { message: "Code length for execution exceeds 50KB" });
      return;
    }

    if (language.length > 50) {
      socket.emit("error", { message: "Language string is too long" });
      return;
    }

    const validation = validateCodeExecutionRequest(language, code);
    if (!validation.isValid) {
      emitExecutionResult(io, roomId, socket, validation.result);
      return;
    }

    const rateLimit = checkCodeExecutionRateLimit(socket, roomId);
    if (!rateLimit.allowed) {
      emitExecutionResult(io, roomId, socket, {
        output: `${CODE_EXECUTION_RATE_LIMITED}: Too many code execution attempts. Please wait before trying again.`,
        isError: true,
        errorCode: CODE_EXECUTION_RATE_LIMITED,
      });
      return;
    }

    // Broadcast that execution has started
    io.to(roomId).emit("execution-started", {
      senderName: socket.data.user?.name || "Participant",
    });

    // Execute code via API
    const result = await executeCode(language, code);

    // Broadcast result
    emitExecutionResult(io, roomId, socket, result);
  });
}
