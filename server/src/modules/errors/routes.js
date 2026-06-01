import express from "express";

import logger from "../../utils/logger.js";

const router = express.Router();

router.post("/", (req, res) => {
  if (process.env.NODE_ENV !== "production") {
    const summary = req.body?.message || "Client error";
    // Keep logs minimal to avoid noise during development.
    logger.warn("[client-error]", summary);
  }

  res.status(204).end();
});

export default router;
