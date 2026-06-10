import logger from "../utils/logger.js";
import { TimeoutError } from "./withTimeout.js";

/**
 * @file safeEval.js
 * @description Fault-tolerant evaluator runner.
 *
 * Wraps a single evaluator call so that any error — including contract
 * violations, runtime exceptions, and timeout errors — is caught and
 * converted into a safe fallback result instead of crashing the pipeline.
 *
 * Timeout errors are logged at WARN level (expected degraded-mode events)
 * while all other failures are logged at ERROR level (unexpected failures).
 */

/**
 * Executes an evaluator function safely, catching all errors and returning
 * a structured fallback result on failure.
 *
 * @param {string}   name       - Evaluator name (used in logs and returned result)
 * @param {Function} fn         - Async factory that returns the evaluator promise
 * @param {Function} validateFn - Contract validator for the evaluator result shape
 * @param {Object}   [fallback] - Default result returned on any failure
 * @param {Object}   [options]  - Additional options
 * @param {number}   [options.startTime] - Pipeline-level start time for duration logging
 * @returns {Promise<Object>} Validated evaluator result or safe fallback
 */
export async function safeEval(
  name,
  fn,
  validateFn,
  fallback = { score: 0, error: true, details: {}, meta: {} },
  options = {},
) {
  const evalStart = Date.now();

  try {
    const result = await fn();
    const duration = Date.now() - evalStart;

    const { name: _name, ...dataToValidate } = { ...result };
    const validated = validateFn({
      key: dataToValidate.key || name,
      label: dataToValidate.label || name,
      ...dataToValidate,
    });

    logger.debug(`[safeEval] "${name}" completed in ${duration}ms`);
    return { ...validated, name, _durationMs: duration };

  } catch (err) {
    const duration = Date.now() - evalStart;

    if (err instanceof TimeoutError) {
      // Timeout is an expected degraded-mode event — log at WARN, not ERROR.
      // This keeps production error logs clean during transient API slowdowns.
      logger.warn(
        `[safeEval] Evaluator "${name}" timed out after ${err.timeoutMs}ms ` +
        `(actual elapsed: ${duration}ms) — using fallback result.`
      );
    } else {
      // All other failures (contract violations, runtime errors) are unexpected.
      logger.error(
        `[safeEval] Evaluator "${name}" failed after ${duration}ms:`,
        err?.message || err
      );
    }

    return {
      ...fallback,
      key: name,
      label: name,
      name,
      weight: 0,
      weightedScore: 0,
      // Differentiate timeout from other failures in the pipeline return value
      // so callers can surface "service slow" vs "service broken" to the user.
      summary: err instanceof TimeoutError
        ? `Evaluator timed out after ${err.timeoutMs}ms.`
        : "Evaluator failed to run.",
      error: true,
      timedOut: err instanceof TimeoutError,
      _durationMs: duration,
    };
  }
}

export default safeEval;
