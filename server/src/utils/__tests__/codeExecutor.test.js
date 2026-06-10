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
      const validation = validateCodeExecutionRequest(language, "logger.info('hello')");

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
      const result = await executeCode("javascript", "logger.info('too large')");

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
      assert.equal(payload.files[0].content, "logger.info('hello')");
      return {
        data: {
          run: {
            code: 0,
            output: "hello\n",
          },
        },
      };
    });

    const result = await executeCode("javascript", "logger.info('hello')");

    assert.equal(result.isError, false);
    assert.equal(result.output, "hello\n");
    assert.equal(postMock.mock.calls.length, 1);
  });

  it("rejects dangerous JavaScript code patterns (and bypasses)", async () => {
    const dangerousJS = [
      "const r = require; r('child_process').execSync('whoami')",
      "const r = require; r('child' + '_process').execSync('whoami')",
      "const r = require; r('fs').readFileSync('/etc/passwd')",
      "const p = process; p.exit(1)",
      "const p = globalThis.process; p.exit(1)",
      "import('fs')",
      "const r = re\\u0071uire; r('fs')",
      "const r = \\u0072equire; r('fs')",
      "const r = re\\u{71}uire; r('fs')",
      "const r = req\\\\\\nuire; r('fs')",
      "/* ignore me */ require('fs')",
      "// block me \n require('fs')",
      "const cp = '\\\\x63hild_process'; require(cp)",
    ];

    for (const code of dangerousJS) {
      const validation = validateCodeExecutionRequest("javascript", code);
      assert.equal(validation.isValid, false, `Should reject JavaScript: ${code}`);
      assert.equal(
        validation.result.errorCode,
        CODE_EXECUTION_ERROR_CODES.SUSPICIOUS_CODE_PATTERN,
      );
    }
  });

  it("rejects dangerous Python code patterns", async () => {
    const dangerousPython = [
      "import os; os.system('whoami')",
      "import subprocess; subprocess.call(['whoami'])",
      "import sys; sys.exit(1)",
      "__import__('os').system('whoami')",
      "eval('__import__(\\'os\\').system(\\'whoami\\')')",
      "exec('import os')",
      "open('/etc/passwd', 'r')",
      "# safe comment\nimport os",
    ];

    for (const code of dangerousPython) {
      const validation = validateCodeExecutionRequest("python", code);
      assert.equal(validation.isValid, false, `Should reject Python: ${code}`);
      assert.equal(
        validation.result.errorCode,
        CODE_EXECUTION_ERROR_CODES.SUSPICIOUS_CODE_PATTERN,
      );
    }
  });

  it("rejects dangerous C++ code patterns", async () => {
    const dangerousCpp = [
      "#include <iostream>\nint main() { system(\"whoami\"); }",
      "#include <fstream>",
      "#include <filesystem>",
      "fork()",
      "popen(\"whoami\", \"r\")",
      "remove(\"file.txt\")",
      "rename(\"old.txt\", \"new.txt\")",
    ];

    for (const code of dangerousCpp) {
      const validation = validateCodeExecutionRequest("cpp", code);
      assert.equal(validation.isValid, false, `Should reject C++: ${code}`);
      assert.equal(
        validation.result.errorCode,
        CODE_EXECUTION_ERROR_CODES.SUSPICIOUS_CODE_PATTERN,
      );
    }
  });
});
