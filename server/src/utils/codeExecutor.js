import axios from 'axios';
import crypto from 'crypto';
import logger from "./logger.js";

export const CODE_EXECUTION_ERROR_CODES = {
  UNSUPPORTED_LANGUAGE: "UNSUPPORTED_LANGUAGE",
  CODE_INPUT_TOO_LARGE: "CODE_INPUT_TOO_LARGE",
  SUSPICIOUS_CODE_PATTERN: "SUSPICIOUS_CODE_PATTERN",
};

export const SUPPORTED_CODE_LANGUAGES = Object.freeze({
  javascript: { language: "javascript", version: "18.15.0" },
  python: { language: "python", version: "3.10.0" },
  cpp: { language: "c++", version: "10.2.0" },
});

const DEFAULT_MAX_CODE_INPUT_BYTES = 50 * 1024;

export const getMaxCodeInputBytes = () => {
  const configuredLimit = Number(process.env.MAX_CODE_INPUT_BYTES);
  return Number.isSafeInteger(configuredLimit) && configuredLimit > 0
    ? configuredLimit
    : DEFAULT_MAX_CODE_INPUT_BYTES;
};

const safeErrorResult = (errorCode, output) => ({
  output,
  isError: true,
  errorCode,
});

const normalizeLanguage = (language) => {
  if (typeof language !== "string") return null;
  const normalized = language.trim().toLowerCase();
  if (!/^[a-z0-9+#-]+$/.test(normalized)) return null;
  return normalized;
};

const DANGEROUS_PATTERNS = {
  javascript: [
    /\brequire\b/i,
    /\bimport\b/i,
    /\bprocess\b/i,
    /\bglobal\b/i,
    /\bglobalThis\b/i,
    /\bconstructor\b/i,
    /\beval\b/i,
    /\bFunction\b/i,
    /child_process/i,
    /worker_threads/i,
    /cluster/i,
    /\bfs\b/i,
    /\b__proto__\b/i,
    /\bprototype\b/i,
    /setInterval/i,
    /setTimeout/i
  ],
  python: [
    /\bimport\b/i,
    /\bexec\b/i,
    /\beval\b/i,
    /\bopen\b/i,
    /\b__import__\b/i,
    /\bos\b/i,
    /\bsys\b/i,
    /\bsubprocess\b/i,
    /\bshutil\b/i,
    /\bpty\b/i,
    /\bsocket\b/i,
    /\brequests\b/i,
    /\burllib\b/i,
    /\bimportlib\b/i,
    /\bgetattr\b/i,
    /\bsetattr\b/i,
    /\bglobals\b/i,
    /\blocals\b/i
  ],
  cpp: [
    /\bsystem\b/i,
    /\bpopen\b/i,
    /\bfork\b/i,
    /\bexec(l|p|v|lp|vp|le|ve)?\b/i,
    /\bfstream\b/i,
    /\bremove\b/i,
    /\brename\b/i,
    /\bfilesystem\b/i
  ]
};

const preprocessCode = (language, code) => {
  if (typeof code !== "string") return "";

  let processed = code;

  // 1. Decode hex (\xXX), Unicode (\uXXXX), and braced Unicode (\u{XXXX}) escapes
  try {
    processed = processed
      .replace(/\\u([0-9a-fA-F]{4})/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
      .replace(/\\u\{([0-9a-fA-F]+)\}/g, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
      .replace(/\\x([0-9a-fA-F]{2})/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
  } catch (e) {
    // Ignore malformed escape errors
  }

  // 2. Remove line continuations (backslash followed by newline)
  processed = processed.replace(/\\\r?\n/g, "");

  // 3. Strip comments based on language style to prevent keyword hiding
  if (language === "javascript" || language === "cpp") {
    processed = processed
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/\/\/.*/g, "");
  } else if (language === "python") {
    processed = processed
      .replace(/#.*/g, "");
  }

  return processed;
};

const hasDangerousPatterns = (language, code) => {
  const preprocessed = preprocessCode(language, code);
  const patterns = DANGEROUS_PATTERNS[language];
  if (!patterns) return false;
  return patterns.some(pattern => pattern.test(preprocessed));
};

class CodeExecutionCache {
  constructor(maxSize = 200, ttlMs = 5 * 60 * 1000) {
    this.cache = new Map();
    this.maxSize = maxSize;
    this.ttlMs = ttlMs;
  }

  get(language, code) {
    const key = `${language}:${crypto.createHash("sha256").update(code).digest("hex")}`;
    const cached = this.cache.get(key);
    if (!cached) return null;
    if (Date.now() > cached.expiresAt) {
      this.cache.delete(key);
      return null;
    }
    return cached.result;
  }

  set(language, code, result) {
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
    const key = `${language}:${crypto.createHash("sha256").update(code).digest("hex")}`;
    this.cache.set(key, {
      result,
      expiresAt: Date.now() + this.ttlMs,
    });
  }
}

const executionCache = new CodeExecutionCache();

const sanitizeOutput = (outputStr) => {
  if (typeof outputStr !== "string") return "";
  
  const limit = 10000;
  let truncated = outputStr;
  if (outputStr.length > limit) {
    truncated = outputStr.substring(0, limit) + "\n[Output Truncated: Exceeded Maximum Size Limit]";
  }

  return truncated.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/g, "");
};

export const validateCodeExecutionRequest = (language, code) => {
  const normalizedLanguage = normalizeLanguage(language);
  if (!normalizedLanguage || !SUPPORTED_CODE_LANGUAGES[normalizedLanguage]) {
    return {
      isValid: false,
      result: safeErrorResult(
        CODE_EXECUTION_ERROR_CODES.UNSUPPORTED_LANGUAGE,
        "UNSUPPORTED_LANGUAGE: This code language is not supported.",
      ),
    };
  }

  const sourceCode = typeof code === "string" ? code : "";
  if (Buffer.byteLength(sourceCode, "utf8") > getMaxCodeInputBytes()) {
    return {
      isValid: false,
      result: safeErrorResult(
        CODE_EXECUTION_ERROR_CODES.CODE_INPUT_TOO_LARGE,
        "CODE_INPUT_TOO_LARGE: Code input is too large.",
      ),
    };
  }

  if (hasDangerousPatterns(normalizedLanguage, sourceCode)) {
    return {
      isValid: false,
      result: safeErrorResult(
        CODE_EXECUTION_ERROR_CODES.SUSPICIOUS_CODE_PATTERN,
        "SUSPICIOUS_CODE_PATTERN: Code contains blocked system calls or imports.",
      ),
    };
  }

  return {
    isValid: true,
    normalizedLanguage,
    sourceCode,
    targetLanguage: SUPPORTED_CODE_LANGUAGES[normalizedLanguage],
  };
};

export const executeCode = async (language, code) => {
  const validation = validateCodeExecutionRequest(language, code);
  if (!validation.isValid) {
    return validation.result;
  }

  const normLang = validation.normalizedLanguage;
  const srcCode = validation.sourceCode;

  const cachedResult = executionCache.get(normLang, srcCode);
  if (cachedResult) {
    return cachedResult;
  }

  const targetLang = validation.targetLanguage;
  const startTime = Date.now();

  try {
    const response = await axios.post(
      "https://emacs.piston.rs/api/v2/execute",
      {
        language: targetLang.language,
        version: targetLang.version,
        files: [
          {
            content: srcCode,
          },
        ],
      },
      {
        timeout: 8000,
      },
    );

    const data = response.data;
    const duration = Date.now() - startTime;
    
    let result;
    if (data.compile && data.compile.code !== 0) {
      result = { 
        output: sanitizeOutput(data.compile.output), 
        isError: true,
        duration,
      };
    } else if (data.run) {
      result = { 
        output: sanitizeOutput(data.run.output), 
        isError: data.run.code !== 0,
        duration,
      };
    } else {
      result = { 
        output: "No output returned.", 
        isError: false,
        duration,
      };
    }

    executionCache.set(normLang, srcCode, result);
    return result;

  } catch (error) {
    logger.error("Code execution failed:", error.message);
    const duration = Date.now() - startTime;
    
    let errResult;
    if (error.code === "ECONNABORTED" || error.code === "ETIMEDOUT" || error.message.includes("timeout")) {
      errResult = {
        output: "Execution Service Timeout: The code execution request timed out.",
        isError: true,
        duration
      };
    } else if (error.response?.status === 429) {
      errResult = {
        output: "Execution Service Rate Limited: Too many code execution requests sent to the engine.",
        isError: true,
        duration
      };
    } else if (error.code === 'ENOTFOUND' || error.response?.status >= 500) {
      errResult = {
        output: "Execution Service Unavailable: The remote code execution engine (Piston API) could not be reached.",
        isError: true,
        duration
      };
    } else {
      errResult = {
        output: sanitizeOutput(error.response?.data?.message || error.message || "Failed to execute code."),
        isError: true,
        duration
      };
    }

    return errResult;
  }
};
