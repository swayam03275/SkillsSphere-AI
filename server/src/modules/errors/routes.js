import express from "express";

const router = express.Router();

router.post("/", (req, res) => {
  if (process.env.NODE_ENV !== "production") {
    const summary = req.body?.message || "Client error";
    // Keep logs minimal to avoid noise during development.
    console.warn("[client-error]", summary);
  }

  res.status(204).end();
});

export default router;
