import express from "express";
import { getAttendanceLogs, markAttendance } from "../controllers/attendance.controller.js";
import { requireAuth, requireRole } from "../middlewares/auth.middleware.js";

const router = express.Router();

// Delivery boy marks attendance
router.post("/mark", requireAuth, requireRole(["delivery"]), markAttendance);

// Only admin can view all attendance logs
router.get("/", requireAuth, requireRole(["admin"]), getAttendanceLogs);

export default router;
