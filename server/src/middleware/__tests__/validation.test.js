import test from "node:test";
import assert from "node:assert/strict";
import { z } from "zod";
import { validateBody } from "../validation.js";
import AppError from "../../utils/AppError.js";

const invokeMiddleware = (middleware, req) =>
  new Promise((resolve, reject) => {
    const res = {};
    middleware(req, res, (err) => {
      if (err) {
        resolve({ nextError: err });
        return;
      }
      resolve({ nextCalled: true });
    });
  });

const testSchema = z.object({
  id: z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid ID format"),
  name: z.string().min(2),
});

test("validateBody - accepts valid payload and strips extraneous keys", async () => {
  const req = {
    body: {
      id: "507f1f77bcf86cd799439011",
      name: "Alice",
      extraneousKey: "maliciousVal",
    },
  };

  const result = await invokeMiddleware(validateBody(testSchema), req);

  assert.equal(result.nextCalled, true);
  assert.equal(req.body.id, "507f1f77bcf86cd799439011");
  assert.equal(req.body.name, "Alice");
  assert.equal(req.body.extraneousKey, undefined); // Extraneous key stripped out successfully!
});

test("validateBody - rejects missing required fields", async () => {
  const req = {
    body: {
      id: "507f1f77bcf86cd799439011",
    },
  };

  const result = await invokeMiddleware(validateBody(testSchema), req);

  assert.ok(result.nextError instanceof AppError);
  assert.equal(result.nextError.statusCode, 400);
  assert.match(result.nextError.message, /Required/);
});

test("validateBody - rejects invalid formats (e.g. malformed ObjectId)", async () => {
  const req = {
    body: {
      id: "invalid-id-format-12345",
      name: "Alice",
    },
  };

  const result = await invokeMiddleware(validateBody(testSchema), req);

  assert.ok(result.nextError instanceof AppError);
  assert.equal(result.nextError.statusCode, 400);
  assert.match(result.nextError.message, /Invalid ID format/);
});

test("validateBody - rejects NoSQL injection nested objects", async () => {
  const req = {
    body: {
      id: { $gt: "" }, // NoSQL injection payload
      name: "Alice",
    },
  };

  const result = await invokeMiddleware(validateBody(testSchema), req);

  assert.ok(result.nextError instanceof AppError);
  assert.equal(result.nextError.statusCode, 400);
  // Zod will fail because the type received is object instead of string
  assert.match(result.nextError.message, /Expected string, received object/);
});
