/**
 * @file withTimeout.js
 * @description Wraps a promise with a hard deadline.
 *
 * If the wrapped promise does not settle within `ms` milliseconds, the returned
 * promise is rejected with a `TimeoutError`. The rejection carries the evaluator
 * name so that `safeEval` / `runPipeline` can log exactly which evaluator stalled
 * rather than showing a generic timeout message.
 *
 * Usage:
 *   const result = await withTimeout(someEvaluator(), 10_000, "semanticMatch");
 */

/**
 * A structured error thrown when an evaluator exceeds its time budget.
 * Extends the native Error so that `instanceof TimeoutError` works reliably.
 */
export class TimeoutError extends Error {
  /**
   * @param {string} evaluatorName - Name of the evaluator that timed out
   * @param {number} ms            - The deadline in milliseconds that was exceeded
   */
  constructor(evaluatorName, ms) {
    super(`[Timeout] Evaluator "${evaluatorName}" did not complete within ${ms}ms`);
    this.name = "TimeoutError";
    this.evaluatorName = evaluatorName;
    this.timeoutMs = ms;
  }
}

/**
 * Reads the per-evaluator timeout from the environment.
 *
 * Priority:
 *   1. `process.env.EVALUATOR_TIMEOUT_MS`  — per-evaluator deadline (default: 10 000 ms)
 *
 * Values that are not positive safe integers fall back to the default.
 *
 * @returns {number} Per-evaluator deadline in milliseconds
 */
export const getEvaluatorTimeoutMs = () => {
  const configured = Number(process.env.EVALUATOR_TIMEOUT_MS);
  return Number.isSafeInteger(configured) && configured > 0
    ? configured
    : 10_000;
};

/**
 * Reads the global pipeline timeout from the environment.
 *
 * Priority:
 *   1. `process.env.PIPELINE_TIMEOUT_MS`  — global deadline (default: 30 000 ms)
 *
 * @returns {number} Global pipeline deadline in milliseconds
 */
export const getPipelineTimeoutMs = () => {
  const configured = Number(process.env.PIPELINE_TIMEOUT_MS);
  return Number.isSafeInteger(configured) && configured > 0
    ? configured
    : 30_000;
};

/**
 * Wraps `promise` with a hard deadline of `ms` milliseconds.
 *
 * - If `promise` resolves before the deadline  → resolves with the same value.
 * - If `promise` rejects before the deadline   → rejects with the same reason.
 * - If the deadline fires first                → rejects with a `TimeoutError`.
 *
 * The internal timer is always cleared after settlement so that dangling
 * `setTimeout` handles never prevent the Node.js event loop from exiting.
 *
 * @template T
 * @param {Promise<T>} promise       - The promise to race against the clock
 * @param {number}     ms            - Deadline in milliseconds (must be > 0)
 * @param {string}     evaluatorName - Human-readable name used in error messages
 * @returns {Promise<T>}
 */
export function withTimeout(promise, ms, evaluatorName) {
  if (typeof ms !== "number" || ms <= 0) {
    // Defensive: invalid deadline → return promise unwrapped so the pipeline
    // never silently breaks if withTimeout is called with bad arguments.
    return promise;
  }

  let timerId;

  const timeoutRace = new Promise((_resolve, reject) => {
    timerId = setTimeout(() => {
      reject(new TimeoutError(evaluatorName, ms));
    }, ms);
  });

  return Promise.race([promise, timeoutRace]).finally(() => {
    // Always clear the timer — whether the original promise won or timed out.
    // Prevents the timer from firing after the pipeline has already moved on.
    clearTimeout(timerId);
  });
}

export default withTimeout;
