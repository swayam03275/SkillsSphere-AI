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
    /child_process/i,
    /require\s*\(\s*['"]fs['"]\s*\)/i,
    /process\.(exit|kill|env|stderr|stdout|stdin)/i,
    /cluster/i,
    /worker_threads/i,
    /eval\s*\(/i,
    /Function\s*\(/i,
    /setInterval/i,
    /setTimeout/i
  ],
  python: [
    /import\s+(os|subprocess|sys|shutil|pty|socket|requests|urllib)/i,
    /from\s+(os|subprocess|sys|shutil|pty|socket|requests|urllib)\s+import/i,
    /__import__\s*\(/i,
    /eval\s*\(/i,
    /exec\s*\(/i,
    /open\s*\(/i
  ],
  cpp: [
    /system\s*\(/i,
    /popen\s*\(/i,
    /fork\s*\(/i,
    /exec(l|p|v)/i,
    /fstream/i,
    /remove\s*\(/i,
    /rename\s*\(/i
  ]
};

const hasDangerousPatterns = (language, code) => {
  const patterns = DANGEROUS_PATTERNS[language];
  if (!patterns) return false;
  return patterns.some(pattern => pattern.test(code));
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
