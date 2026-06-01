import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { generateAuthCode, consumeAuthCode } from "../authCodeStore.js";

describe("authCodeStore", () => {
  it("generates a unique auth code", async () => {
    const code1 = await generateAuthCode("user123");
    const code2 = await generateAuthCode("user123");

    assert.equal(typeof code1, "string");
    assert.equal(code1.length, 36);
    assert.notEqual(code1, code2);
  });

  it("returns userId when consuming a valid code", async () => {
    const code = await generateAuthCode("user456");
    const userId = await consumeAuthCode(code);

    assert.equal(userId, "user456");
  });

  it("returns null when consuming a bogus code", async () => {
    const result = await consumeAuthCode("bogus-code-123");

    assert.equal(result, null);
  });

  it("deletes code after first consumption", async () => {
    const code = await generateAuthCode("user789");
    await consumeAuthCode(code);

    const secondAttempt = await consumeAuthCode(code);
    assert.equal(secondAttempt, null);
  });

  it("generates unique codes for different users", async () => {
    const code1 = await generateAuthCode("user111");
    const code2 = await generateAuthCode("user222");

    assert.notEqual(code1, code2);

    assert.equal(await consumeAuthCode(code1), "user111");
    assert.equal(await consumeAuthCode(code2), "user222");
  });
});
