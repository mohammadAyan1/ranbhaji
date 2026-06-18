import express from "express";
import { getWallet, addFunds, getTransactions, getTomorrowSummary, getUserSubscriptions, getAllUsers, overrideCredit, updateUserStatus } from "../controllers/wallet.controller.js";
import { requireAuth, requireRole } from "../middlewares/auth.middleware.js";

const router = express.Router();

// Wallet (user)
router.get("/wallet", requireAuth, getWallet);
router.post("/add-funds", requireAuth, addFunds);
router.get("/wallet/transactions", requireAuth, getTransactions);

// Admin
router.get("/admin/tomorrow-summary", requireAuth, requireRole(["admin"]), getTomorrowSummary);
router.get("/admin/users", requireAuth, requireRole(["admin"]), getAllUsers);
router.get("/admin/user/:id/all-subscriptions", requireAuth, requireRole(["admin"]), getUserSubscriptions);
router.patch("/admin/credit/:id/override", requireAuth, requireRole(["admin"]), overrideCredit);
router.patch("/admin/users/:id/status", requireAuth, requireRole(["admin"]), updateUserStatus);

export default router;
