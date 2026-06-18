import express from "express";
import { getNotifications, markNotificationRead } from "../controllers/notification.controller.js";
import { requireAuth } from "../middlewares/auth.middleware.js";

const router = express.Router();

router.get("/", requireAuth, getNotifications);
router.patch("/:id/mark-read", requireAuth, markNotificationRead);

export default router;
