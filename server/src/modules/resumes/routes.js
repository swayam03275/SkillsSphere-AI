import express from "express";
import { uploadResumeMiddleware } from "../../middleware/uploadResume.js";
import {
  uploadResume,
  analyzeResume,
  getResumeResult
} from "./controller.js";


import { protect } from "../../middleware/auth.middleware.js";
import { authorizeRoles } from "../../middleware/role.middleware.js";

const router = express.Router();

router.post(
  "/upload",
  protect,
  authorizeRoles("student"),
  uploadResumeMiddleware,
  uploadResume
);

router.post(
  "/analyze",
  protect,
  authorizeRoles("student"),
  uploadResumeMiddleware,
  analyzeResume
);

router.get(
  "/result/:id",
  protect,
  authorizeRoles("student"),
  getResumeResult
);

export default router;
