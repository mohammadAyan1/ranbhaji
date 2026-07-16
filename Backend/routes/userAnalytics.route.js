import express from "express";
import { getAllUsers, getUserAnalytics } from "../controllers/userAnalytics.controller.js";
import { requireAuth, requireRole } from "../middlewares/auth.middleware.js";

const router = express.Router();

router.get("/users", requireAuth, requireRole(["admin"]), getAllUsers);
router.get("/:userId", requireAuth, requireRole(["admin"]), getUserAnalytics);

export default router;
