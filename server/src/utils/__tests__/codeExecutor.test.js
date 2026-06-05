import { afterEach, describe, it, mock } from "node:test";
import assert from "node:assert/strict";
import axios from "axios";
import {
  CODE_EXECUTION_ERROR_CODES,
  executeCode,
  validateCodeExecutionRequest,
} from "../codeExecutor.js";

const restoreEnvValue = (key, value) => {
  if (value === undefined) {
    delete process.env[key];
    return;
  }

  process.env[key] = value;
};

describe("codeExecutor security validation", () => {
  afterEach(() => {
    mock.restoreAll();
    delete process.env.MAX_CODE_INPUT_BYTES;
  });

  it("rejects unsupported languages without calling the execution API", async () => {
    const postMock = mock.method(axios, "post", async () => {
      throw new Error("should not call Piston for unsupported languages");
    });

    const result = await executeCode("ruby", "puts 'hello'");

    assert.equal(result.isError, true);
    assert.equal(result.errorCode, CODE_EXECUTION_ERROR_CODES.UNSUPPORTED_LANGUAGE);
    assert.equal(postMock.mock.calls.length, 0);
  });

  it("rejects missing and malformed languages", async () => {
    for (const language of [undefined, "", "   ", "java script", "javascript;rm"]) {
      const validation = validateCodeExecutionRequest(language, "console.log('hello')");

      assert.equal(validation.isValid, false);
      assert.equal(
        validation.result.errorCode,
        CODE_EXECUTION_ERROR_CODES.UNSUPPORTED_LANGUAGE,
      );
    }
  });

  it("rejects oversized code before execution", async () => {
    const previousLimit = process.env.MAX_CODE_INPUT_BYTES;
    process.env.MAX_CODE_INPUT_BYTES = "5";
    const postMock = mock.method(axios, "post", async () => {
      throw new Error("should not call Piston for oversized code");
    });

    try {
      const result = await executeCode("javascript", "console.log('too large')");

      assert.equal(result.isError, true);
      assert.equal(result.errorCode, CODE_EXECUTION_ERROR_CODES.CODE_INPUT_TOO_LARGE);
      assert.equal(postMock.mock.calls.length, 0);
    } finally {
      restoreEnvValue("MAX_CODE_INPUT_BYTES", previousLimit);
    }
  });

  it("executes valid allowed language code successfully", async () => {
    const postMock = mock.method(axios, "post", async (_url, payload) => {
      assert.equal(payload.language, "javascript");
      assert.equal(payload.version, "18.15.0");
      assert.equal(payload.files[0].content, "console.log('hello')");
      return {
        data: {
          run: {
            code: 0,
            output: "hello\n",
          },
        },
      };
    });

    const result = await executeCode("javascript", "console.log('hello')");

    assert.equal(result.isError, false);
    assert.equal(result.output, "hello\n");
    assert.equal(postMock.mock.calls.length, 1);
  });
});
