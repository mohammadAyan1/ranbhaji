import express from "express";
import { getAttendanceLogs, markAttendance } from "../controllers/attendance.controller.js";
import { requireAuth, requireRole } from "../middlewares/auth.middleware.js";

const router = express.Router();

// Delivery boy marks attendance
router.post("/mark", requireAuth, requireRole(["delivery"]), markAttendance);

// View attendance logs (admin views all, delivery views own)
router.get("/", requireAuth, requireRole(["admin", "delivery"]), getAttendanceLogs);

export default router;
