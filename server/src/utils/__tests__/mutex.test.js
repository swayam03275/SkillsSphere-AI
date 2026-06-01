import test from "node:test";
import assert from "node:assert";
import { Mutex, getRoomLock, clearRoomLock } from "../mutex.js";

test("Mutex lock prevents concurrent overlap (mutual exclusion)", async () => {
  const mutex = new Mutex();
  let executionCount = 0;
  let concurrentExecutions = 0;
  let maxConcurrent = 0;

  const runTask = async (id, delayMs) => {
    const release = await mutex.acquire();
    try {
      concurrentExecutions += 1;
      maxConcurrent = Math.max(maxConcurrent, concurrentExecutions);
      
      // Artificial delay to simulate asynchronous operations
      await new Promise((resolve) => setTimeout(resolve, delayMs));
      
      executionCount += 1;
      concurrentExecutions -= 1;
    } finally {
      release();
    }
  };

  // Launch 5 asynchronous tasks concurrently
  await Promise.all([
    runTask(1, 20),
    runTask(2, 10),
    runTask(3, 15),
    runTask(4, 5),
    runTask(5, 10)
  ]);

  assert.strictEqual(executionCount, 5, "All tasks must be executed");
  assert.strictEqual(maxConcurrent, 1, "Max concurrent executions must be 1 (exclusive)");
  assert.strictEqual(concurrentExecutions, 0, "No executions should be left active");
});

test("getRoomLock and clearRoomLock utility functions", () => {
  const roomId = "test-classroom-room-123";
  const lock1 = getRoomLock(roomId);
  const lock2 = getRoomLock(roomId);

  assert.strictEqual(lock1, lock2, "Subsequent calls for the same roomId should return the same Mutex instance");

  clearRoomLock(roomId);
  const lock3 = getRoomLock(roomId);
  assert.notStrictEqual(lock1, lock3, "After clearing, a new Mutex instance should be returned");
  clearRoomLock(roomId);
});
