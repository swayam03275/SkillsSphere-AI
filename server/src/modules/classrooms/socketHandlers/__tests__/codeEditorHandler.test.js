import { afterEach, beforeEach, describe, it, mock } from "node:test";
import assert from "node:assert/strict";
import axios from "axios";
import registerCodeEditorHandler, {
  resetCodeExecutionRateLimits,
} from "../codeEditorHandler.js";

const restoreEnvValue = (key, value) => {
  if (value === undefined) {
    delete process.env[key];
    return;
  }

  process.env[key] = value;
};

const createSocketHarness = () => {
  const handlers = new Map();
  const roomEmits = [];
  const socketEmits = [];
  const broadcastEmits = [];
  const socket = {
    id: "socket-1",
    data: {
      roomId: "room-1",
      user: {
        _id: "user-1",
        name: "Test User",
      },
    },
    on(event, handler) {
      handlers.set(event, handler);
    },
    emit(event, payload) {
      socketEmits.push({ event, payload });
    },
    to(roomId) {
      return {
        emit(event, payload) {
          broadcastEmits.push({ roomId, event, payload });
        },
      };
    },
  };
  const io = {
    to(roomId) {
      return {
        emit(event, payload) {
          roomEmits.push({ roomId, event, payload });
        },
      };
    },
  };

  registerCodeEditorHandler(io, socket);

  return {
    broadcastEmits,
    handlers,
    roomEmits,
    socket,
    socketEmits,
  };
};

describe("codeEditorHandler execution security", () => {
  let previousLimitMax;
  let previousLimitWindow;

  beforeEach(() => {
    previousLimitMax = process.env.CODE_EXECUTION_RATE_LIMIT_MAX;
    previousLimitWindow = process.env.CODE_EXECUTION_RATE_LIMIT_WINDOW_MS;
    resetCodeExecutionRateLimits();
  });

  afterEach(() => {
    mock.restoreAll();
    resetCodeExecutionRateLimits();
    restoreEnvValue("CODE_EXECUTION_RATE_LIMIT_MAX", previousLimitMax);
    restoreEnvValue("CODE_EXECUTION_RATE_LIMIT_WINDOW_MS", previousLimitWindow);
    delete process.env.MAX_CODE_INPUT_BYTES;
  });

  it("rejects unsupported language without starting execution", async () => {
    const postMock = mock.method(axios, "post", async () => {
      throw new Error("should not call Piston for unsupported languages");
    });
    const { handlers, roomEmits } = createSocketHarness();

    await handlers.get("execute-code-request")({
      roomId: "room-1",
      language: "ruby",
      code: "puts 'hello'",
    });

    assert.equal(postMock.mock.calls.length, 0);
    assert.equal(roomEmits.some((emit) => emit.event === "execution-started"), false);
    assert.equal(roomEmits.length, 1);
    assert.equal(roomEmits[0].event, "execution-result");
    assert.equal(roomEmits[0].payload.errorCode, "UNSUPPORTED_LANGUAGE");
  });

  it("rejects oversized code without starting execution", async () => {
    process.env.MAX_CODE_INPUT_BYTES = "5";
    const postMock = mock.method(axios, "post", async () => {
      throw new Error("should not call Piston for oversized code");
    });
    const { handlers, roomEmits } = createSocketHarness();

    await handlers.get("execute-code-request")({
      roomId: "room-1",
      language: "javascript",
      code: "console.log('too large')",
    });

    assert.equal(postMock.mock.calls.length, 0);
    assert.equal(roomEmits.some((emit) => emit.event === "execution-started"), false);
    assert.equal(roomEmits[0].payload.errorCode, "CODE_INPUT_TOO_LARGE");
  });

  it("rate-limits repeated code execution attempts", async () => {
    process.env.CODE_EXECUTION_RATE_LIMIT_MAX = "1";
    process.env.CODE_EXECUTION_RATE_LIMIT_WINDOW_MS = "60000";
    mock.method(axios, "post", async () => ({
      data: {
        run: {
          code: 0,
          output: "ok\n",
        },
      },
    }));
    const { handlers, roomEmits } = createSocketHarness();

    await handlers.get("execute-code-request")({
      roomId: "room-1",
      language: "javascript",
      code: "console.log('ok')",
    });
    await handlers.get("execute-code-request")({
      roomId: "room-1",
      language: "javascript",
      code: "console.log('again')",
    });

    const resultEvents = roomEmits.filter((emit) => emit.event === "execution-result");
    assert.equal(resultEvents.length, 2);
    assert.equal(resultEvents[0].payload.isError, false);
    assert.equal(resultEvents[1].payload.isError, true);
    assert.equal(resultEvents[1].payload.errorCode, "RATE_LIMITED");
  });

  it("preserves the valid classroom execution flow", async () => {
    mock.method(axios, "post", async () => ({
      data: {
        run: {
          code: 0,
          output: "hello\n",
        },
      },
    }));
    const { handlers, roomEmits } = createSocketHarness();

    await handlers.get("execute-code-request")({
      roomId: "room-1",
      language: "javascript",
      code: "console.log('hello')",
    });

    assert.deepEqual(
      roomEmits.map((emit) => emit.event),
      ["execution-started", "execution-result"],
    );
    assert.equal(roomEmits[1].payload.output, "hello\n");
    assert.equal(roomEmits[1].payload.isError, false);
    assert.equal(roomEmits[1].payload.senderName, "Test User");
  });

  it("keeps cross-classroom execution unauthorized", async () => {
    const { handlers, socketEmits, roomEmits } = createSocketHarness();

    await handlers.get("execute-code-request")({
      roomId: "other-room",
      language: "javascript",
      code: "console.log('hello')",
    });

    assert.equal(socketEmits.length, 1);
    assert.equal(socketEmits[0].event, "unauthorized");
    assert.equal(roomEmits.length, 0);
  });
});
