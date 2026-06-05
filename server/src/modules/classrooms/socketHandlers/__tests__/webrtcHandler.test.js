import { describe, it } from "node:test";
import assert from "node:assert/strict";
import registerWebRTCHandler from "../webrtcHandler.js";

const createSocketHarness = () => {
  const socketDefinitions = [
    {
      id: "socket-a",
      roomId: "room-a",
      user: { id: "user-a", name: "Alice" },
    },
    {
      id: "socket-b",
      roomId: "room-a",
      user: { id: "user-b", name: "Bob" },
    },
    {
      id: "socket-c",
      roomId: "room-b",
      user: { id: "user-c", name: "Casey" },
    },
    {
      id: "socket-d",
      roomId: "room-c",
      user: { id: "user-d", name: "Devon" },
    },
  ];
  const socketEmits = [];
  const outboundEmits = [];
  const sockets = new Map();

  const buildSocket = ({ id, roomId, user }) => {
    const handlers = new Map();
    const socket = {
      id,
      data: { roomId, user },
      handlers,
      on(event, handler) {
        handlers.set(event, handler);
      },
      emit(event, payload) {
        socketEmits.push({ from: id, event, payload });
      },
      to(target) {
        return {
          emit(event, payload) {
            outboundEmits.push({ from: id, target, event, payload });
          },
        };
      },
    };

    sockets.set(id, socket);
    return socket;
  };

  const createdSockets = socketDefinitions.map(buildSocket);
  const io = {
    sockets: {
      sockets,
    },
  };

  for (const socket of createdSockets) {
    registerWebRTCHandler(io, socket);
  }

  return {
    alice: sockets.get("socket-a"),
    bob: sockets.get("socket-b"),
    casey: sockets.get("socket-c"),
    devon: sockets.get("socket-d"),
    outboundEmits,
    socketEmits,
  };
};

const assertOnlyTargets = (outboundEmits, expectedTargets) => {
  assert.deepEqual(
    outboundEmits.map((emit) => emit.target),
    expectedTargets,
  );
};

describe("webrtcHandler classroom room isolation", () => {
  it("delivers same-room WebRTC offer, answer, and ICE candidate payloads", () => {
    const { alice, bob, outboundEmits, socketEmits } = createSocketHarness();
    const offer = { type: "offer", sdp: "offer-sdp" };
    const answer = { type: "answer", sdp: "answer-sdp" };
    const candidate = {
      candidate: "candidate:1 1 udp 1 127.0.0.1 123 typ host",
      sdpMid: "0",
      sdpMLineIndex: 0,
    };

    alice.handlers.get("webrtc-offer")({
      targetSocketId: "socket-b",
      roomId: "room-b",
      classroomId: "room-b",
      offer,
    });
    bob.handlers.get("webrtc-answer")({
      targetSocketId: "socket-a",
      roomId: "room-c",
      answer,
    });
    alice.handlers.get("ice-candidate")({
      targetSocketId: "socket-b",
      roomId: "room-c",
      candidate,
    });

    assert.equal(socketEmits.length, 0);
    assert.deepEqual(outboundEmits, [
      {
        from: "socket-a",
        target: "socket-b",
        event: "webrtc-offer",
        payload: {
          callerSocketId: "socket-a",
          callerUser: { id: "user-a", name: "Alice" },
          offer,
        },
      },
      {
        from: "socket-b",
        target: "socket-a",
        event: "webrtc-answer",
        payload: {
          answererSocketId: "socket-b",
          answer,
        },
      },
      {
        from: "socket-a",
        target: "socket-b",
        event: "ice-candidate",
        payload: {
          senderSocketId: "socket-a",
          candidate,
        },
      },
    ]);
  });

  it("broadcasts call join and leave events only to the authenticated socket room", () => {
    const { alice, outboundEmits, socketEmits } = createSocketHarness();

    alice.handlers.get("user-joined-call")({
      roomId: "room-b",
      classroomId: "room-c",
    });
    alice.handlers.get("user-left-call")({
      roomId: "room-b",
      classroomId: "room-c",
    });

    assert.equal(socketEmits.length, 0);
    assert.deepEqual(outboundEmits, [
      {
        from: "socket-a",
        target: "room-a",
        event: "user-joined-call",
        payload: {
          socketId: "socket-a",
          user: { id: "user-a", name: "Alice" },
        },
      },
      {
        from: "socket-a",
        target: "room-a",
        event: "user-left-call",
        payload: {
          socketId: "socket-a",
          user: { id: "user-a", name: "Alice" },
        },
      },
    ]);
  });

  it("blocks direct signaling to sockets in other classroom rooms", () => {
    const { alice, outboundEmits, socketEmits } = createSocketHarness();

    alice.handlers.get("webrtc-offer")({
      targetSocketId: "socket-c",
      roomId: "room-b",
      classroomId: "room-b",
      offer: { type: "offer", sdp: "cross-room-offer" },
    });
    alice.handlers.get("webrtc-answer")({
      targetSocketId: "socket-c",
      roomId: "room-b",
      answer: { type: "answer", sdp: "cross-room-answer" },
    });
    alice.handlers.get("ice-candidate")({
      targetSocketId: "socket-c",
      roomId: "room-b",
      candidate: { candidate: "cross-room-candidate" },
    });

    assert.equal(socketEmits.length, 0);
    assert.equal(outboundEmits.length, 0);
  });

  it("does not leak forged room broadcasts to unrelated classroom rooms", () => {
    const { alice, casey, outboundEmits } = createSocketHarness();

    alice.handlers.get("user-joined-call")({ roomId: "room-b" });
    casey.handlers.get("user-left-call")({ roomId: "room-a" });

    assertOnlyTargets(outboundEmits, ["room-a", "room-b"]);
    assert.deepEqual(
      outboundEmits.map((emit) => emit.event),
      ["user-joined-call", "user-left-call"],
    );
    assert.equal(
      outboundEmits.some((emit) => emit.target === "room-c"),
      false,
    );
  });

  it("requires sockets to join a classroom before emitting WebRTC events", () => {
    const { alice, outboundEmits, socketEmits } = createSocketHarness();
    delete alice.data.roomId;

    alice.handlers.get("webrtc-offer")({
      targetSocketId: "socket-b",
      offer: { type: "offer", sdp: "unauthorized" },
    });
    alice.handlers.get("user-joined-call")({ roomId: "room-a" });

    assert.equal(outboundEmits.length, 0);
    assert.deepEqual(socketEmits, [
      {
        from: "socket-a",
        event: "unauthorized",
        payload: { message: "You must join a room first" },
      },
      {
        from: "socket-a",
        event: "unauthorized",
        payload: { message: "You must join a room first" },
      },
    ]);
  });
});
