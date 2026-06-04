import { afterEach, beforeEach, describe, it } from "node:test";
import assert from "node:assert/strict";
import registerWhiteboardHandler, {
  WHITEBOARD_ERROR_CODES,
  validateWhiteboardStrokePayload,
} from "../whiteboardHandler.js";
import {
  clearRoomState,
  getOrCreateRoomState,
  getRoomState,
} from "../../socket.js";

const restoreEnvValue = (key, value) => {
  if (value === undefined) {
    delete process.env[key];
    return;
  }

  process.env[key] = value;
};

const validStroke = (overrides = {}) => ({
  type: "freehand",
  x: 0.5,
  y: 0.5,
  prevX: 0.4,
  prevY: 0.4,
  color: "#38bdf8",
  width: 4,
  isEraser: false,
  actionId: "action-1",
  ...overrides,
});

const createSocketHarness = ({
  roomId = "room-a",
  role = "student",
  socketId = "socket-1",
} = {}) => {
  const handlers = new Map();
  const socketEmits = [];
  const broadcastEmits = [];
  const socket = {
    id: socketId,
    data: {
      roomId,
      user: {
        id: "user-1",
        name: "Test User",
        role,
      },
    },
    on(event, handler) {
      handlers.set(event, handler);
    },
    emit(event, payload) {
      socketEmits.push({ event, payload });
    },
    to(targetRoomId) {
      return {
        emit(event, payload) {
          broadcastEmits.push({ roomId: targetRoomId, event, payload });
        },
      };
    },
  };

  registerWhiteboardHandler({}, socket);

  return {
    broadcastEmits,
    handlers,
    socket,
    socketEmits,
  };
};

