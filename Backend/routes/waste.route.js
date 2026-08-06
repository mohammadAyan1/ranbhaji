import express from "express";
import { requireAuth, requireRole } from "../middlewares/auth.middleware.js";
import { createWasteLog, getWasteLogs } from "../controllers/waste.controller.js";

const router = express.Router();

router.post("/", requireAuth, requireRole(["admin"]), createWasteLog);
router.get("/", requireAuth, requireRole(["admin"]), getWasteLogs);

export default router;
