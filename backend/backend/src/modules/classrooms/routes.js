import express from "express";
import { protect } from "../../middleware/auth.middleware.js";
import { authorizeRoles } from "../../middleware/role.middleware.js";

const router = express.Router();

// only tutor access
router.use(protect, authorizeRoles("tutor"));

// routes
router.get("/classes", (req, res) => {
  res.send("Tutor classes");
});

export default router;