describe("whiteboardHandler security", () => {
  let previousPayloadLimit;
  let previousPointLimit;
  let previousDepthLimit;

  beforeEach(() => {
    previousPayloadLimit = process.env.MAX_WHITEBOARD_PAYLOAD_BYTES;
    previousPointLimit = process.env.MAX_WHITEBOARD_POINTS;
    previousDepthLimit = process.env.MAX_WHITEBOARD_PAYLOAD_DEPTH;
    clearRoomState("room-a");
    clearRoomState("room-b");
  });

  afterEach(() => {
    clearRoomState("room-a");
    clearRoomState("room-b");
    restoreEnvValue("MAX_WHITEBOARD_PAYLOAD_BYTES", previousPayloadLimit);
    restoreEnvValue("MAX_WHITEBOARD_POINTS", previousPointLimit);
    restoreEnvValue("MAX_WHITEBOARD_PAYLOAD_DEPTH", previousDepthLimit);
  });

  it("broadcasts valid drawing events only to the socket classroom room", () => {
    const { handlers, broadcastEmits } = createSocketHarness({ roomId: "room-a" });

    handlers.get("draw-stroke")({
      roomId: "room-a",
      strokeData: validStroke(),
    });

    assert.equal(broadcastEmits.length, 1);
    assert.equal(broadcastEmits[0].roomId, "room-a");
    assert.equal(broadcastEmits[0].event, "draw-stroke");
    assert.equal(getRoomState("room-a").whiteboard.length, 1);
    assert.equal(getRoomState("room-b"), undefined);
  });

  it("blocks forged room IDs from modifying another classroom whiteboard", () => {
    getOrCreateRoomState("room-b").whiteboard.push({
      strokeData: validStroke({ actionId: "existing" }),
      sender: { id: "other-user" },
    });
    const { handlers, socketEmits, broadcastEmits } = createSocketHarness({
      roomId: "room-a",
    });

    handlers.get("draw-stroke")({
      roomId: "room-b",
      strokeData: validStroke({ actionId: "forged" }),
    });

    assert.equal(socketEmits.length, 1);
    assert.equal(socketEmits[0].event, "unauthorized");
    assert.equal(broadcastEmits.length, 0);
    assert.equal(getRoomState("room-a"), undefined);
    assert.equal(getRoomState("room-b").whiteboard.length, 1);
  });

  it("rejects oversized stroke payloads without broadcasting", () => {
    process.env.MAX_WHITEBOARD_PAYLOAD_BYTES = "80";
    const { handlers, socketEmits, broadcastEmits } = createSocketHarness();

    handlers.get("draw-stroke")({
      roomId: "room-a",
      strokeData: validStroke({ actionId: "x".repeat(200) }),
    });

    assert.equal(broadcastEmits.length, 0);
    assert.equal(getRoomState("room-a"), undefined);
    assert.equal(socketEmits.length, 1);
    assert.equal(socketEmits[0].event, "whiteboard-error");
    assert.equal(
      socketEmits[0].payload.errorCode,
      WHITEBOARD_ERROR_CODES.WHITEBOARD_PAYLOAD_TOO_LARGE,
    );
  });

  it("rejects malformed stroke data without broadcasting", () => {
    const malformedStrokes = [
      null,
      [],
      { type: "freehand", x: "0.5", y: 0.5 },
      { type: "freehand", points: [{ x: 0.1 }] },
      { type: "shape", shape: "polygon", startX: 0, startY: 0, endX: 1, endY: 1 },
      { type: "text", text: "", x: 0.5, y: 0.5 },
      { type: "freehand", x: 0.5, y: 0.5, unexpected: "field" },
    ];

    for (const strokeData of malformedStrokes) {
      clearRoomState("room-a");
      const { handlers, socketEmits, broadcastEmits } = createSocketHarness();

      handlers.get("draw-stroke")({
        roomId: "room-a",
        strokeData,
      });

      assert.equal(broadcastEmits.length, 0);
      assert.equal(getRoomState("room-a"), undefined);
      assert.equal(socketEmits[0].event, "whiteboard-error");
      assert.equal(
        socketEmits[0].payload.errorCode,
        WHITEBOARD_ERROR_CODES.INVALID_STROKE_PAYLOAD,
      );
    }
  });

  it("rejects excessive point count and deeply nested payloads", () => {
    process.env.MAX_WHITEBOARD_POINTS = "2";
    process.env.MAX_WHITEBOARD_PAYLOAD_DEPTH = "3";

    const pointValidation = validateWhiteboardStrokePayload({
      type: "freehand",
      points: [
        { x: 0.1, y: 0.1 },
        { x: 0.2, y: 0.2 },
        { x: 0.3, y: 0.3 },
      ],
      color: "#38bdf8",
      width: 4,
    });
    const depthValidation = validateWhiteboardStrokePayload({
      type: "freehand",
      x: 0.1,
      y: 0.1,
      metadata: { a: { b: { c: 1 } } },
    });

    assert.equal(pointValidation.isValid, false);
    assert.equal(
      pointValidation.error.errorCode,
      WHITEBOARD_ERROR_CODES.INVALID_STROKE_PAYLOAD,
    );
    assert.equal(depthValidation.isValid, false);
    assert.equal(
      depthValidation.error.errorCode,
      WHITEBOARD_ERROR_CODES.INVALID_STROKE_PAYLOAD,
    );
  });

  it("allows authorized users to clear the canvas", () => {
    getOrCreateRoomState("room-a").whiteboard.push({
      strokeData: validStroke(),
      sender: { id: "user-1" },
    });
    const { handlers, broadcastEmits, socketEmits } = createSocketHarness({
      roomId: "room-a",
      role: "tutor",
    });

    handlers.get("clear-canvas")({ roomId: "room-a" });

    assert.equal(socketEmits.length, 0);
    assert.equal(getRoomState("room-a").whiteboard.length, 0);
    assert.equal(broadcastEmits.length, 1);
    assert.equal(broadcastEmits[0].roomId, "room-a");
    assert.equal(broadcastEmits[0].event, "clear-canvas");
  });

  it("blocks unauthorized users from clearing the canvas", () => {
    getOrCreateRoomState("room-a").whiteboard.push({
      strokeData: validStroke(),
      sender: { id: "user-1" },
    });
    const { handlers, broadcastEmits, socketEmits } = createSocketHarness({
      roomId: "room-a",
      role: "student",
    });

    handlers.get("clear-canvas")({ roomId: "room-a" });

    assert.equal(getRoomState("room-a").whiteboard.length, 1);
    assert.equal(broadcastEmits.length, 0);
    assert.equal(socketEmits.length, 1);
    assert.equal(socketEmits[0].event, "whiteboard-error");
    assert.equal(
      socketEmits[0].payload.errorCode,
      WHITEBOARD_ERROR_CODES.CLEAR_CANVAS_FORBIDDEN,
    );
  });

  it("blocks forged room IDs from clearing another classroom canvas", () => {
    getOrCreateRoomState("room-b").whiteboard.push({
      strokeData: validStroke(),
      sender: { id: "user-2" },
    });
    const { handlers, socketEmits, broadcastEmits } = createSocketHarness({
      roomId: "room-a",
      role: "tutor",
    });

    handlers.get("clear-canvas")({ roomId: "room-b" });

    assert.equal(socketEmits.length, 1);
    assert.equal(socketEmits[0].event, "unauthorized");
    assert.equal(broadcastEmits.length, 0);
    assert.equal(getRoomState("room-b").whiteboard.length, 1);
  });
});
