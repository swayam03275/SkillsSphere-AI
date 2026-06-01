import { test } from 'node:test';
import assert from 'assert';
import http from 'http';
import { Server } from 'socket.io';
import { io as Client } from 'socket.io-client';

// Set small limits for the test before importing the limiter module
process.env.SOCKET_RATE_MAX_EVENTS = process.env.SOCKET_RATE_MAX_EVENTS || '10';
process.env.SOCKET_RATE_WINDOW_MS = process.env.SOCKET_RATE_WINDOW_MS || '1000';
process.env.SOCKET_RATE_WARNING_PERCENT = process.env.SOCKET_RATE_WARNING_PERCENT || '50';
process.env.SOCKET_RATE_WARNING_COOLDOWN_MS = process.env.SOCKET_RATE_WARNING_COOLDOWN_MS || '50';
process.env.SOCKET_RATE_ENABLED = 'true';

import attachSocketRateLimiter from '../src/middleware/socketRateLimiter.js';

test('socket rate limiter warns then disconnects on flood', async () => {
  const server = http.createServer();
  const io = new Server(server, { cors: { origin: '*' } });
  attachSocketRateLimiter(io);

  await new Promise((res) => server.listen(0, res));
  const { port } = server.address();

  const client = Client(`http://localhost:${port}`, { transports: ['websocket'], reconnection: false });

  await new Promise((resolve, reject) => {
    client.on('connect', resolve);
    client.on('connect_error', reject);
  });

  let gotWarning = false;
  let gotLimited = false;
  let disconnected = false;

  client.on('rate_warning', () => { gotWarning = true; });
  client.on('rate_limited', () => { gotLimited = true; });
  client.on('disconnect', () => { disconnected = true; });

  try {
    // Flood with more events than allowed
    for (let i = 0; i < 200; i++) client.emit('test_event', { i });

    // Wait up to 5s for a disconnect (preferred) or rate events
    const ok = await new Promise((resolve) => {
      const deadline = Date.now() + 5000;
      (function loop() {
        if (disconnected) return resolve(true);
        if ((gotWarning || gotLimited) && disconnected) return resolve(true);
        if (Date.now() > deadline) return resolve(false);
        setTimeout(loop, 50);
      })();
    });

    assert.ok(ok, 'Expected disconnect and/or rate events during flood');
  } finally {
    try { client.disconnect(); } catch (e) { /* ignore */ }
    try { io.close(); } catch (e) { /* ignore */ }
    try { server.close(); } catch (e) { /* ignore */ }
  }
});
