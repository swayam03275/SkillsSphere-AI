import express from "express";
import { protect } from "../../middleware/authMiddleware.js";
import { uploadAvatarMiddleware } from "../../middleware/uploadAvatar.js";
import {
  updateProfile,
  deleteProfile,
  uploadAvatar,
  removeAvatar,
  getPreferences,
  updatePreferences,
  onboardUser,
} from "./controller.js";

const router = express.Router();

router.use(protect);

// 🚀 Onboard User
router.put("/onboard", onboardUser);

router.get("/preferences", getPreferences);
router.put("/preferences", updatePreferences);

// 👤 Update profile name
router.put("/me", updateProfile);

// 🖼️ Upload / replace profile photo
router.put("/me/avatar", uploadAvatarMiddleware, uploadAvatar);

// 🗑️ Remove profile photo
router.delete("/me/avatar", removeAvatar);

// 🗑️ Delete account
router.delete("/me", deleteProfile);

export default router;
