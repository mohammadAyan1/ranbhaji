import express from "express";
import { createRetailOrder, getUserRetailOrders, getAdminRetailOrders, updateRetailOrderStatus } from "../controllers/retail.controller.js";
import { requireAuth, requireRole } from "../middlewares/auth.middleware.js";

const router = express.Router();

router.post("/", requireAuth, createRetailOrder);
router.get("/", requireAuth, getUserRetailOrders);
router.get("/admin", requireAuth, requireRole(["admin"]), getAdminRetailOrders);
router.patch("/admin/:id/status", requireAuth, requireRole(["admin"]), updateRetailOrderStatus);

export default router;
