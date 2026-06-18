import express from "express";
import {
    subscribe, getMySubscriptions, getAvailableDates, confirmStartDate,
    pauseSubscription, restartSubscription, cancelSubscription,
    getSeasonalOptions, selectSeasonalItems,
    getUpcomingSelections, saveScheduleSeasonal
} from "../controllers/subscription.controller.js";
import { requireAuth, requireRole } from "../middlewares/auth.middleware.js";

const router = express.Router();

router.post("/subscribe", requireAuth, requireRole(["user"]), subscribe);
router.get("/my-subscriptions", requireAuth, requireRole(["user"]), getMySubscriptions);
router.get("/available-dates", requireAuth, getAvailableDates);
router.post("/confirm-start-date", requireAuth, requireRole(["user"]), confirmStartDate);
router.patch("/subscriptions/:id/pause", requireAuth, requireRole(["user"]), pauseSubscription);
router.patch("/subscriptions/:id/restart", requireAuth, requireRole(["user"]), restartSubscription);
router.patch("/subscriptions/:id/cancel", requireAuth, requireRole(["user"]), cancelSubscription);
router.get("/seasonal-options/:subscription_id", requireAuth, requireRole(["user"]), getSeasonalOptions);
router.post("/select-seasonal", requireAuth, requireRole(["user"]), selectSeasonalItems);
router.patch("/update-seasonal", requireAuth, requireRole(["user"]), selectSeasonalItems);

router.get("/subscriptions/:id/upcoming-selections", requireAuth, requireRole(["user"]), getUpcomingSelections);
router.post("/subscriptions/:id/schedule-seasonal", requireAuth, requireRole(["user"]), saveScheduleSeasonal);

export default router;
