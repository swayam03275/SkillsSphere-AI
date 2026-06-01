import logger from "../utils/logger.js";
import { Worker } from "node:worker_threads";

const DEFAULT_TIMEOUT_MS = 2000;

async function runFnInWorker(fn, timeoutMs = DEFAULT_TIMEOUT_MS) {
  if (typeof fn !== "function") throw new TypeError("fn must be a function");

  const fnSource = fn.toString();

  return new Promise((resolve, reject) => {
    const workerCode = `
      const { parentPort, workerData } = require('worker_threads');
      (async () => {
        try {
          const fn = eval('(' + workerData.fn + ')');
          const res = await fn();
          parentPort.postMessage({ ok: true, res });
        } catch (err) {
          parentPort.postMessage({ ok: false, error: String(err), stack: err?.stack });
        }
      })();
    `;

    let worker;
    try {
      worker = new Worker(workerCode, { eval: true, workerData: { fn: fnSource } });
    } catch (err) {
      return reject(err);
    }

    const timer = setTimeout(() => {
      try {
        worker.terminate();
      } catch (e) {
        // ignore
      }
      reject(new Error("Evaluator timed out"));
    }, timeoutMs);

    worker.on("message", (msg) => {
      clearTimeout(timer);
      if (msg && msg.ok) return resolve(msg.res);
      return reject(new Error(msg?.error || "Evaluator failed"));
    });

    worker.on("error", (err) => {
      clearTimeout(timer);
      reject(err);
    });

    worker.on("exit", (code) => {
      // If exit occurs without message, treat as error
      if (code !== 0) {
        clearTimeout(timer);
        reject(new Error(`Worker exited with code ${code}`));
      }
    });
  });
}

export async function safeEval(name, fn, validateFn, fallback = { score: 0, error: true, details: {}, meta: {} }) {
  try {
    let result;

    // Try to run evaluator inside a worker to guard against CPU/time abuse
    try {
      result = await runFnInWorker(fn);
    } catch (workerErr) {
      // If worker execution fails (serialization, worker not available, timeout),
      // fall back to direct execution but still catch errors.
      logger.warn(`[safeEval] Worker execution failed for "${name}": ${workerErr?.message || workerErr}. Falling back to direct call.`);
      result = await fn();
    }

    const { name: _name, ...dataToValidate } = { ...result };
    const validated = validateFn({
      key: dataToValidate.key || name,
      label: dataToValidate.label || name,
      ...dataToValidate,
    });
    return { ...validated, name };
  } catch (err) {
    logger.error(`[safeEval] Evaluator "${name}" contract violation or failure:`, err?.message || err);
    return {
      ...fallback,
      key: name,
      label: name,
      name,
      weight: 0,
      weightedScore: 0,
      summary: "Evaluator failed to run.",
    };
  }
}

export default safeEval;
