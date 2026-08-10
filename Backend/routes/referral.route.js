import express from "express";
import { getMyReferralCode, getSalesmanReferrals, getUserReferrals } from "../controllers/referral.controller.js";
import { requireAuth, requireRole } from "../middlewares/auth.middleware.js";

const router = express.Router();

router.get("/my-code", requireAuth, getMyReferralCode);
router.get("/admin/salesmen", requireAuth, requireRole(['admin']), getSalesmanReferrals);
router.get("/admin/users", requireAuth, requireRole(['admin']), getUserReferrals);

export default router;
