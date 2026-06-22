import test, { mock, afterEach } from "node:test";
import assert from "node:assert/strict";
import { authRateLimiter, jobCreationLimiter } from "../rateLimiter.js";

afterEach(() => {
  mock.restoreAll();
});

const makeReq = (ip = "127.0.0.1") => ({
  ip,
  body: {},
  user: undefined,
  headers: {},
  get: () => undefined,
  connection: { remoteAddress: ip },
  protocol: "http",
  url: "/test",
  path: "/test",
  method: "GET",
});

const makeRes = () => ({
  statusCode: 200,
  _body: null,
  status(code) {
    this.statusCode = code;
    return this;
  },
  json(body) {
    this._body = body;
  },
  send(body) {
    this._body = body;
  },
  setHeader() {},
  getHeader() {
    return 0;
  },
  end() {},
  writableEnded: false,
  get() {
    return undefined;
  },
});

const invoke = (mw, req, timeoutMs = 500) =>
  new Promise((resolve) => {
    const res = makeRes();
    mw(req, res, () => resolve({ res, nextCalled: true }));
    setTimeout(
      () => resolve({ res, nextCalled: false }),
      timeoutMs
    );
  });

test("authRateLimiter allows first request through", async () => {
  const req = makeReq("127.0.0.1");
  const { res, nextCalled } = await invoke(authRateLimiter, req);
  assert.equal(res.statusCode, 200);
  assert.equal(nextCalled, true);
});

test("jobCreationLimiter allows first request through", async () => {
  const req = makeReq("10.0.0.1");
  const { res, nextCalled } = await invoke(jobCreationLimiter, req);
  assert.equal(res.statusCode, 200);
  assert.equal(nextCalled, true);
});

test("authRateLimiter sends 429 response after exhausting tokens", async () => {
  const req = makeReq("192.168.55.99");
  // Exhaust tokens (default max = 10)
  for (let i = 0; i < 10; i++) {
    await invoke(authRateLimiter, req);
  }
  // 11th request should be rate limited
  const { res } = await invoke(authRateLimiter, req, 1000);
  assert.equal(res.statusCode, 429);
  assert.equal(res._body.success, false);
  assert.equal(res._body.error, "RATE_LIMIT_EXCEEDED");
});

test("jobCreationLimiter sends 429 after exhausting job creation tokens", async () => {
  const req = makeReq("10.99.55.99");
  // Exhaust tokens (default max = 30)
  for (let i = 0; i < 30; i++) {
    await invoke(jobCreationLimiter, req);
  }
  // 31st request should be rate limited
  const { res } = await invoke(jobCreationLimiter, req, 1000);
  assert.equal(res.statusCode, 429);
  assert.equal(res._body.success, false);
  assert.equal(res._body.error, "RATE_LIMIT_EXCEEDED");
  assert.match(res._body.message, /job/i);
});



test("different IPs have independent rate limit counters", async () => {
  const reqA = makeReq("1.1.1.1");
  const reqB = makeReq("2.2.2.2");
  // Exhaust tokens for IP A (10 tokens)
  for (let i = 0; i < 10; i++) {
    await invoke(authRateLimiter, reqA);
  }
  // IP B should still have tokens
  const { res: resB } = await invoke(authRateLimiter, reqB);
  assert.equal(resB.statusCode, 200);
});

test("rate limit response has correct shape", async () => {
  const req = makeReq("9.9.9.9");
  for (let i = 0; i < 10; i++) {
    await invoke(authRateLimiter, req);
  }
  const { res } = await invoke(authRateLimiter, req, 1000);
  assert.equal(res.statusCode, 429);
  assert.equal(res._body.success, false);
  assert.equal(res._body.error, "RATE_LIMIT_EXCEEDED");
  assert.equal(typeof res._body.message, "string");
  assert.ok(res._body.message.length > 0);
});

test("authRateLimiter sets 429 error message includes retry hint", async () => {
  const req = makeReq("8.8.8.8");
  for (let i = 0; i < 10; i++) {
    await invoke(authRateLimiter, req);
  }
  const { res } = await invoke(authRateLimiter, req, 1000);
  assert.equal(res.statusCode, 429);
  assert.match(res._body.message, /15 minutes|authentication|attempt/i);
});
