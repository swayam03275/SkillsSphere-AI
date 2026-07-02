import express from "express";
import { protect } from "../../middleware/authMiddleware.js";
import { validateBody } from "../../middleware/validation.js";
import { onboardUserSchema, updateProfileSchema, updatePreferencesSchema, updatePasswordSchema } from "../../validations/users.validation.js";
import { uploadAvatarMiddleware } from "../../middleware/uploadAvatar.js";
import {
  updateProfile,
  deleteProfile,
  uploadAvatar,
  removeAvatar,
  getPreferences,
  updatePreferences,
  onboardUser,
  updatePassword,
} from "./controller.js";

const router = express.Router();

router.use(protect);

/**
 * @openapi
 * /api/users/onboard:
 *   put:
 *     summary: Onboard a new user
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User onboarded
 */
router.put("/onboard", validateBody(onboardUserSchema), onboardUser);

/**
 * @openapi
 * /api/users/preferences:
 *   get:
 *     summary: Get user preferences
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User preferences retrieved
 */
router.get("/preferences", getPreferences);

/**
 * @openapi
 * /api/users/preferences:
 *   put:
 *     summary: Update user preferences
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User preferences updated
 */
router.put("/preferences", validateBody(updatePreferencesSchema), updatePreferences);

/**
 * @openapi
 * /api/users/me:
 *   put:
 *     summary: Update profile name
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Profile updated
 */
router.put("/me", validateBody(updateProfileSchema), updateProfile);

/**
 * @openapi
 * /api/users/me/avatar:
 *   put:
 *     summary: Upload or replace profile photo
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Avatar uploaded
 */
router.put("/me/avatar", uploadAvatarMiddleware, uploadAvatar);

/**
 * @openapi
 * /api/users/me/avatar:
 *   delete:
 *     summary: Remove profile photo
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Avatar removed
 */
router.delete("/me/avatar", removeAvatar);

/**
 * @openapi
 * /api/users/me:
 *   delete:
 *     summary: Delete user account
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Account deleted
 */
router.delete("/me", deleteProfile);

/**
 * @openapi
 * /api/users/me/password:
 *   put:
 *     summary: Update user password
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Password updated
 */
router.put("/me/password", validateBody(updatePasswordSchema), updatePassword);

export default router;
