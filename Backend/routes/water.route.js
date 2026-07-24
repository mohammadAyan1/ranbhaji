import express from "express";
import { 
    subscribeWater, getWaterSubscriptions, getWaterAvailableDates, 
    confirmWaterStartDate, pauseWaterSubscription, restartWaterSubscription, cancelWaterSubscription,
    updateWaterSubscriptionBatch
} from "../controllers/water.controller.js";
import { requireAuth, requireRole } from "../middlewares/auth.middleware.js";

const router = express.Router();

router.post("/subscribe", requireAuth, requireRole(["user"]), subscribeWater);
router.get("/subscriptions", requireAuth, requireRole(["user"]), getWaterSubscriptions);
router.get("/available-dates", requireAuth, requireRole(["user"]), getWaterAvailableDates);
router.post("/confirm-start-date", requireAuth, requireRole(["user"]), confirmWaterStartDate);
router.patch("/:id/pause", requireAuth, requireRole(["user"]), pauseWaterSubscription);
router.patch("/:id/restart", requireAuth, requireRole(["user"]), restartWaterSubscription);
router.patch("/:id/cancel", requireAuth, requireRole(["user"]), cancelWaterSubscription);

// Admin routes
router.patch("/admin/water/:id/batch", requireAuth, requireRole(["admin"]), updateWaterSubscriptionBatch);

export default router;
