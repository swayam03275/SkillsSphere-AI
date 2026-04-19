import express from "express";
import { protect } from "../../middleware/auth.middleware.js";
import { authorizeRoles } from "../../middleware/role.middleware.js";

import {
  matchCandidates,
  getMatchResults
} from "./controller.js";

const router = express.Router();

// Only RECRUITER can access

router.get(
  "/candidates",
  protect,
  authorizeRoles("recruiter"),
  matchCandidates
);

router.get(
  "/result/:jobId",
  protect,
  authorizeRoles("recruiter"),
  getMatchResults
);

export default router;