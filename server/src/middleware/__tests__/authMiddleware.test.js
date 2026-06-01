import test, { mock, afterEach } from "node:test";
import assert from "node:assert/strict";
import jwt from "jsonwebtoken";
import User from "../../database/models/User.js";
import { protect } from "../authMiddleware.js";

const invokeMiddleware = (middleware, req) =>
  new Promise((resolve, reject) => {
    const res = {
      statusCode: 200,
      status(code) {
        this.statusCode = code;
        return this;
      },
      json(payload) {
        resolve({ statusCode: this.statusCode, body: payload });
      },
    };

    middleware(req, res, (err) => {
      if (err) {
        resolve({ nextError: err });
        return;
      }
      resolve({ nextCalled: true });
    });
  });

afterEach(() => {
  mock.restoreAll();
});

test("protect rejects malformed Bearer headers before JWT verification", async () => {
  const verifySpy = mock.method(jwt, "verify", () => {
    throw new Error("jwt.verify should not be called");
  });
  const findByIdSpy = mock.method(User, "findById", async () => {
    throw new Error("User lookup should not be called");
  });

  const result = await invokeMiddleware(protect, {
    headers: {
      authorization: "Bearer",
    },
  });

  assert.equal(result.nextError?.statusCode, 401);
  assert.equal(result.nextError?.message, "You are not logged in! Please log in to get access.");
  assert.equal(verifySpy.mock.calls.length, 0);
  assert.equal(findByIdSpy.mock.calls.length, 0);
});