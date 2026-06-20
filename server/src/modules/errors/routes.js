import express from "express";

import logger from "../../utils/logger.js";

const router = express.Router();

/**
 * @openapi
 * /api/errors:
 *   post:
 *     summary: Log client-side errors
 *     tags: [Errors]
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               message:
 *                 type: string
 *     responses:
 *       204:
 *         description: Error logged successfully
 */
router.post("/", (req, res) => {
  if (process.env.NODE_ENV !== "production") {
    const summary = req.body?.message || "Client error";
    // Keep logs minimal to avoid noise during development.
    logger.warn("[client-error]", summary);
  }

  res.status(204).end();
});

export default router;
