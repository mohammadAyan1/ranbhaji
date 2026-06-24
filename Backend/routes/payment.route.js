import express from "express";
import { initiatePhonePePayment, getPhonePeStatus, phonepeCallback } from "../controllers/payment.controller.js";
import { requireAuth } from "../middlewares/auth.middleware.js";

const router = express.Router();

router.post("/phonepe/initiate", requireAuth, initiatePhonePePayment);
router.get("/phonepe/status/:txnId", requireAuth, getPhonePeStatus);
router.post("/phonepe/callback", phonepeCallback);

export default router;
