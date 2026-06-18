import express from "express";
import {
    getTodayDeliveries, markDelivered, requestReturn, reviewReturn,
    getDeliveryHistory, getCompletedDeliveries, getReturns, getProductDemands,
    getAdminSeasonalSelections
} from "../controllers/delivery.controller.js";
import { requireAuth, requireRole } from "../middlewares/auth.middleware.js";
import { upload } from "../middlewares/multer.js";

const router = express.Router();

router.get("/today-deliveries", requireAuth, requireRole(["delivery"]), getTodayDeliveries);
router.post("/mark-delivered", requireAuth, requireRole(["delivery"]), upload.single("photo"), markDelivered);
router.post("/return-item", requireAuth, requireRole(["user"]), upload.single("photo"), requestReturn);
router.patch("/return-item/:id/review", requireAuth, requireRole(["admin"]), reviewReturn);
router.get("/delivery-history", requireAuth, requireRole(["user"]), getDeliveryHistory);
router.get("/admin/deliveries", requireAuth, requireRole(["admin"]), getCompletedDeliveries);
router.get("/admin/returns", requireAuth, requireRole(["admin"]), getReturns);
router.get("/admin/demands", requireAuth, requireRole(["admin"]), getProductDemands);
router.get("/admin/seasonal-selections", requireAuth, requireRole(["admin"]), getAdminSeasonalSelections);

export default router;
