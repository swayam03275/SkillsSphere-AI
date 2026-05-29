/**
 * Attaches req.idempotencyKey from the Idempotency-Key header when present.
 */
export const captureIdempotencyKey = (req, res, next) => {
  const key = req.get("Idempotency-Key")?.trim();
  if (key && key.length <= 128) {
    req.idempotencyKey = key;
  }
  next();
};
