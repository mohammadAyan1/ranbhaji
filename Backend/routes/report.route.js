import express from "express";
import { 
    getPurchasedItems, 
    getDeliveredItems, 
    getRegisteredCustomers, 
    getConvertedSubscriptions, 
    getLostCustomers, 
    getLossReport, 
    createManualLoss 
} from "../controllers/report.controller.js";
import { requireAuth, requireRole } from "../middlewares/auth.middleware.js";

const router = express.Router();

router.get("/items-purchased", requireAuth, requireRole(["admin"]), getPurchasedItems);
router.get("/items-delivered", requireAuth, requireRole(["admin"]), getDeliveredItems);
router.get("/customers-registered", requireAuth, requireRole(["admin"]), getRegisteredCustomers);
router.get("/subscriptions-converted", requireAuth, requireRole(["admin"]), getConvertedSubscriptions);
router.get("/lost-customers", requireAuth, requireRole(["admin"]), getLostCustomers);
router.get("/loss", requireAuth, requireRole(["admin"]), getLossReport);
router.post("/loss", requireAuth, requireRole(["admin"]), createManualLoss);

export default router;
