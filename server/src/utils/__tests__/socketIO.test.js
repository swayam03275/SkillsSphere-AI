import assert from "node:assert/strict";
import test from "node:test";
import { setIO, getIO } from "../socketIO.js";

test("socketIO - sets and gets the Socket.io Server instance correctly", () => {
  // Initially undefined/null or unset
  assert.equal(getIO(), undefined);

  // Mock instance
  const mockIOInstance = {
    emit: () => "emitted",
    on: () => "on"
  };

  setIO(mockIOInstance);

  const retrieved = getIO();
  assert.ok(retrieved);
  assert.equal(retrieved, mockIOInstance);
  assert.equal(retrieved.emit(), "emitted");
});
