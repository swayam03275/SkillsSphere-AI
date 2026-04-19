import express from "express";
import { protect } from "../../middleware/auth.middleware.js";
import { authorizeRoles } from "../../middleware/role.middleware.js";

const router = express.Router();



router.get(
  "/classes",
  protect,
  authorizeRoles("tutor"),
  (req, res) => {
    res.json({
      success: true,
      message: "Tutor classes fetched successfully",
      data: []
    });
  }
);

export default router;