import assert from "node:assert/strict";
import test from "node:test";
import { getIO, setIO } from "../socketIO.js";

test("socketIO - getIO initially returns undefined", () => {
  const io = getIO();
  assert.equal(io, undefined);
});

test("socketIO - setIO and getIO store and retrieve socket.io instance correctly", () => {
  const mockIO = {
    emit: () => {},
    on: () => {},
    to: () => {}
  };

  setIO(mockIO);
  const retrievedIO = getIO();
  
  assert.equal(retrievedIO, mockIO);
  assert.deepEqual(retrievedIO, mockIO);
});
