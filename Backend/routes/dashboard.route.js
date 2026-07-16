import express from "express";
import { getDashboardStats } from "../controllers/dashboard.controller.js";
import { requireAuth, requireRole } from "../middlewares/auth.middleware.js";

const router = express.Router();

router.get("/dashboard-stats", requireAuth, requireRole(["admin"]), getDashboardStats);

export default router;
