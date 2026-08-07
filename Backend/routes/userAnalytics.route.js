import express from "express";
import { getAllUsers, getUserAnalytics, getFilteredCustomers, getCustomerProfile, createUser, updateUserStatus, updateUserRole } from "../controllers/userAnalytics.controller.js";
import { requireAuth, requireRole } from "../middlewares/auth.middleware.js";

const router = express.Router();

router.get("/users", requireAuth, requireRole(["admin"]), getAllUsers);
router.post("/users", requireAuth, requireRole(["admin"]), createUser);
router.patch("/users/:id/status", requireAuth, requireRole(["admin"]), updateUserStatus);
router.patch("/users/:id/role", requireAuth, requireRole(["admin"]), updateUserRole);

router.get("/customers-filtered", requireAuth, requireRole(["admin"]), getFilteredCustomers);
router.get("/customer-profile/:id", requireAuth, requireRole(["admin"]), getCustomerProfile);
router.get("/:userId", requireAuth, requireRole(["admin"]), getUserAnalytics);

export default router;
