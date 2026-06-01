/**
 * A simple, dependency-free asynchronous Mutex (Mutual Exclusion) lock
 * to prevent race conditions during async-await yield points.
 */
export class Mutex {
  constructor() {
    this._queue = [];
    this._locked = false;
  }

  /**
   * Acquires the lock. Returns a promise that resolves to a release function.
   * Usage:
   *   const release = await mutex.acquire();
   *   try {
   *     // critical section
   *   } finally {
   *     release();
   *   }
   * 
   * @returns {Promise<Function>} A function to release the lock
   */
  acquire() {
    return new Promise((resolve) => {
      const run = () => {
        let released = false;
        resolve(() => {
          if (released) return;
          released = true;
          this._locked = false;
          this._next();
        });
      };

      if (!this._locked) {
        this._locked = true;
        run();
      } else {
        this._queue.push(run);
      }
    });
  }

  _next() {
    if (this._queue.length > 0) {
      this._locked = true;
      const nextRun = this._queue.shift();
      nextRun();
    }
  }
}

// Global registry to store locks per roomId
const roomLocks = new Map();

/**
 * Gets or creates a Mutex lock for a specific room.
 * 
 * @param {string} roomId - Room identifier
 * @returns {Mutex} The Mutex lock for the room
 */
export const getRoomLock = (roomId) => {
  if (!roomLocks.has(roomId)) {
    roomLocks.set(roomId, new Mutex());
  }
  return roomLocks.get(roomId);
};

/**
 * Removes a Mutex lock for a specific room to prevent memory leaks.
 * 
 * @param {string} roomId - Room identifier
 */
export const clearRoomLock = (roomId) => {
  roomLocks.delete(roomId);
};
