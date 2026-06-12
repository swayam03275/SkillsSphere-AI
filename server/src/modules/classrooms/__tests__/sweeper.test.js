import { describe, it, afterEach, beforeEach, mock } from "node:test";
import assert from "node:assert/strict";
import { initClassroomSockets } from "../socket.js";
import ClassroomSession from "../../../database/models/ClassroomSession.js";
import { getRoomLock, Mutex } from "../../../utils/mutex.js";

describe("Classroom Background Sweeper", () => {
  let sweeperCallback;
  let mockIo;
  let activeSockets;
  let acquireCalls;
  let lockReleased;

  beforeEach(() => {
    // Intercept setInterval to capture the sweeper callback
    mock.method(globalThis, "setInterval", (callback) => {
      sweeperCallback = callback;
      return "mock-timer-id";
    });

    activeSockets = [];
    mockIo = {
      in: mock.fn(() => ({
        fetchSockets: mock.fn(async () => activeSockets)
      })),
      on: mock.fn()
    };

    acquireCalls = [];
    lockReleased = false;

    mock.method(Mutex.prototype, "acquire", async function() {
      acquireCalls.push(this);
      return () => {
        lockReleased = true;
      };
    });
  });

  afterEach(() => {
    mock.restoreAll();
  });

  it("should acquire lock, reload session, and start countdown when room is empty", async () => {
    // Initialize sockets to capture the sweeper callback
    initClassroomSockets(mockIo);
    assert.ok(sweeperCallback, "Sweeper callback should be registered");

    // Setup active session fetched by find
    const mockSession = {
      _id: "session-1",
      roomId: "room-1",
      status: "active",
      emptySince: null,
      participants: [{ socketId: "socket-1", user: { id: "user-1" } }],
      save: mock.fn(async () => {})
    };

    mock.method(ClassroomSession, "find", async () => [mockSession]);
    mock.method(ClassroomSession, "findOne", async () => mockSession);

    // Run sweeper
    await sweeperCallback();

    // Verify lock was acquired (acquire called on the room-1 lock)
    assert.equal(acquireCalls.length, 1);

    // Verify fresh session was loaded under lock
    assert.equal(ClassroomSession.findOne.mock.calls.length, 1);
    assert.deepEqual(ClassroomSession.findOne.mock.calls[0].arguments[0], {
      roomId: "room-1",
      status: "active"
    });

    // Verify emptySince countdown started and document was saved
    assert.ok(mockSession.emptySince instanceof Date);
    assert.equal(mockSession.save.mock.calls.length, 1);
    assert.equal(lockReleased, true);
  });

  it("should end session and clear locks/state when empty longer than grace period", async () => {
    initClassroomSockets(mockIo);

    const oldDate = new Date(Date.now() - 40000); // 40s ago (cutoff is 30s)
    const mockSession = {
      _id: "session-2",
      roomId: "room-2",
      status: "active",
      emptySince: oldDate,
      endedAt: null,
      participants: [],
      save: mock.fn(async () => {})
    };

    const firstLock = getRoomLock("room-2");

    mock.method(ClassroomSession, "find", async () => [mockSession]);
    mock.method(ClassroomSession, "findOne", async () => mockSession);

    await sweeperCallback();

    assert.equal(mockSession.status, "ended");
    assert.ok(mockSession.endedAt instanceof Date);
    assert.equal(mockSession.save.mock.calls.length, 1);
    
    // Verify room lock was cleared (a new getRoomLock should return a different Mutex object)
    const secondLock = getRoomLock("room-2");
    assert.notEqual(firstLock, secondLock);
    assert.equal(lockReleased, true);
  });

  it("should reset emptySince and prune inactive participants if sockets are active", async () => {
    initClassroomSockets(mockIo);

    activeSockets = [{ id: "socket-1" }]; // socket-1 is active, socket-stale is gone

    const mockSession = {
      _id: "session-3",
      roomId: "room-3",
      status: "active",
      emptySince: new Date(),
      participants: [
        { socketId: "socket-1", user: { id: "user-1" } },
        { socketId: "socket-stale", user: { id: "user-2" } }
      ],
      save: mock.fn(async () => {})
    };

    mock.method(ClassroomSession, "find", async () => [mockSession]);
    mock.method(ClassroomSession, "findOne", async () => mockSession);

    await sweeperCallback();

    assert.equal(mockSession.emptySince, null);
    assert.equal(mockSession.participants.length, 1);
    assert.equal(mockSession.participants[0].socketId, "socket-1");
    assert.equal(mockSession.save.mock.calls.length, 1);
    assert.equal(lockReleased, true);
  });

  it("should gracefully handle and release lock if session is concurrently ended/not found in findOne", async () => {
    initClassroomSockets(mockIo);

    const mockSession = {
      _id: "session-4",
      roomId: "room-4",
      status: "active"
    };

    mock.method(ClassroomSession, "find", async () => [mockSession]);
    // FindOne returns null because it was concurrently ended/deleted
    mock.method(ClassroomSession, "findOne", async () => null);

    await sweeperCallback();

    assert.equal(ClassroomSession.findOne.mock.calls.length, 1);
    assert.equal(lockReleased, true);
  });
});
