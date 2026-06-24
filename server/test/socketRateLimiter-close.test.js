import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import http from "http";
import { Server } from "socket.io";
import { io as Client } from "socket.io-client";

process.env.SOCKET_RATE_MAX_EVENTS = "10";
process.env.SOCKET_RATE_WINDOW_MS = "1000";
process.env.SOCKET_RATE_WARNING_PERCENT = "50";
process.env.SOCKET_RATE_WARNING_COOLDOWN_MS = "50";
process.env.SOCKET_RATE_ENABLED = "true";

import attachSocketRateLimiter, { close } from "../src/middleware/socketRateLimiter.js";

describe("socketRateLimiter close()", () => {
  let server;
  let io;

  beforeEach(async () => {
    close(); // reset state before each test
    server = http.createServer();
    io = new Server(server, { cors: { origin: "*" } });
    attachSocketRateLimiter(io);
    await new Promise((res) => server.listen(0, res));
  });

  it("close() is idempotent - calling twice does not throw", () => {
    close();
    close(); // should not throw
  });

  it("close() stops the cleanup timer without throwing", async () => {
    const port = server.address().port;
    const client = Client(`http://localhost:${port}`, { transports: ["websocket"], reconnection: false });

    await new Promise((resolve, reject) => {
      client.on("connect", resolve);
      client.on("connect_error", reject);
    });

    close(); // should not throw
    client.disconnect();
    await new Promise((res) => server.close(res));
  });

  it("reattaching after close() works correctly", async () => {
    const port = server.address().port;
    const client = Client(`http://localhost:${port}`, { transports: ["websocket"], reconnection: false });

    await new Promise((resolve, reject) => {
      client.on("connect", resolve);
      client.on("connect_error", reject);
    });

    close();
    client.disconnect();
    await new Promise((res) => server.close(res));
  });
});
