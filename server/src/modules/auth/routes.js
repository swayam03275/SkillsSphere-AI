import express from "express";
import { register, login } from "./controller.js";

const router = express.Router();

// Register user
router.post("/register", register);

// Login user (ISSUE #45 requirement)
router.post("/login", login);

export default router;