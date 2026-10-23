import express from "express";
import {
    getAllUsers, getUserAnalytics, getFilteredCustomers, getCustomerProfile,
    createUser, updateUserStatus, updateUserRole, updateUserDiscount,
    getUserWaterDiscounts, createUserWaterDiscount, deleteUserWaterDiscount
} from "../controllers/userAnalytics.controller.js";
import { requireAuth, requireRole } from "../middlewares/auth.middleware.js";

const router = express.Router();

router.get("/users", requireAuth, requireRole(["admin"]), getAllUsers);
router.post("/users", requireAuth, requireRole(["admin"]), createUser);
router.patch("/users/:id/status", requireAuth, requireRole(["admin"]), updateUserStatus);
router.patch("/users/:id/role", requireAuth, requireRole(["admin"]), updateUserRole);
router.patch("/users/:id/discount", requireAuth, requireRole(["admin"]), updateUserDiscount);

// User Water Discounts
router.get("/users/:id/water-discounts", requireAuth, requireRole(["admin"]), getUserWaterDiscounts);
router.post("/users/:id/water-discounts", requireAuth, requireRole(["admin"]), createUserWaterDiscount);
router.delete("/users/:id/water-discounts/:discountId", requireAuth, requireRole(["admin"]), deleteUserWaterDiscount);

router.get("/customers-filtered", requireAuth, requireRole(["admin"]), getFilteredCustomers);
router.get("/customer-profile/:id", requireAuth, requireRole(["admin"]), getCustomerProfile);
router.get("/:userId", requireAuth, requireRole(["admin"]), getUserAnalytics);

export default router;
