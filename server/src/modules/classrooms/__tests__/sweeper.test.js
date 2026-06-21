import { describe, it, afterEach, beforeEach, mock } from "node:test";
import assert from "node:assert/strict";
import { initClassroomSockets, stopClassroomSweeper } from "../socket.js";
import ClassroomSession from "../../../database/models/ClassroomSession.js";
import { getRoomLock, Mutex } from "../../../utils/mutex.js";
import redisClient from "../../../config/redis.js";

describe("Classroom Background Sweeper (Clustered & Single Node)", () => {
  let sweeperCallback;
  let mockIo;
  let activeSockets;
  let acquireCalls;
  let lockReleased;
  let redisStore;
  let isRedisReady;

  // Save original descriptor of isReady to restore later
  const originalDescriptor = Object.getOwnPropertyDescriptor(
    Object.getPrototypeOf(redisClient),
    "isReady"
  ) || Object.getOwnPropertyDescriptor(redisClient, "isReady");

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

    // Reset Redis mock store
    redisStore = new Map();
    isRedisReady = false; // Default to single-node mode

    // Override isReady using defineProperty
    try {
      Object.defineProperty(redisClient, "isReady", {
        get: () => isRedisReady,
        configurable: true
      });
    } catch (err) {
      // If direct definition fails, try prototype redefinition
      try {
        Object.defineProperty(Object.getPrototypeOf(redisClient), "isReady", {
          get: () => isRedisReady,
          configurable: true
        });
      } catch (protoErr) {
        // Safe fallback
      }
    }

    mock.method(redisClient, "get", async (key) => redisStore.get(key));
    mock.method(redisClient, "set", async (key, val) => {
      redisStore.set(key, val);
      return "OK";
    });
    mock.method(redisClient, "del", async (key) => {
      redisStore.delete(key);
      return 1;
    });
    mock.method(redisClient, "keys", async (pattern) => {
      const regex = new RegExp("^" + pattern.replace(/\*/g, ".*") + "$");
      return Array.from(redisStore.keys()).filter((key) => regex.test(key));
    });
    mock.method(redisClient, "scan", async (cursor, options) => {
      const pattern = options?.MATCH || "*";
      const regex = new RegExp("^" + pattern.replace(/\*/g, ".*") + "$");
      const keys = Array.from(redisStore.keys()).filter((key) => regex.test(key));
      return { cursor: 0, keys };
    });
  });

  afterEach(() => {
    mock.restoreAll();
    isRedisReady = false;
    // Restore original property if possible
    if (originalDescriptor) {
      try {
        Object.defineProperty(redisClient, "isReady", originalDescriptor);
      } catch (err) {
        try {
          Object.defineProperty(Object.getPrototypeOf(redisClient), "isReady", originalDescriptor);
        } catch (protoErr) {
          // ignore
        }
      }
    }
  });

  /* --- Single Node Fallback Tests --- */

  it("should acquire lock, reload session, and start countdown when room is empty (single node)", async () => {
    initClassroomSockets(mockIo);
    assert.ok(sweeperCallback, "Sweeper callback should be registered");

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

    await sweeperCallback();

    // Verify lock was acquired (acquire called on the room-1 lock)
    assert.equal(acquireCalls.length, 1);

    // Verify fresh session was loaded under lock
    assert.equal(ClassroomSession.findOne.mock.calls.length, 1);
    assert.deepEqual(ClassroomSession.findOne.mock.calls[0].arguments[0], {
      roomId: "room-1",
      status: "active"
    });

    assert.ok(mockSession.emptySince instanceof Date);
    assert.equal(mockSession.save.mock.calls.length, 1);
    assert.equal(lockReleased, true);
  });

  it("should end session and clear locks/state when empty longer than grace period (single node)", async () => {
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

  it("should reset emptySince and prune inactive participants if sockets are active (single node)", async () => {
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

  /* --- Clustered Deployment Tests (Redis Active) --- */

  it("should NOT start countdown if local is empty but remote node has active connections (clustered)", async () => {
    isRedisReady = true;
    initClassroomSockets(mockIo);

    // Local sockets is empty, but simulate remote server having active sockets in Redis
    activeSockets = [];
    redisStore.set("classroom:presence:room-cluster-1:server-remote-99", JSON.stringify(["socket-remote-1"]));

    const mockSession = {
      _id: "session-4",
      roomId: "room-cluster-1",
      status: "active",
      emptySince: null,
      participants: [{ socketId: "socket-remote-1", user: { id: "user-remote" } }],
      save: mock.fn(async () => {})
    };

    mock.method(ClassroomSession, "find", async () => [mockSession]);
    mock.method(ClassroomSession, "findOne", async () => mockSession);

    await sweeperCallback();

    // Verify emptySince countdown did NOT start because remote socket is active
    assert.equal(mockSession.emptySince, null);
    assert.equal(mockSession.participants.length, 1);
    assert.equal(mockSession.participants[0].socketId, "socket-remote-1");
    assert.equal(lockReleased, true);
  });

  it("should start countdown if both local and remote nodes are empty (clustered)", async () => {
    isRedisReady = true;
    initClassroomSockets(mockIo);

    activeSockets = [];
    // Simulate remote server has cleaned up its presence
    redisStore.set("classroom:presence:room-cluster-2:server-remote-99", JSON.stringify([]));

    const mockSession = {
      _id: "session-5",
      roomId: "room-cluster-2",
      status: "active",
      emptySince: null,
      participants: [],
      save: mock.fn(async () => {})
    };

    mock.method(ClassroomSession, "find", async () => [mockSession]);
    mock.method(ClassroomSession, "findOne", async () => mockSession);

    await sweeperCallback();

    assert.ok(mockSession.emptySince instanceof Date);
    assert.equal(mockSession.save.mock.calls.length, 1);
    assert.equal(lockReleased, true);
  });

  it("should combine local and remote active sockets to prune stale participants (clustered)", async () => {
    isRedisReady = true;
    initClassroomSockets(mockIo);

    // Local server has active socket-local
    activeSockets = [{ id: "socket-local" }];
    // Remote server has active socket-remote
    redisStore.set("classroom:presence:room-cluster-3:server-remote-99", JSON.stringify(["socket-remote"]));

    const mockSession = {
      _id: "session-6",
      roomId: "room-cluster-3",
      status: "active",
      emptySince: new Date(),
      participants: [
        { socketId: "socket-local", user: { id: "user-1" } },
        { socketId: "socket-remote", user: { id: "user-2" } },
        { socketId: "socket-dead-ghost", user: { id: "user-3" } } // stale ghost socket
      ],
      save: mock.fn(async () => {})
    };

    mock.method(ClassroomSession, "find", async () => [mockSession]);
    mock.method(ClassroomSession, "findOne", async () => mockSession);

    await sweeperCallback();

    // Verify emptySince was reset
    assert.equal(mockSession.emptySince, null);
    // Verify socket-local and socket-remote are retained, but socket-dead-ghost is pruned
    assert.equal(mockSession.participants.length, 2);
    const retainedSocketIds = mockSession.participants.map((p) => p.socketId);
    assert.ok(retainedSocketIds.includes("socket-local"));
    assert.ok(retainedSocketIds.includes("socket-remote"));
    assert.ok(!retainedSocketIds.includes("socket-dead-ghost"));
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

describe("Classroom Sweeper Lifecycle", () => {
  let mockIo;
  let clearIntervalCalls;

  beforeEach(() => {
    mockIo = {
      in: mock.fn(() => ({
        fetchSockets: mock.fn(async () => [])
      })),
      on: mock.fn()
    };

    clearIntervalCalls = [];

    // Mock setInterval and clearInterval
    mock.method(globalThis, "setInterval", () => {
      return "mock-timer-12345";
    });

    mock.method(globalThis, "clearInterval", (id) => {
      clearIntervalCalls.push(id);
    });
  });

  afterEach(() => {
    mock.restoreAll();
  });

  it("should start interval on init and clear it on stop", () => {
    // 1. Initialize classroom sockets (should start interval)
    initClassroomSockets(mockIo);
    assert.equal(globalThis.setInterval.mock.calls.length, 1);

    // 2. Stop classroom sweeper (should clear the interval)
    stopClassroomSweeper();
    assert.equal(clearIntervalCalls.length, 1);
    assert.equal(clearIntervalCalls[0], "mock-timer-12345");
  });
});
