import express from "express";
import {
    createAddress, getAddresses, updateAddress, deleteAddress, setDefaultAddress, updateLocation,
    getUnassignedAddresses, assignZone
} from "../controllers/address.controller.js";
import { requireAuth, requireRole } from "../middlewares/auth.middleware.js";

const router = express.Router();

// Allow delivery and admin to update location
router.patch("/:id/location", requireAuth, requireRole(["delivery", "admin"]), updateLocation);

// Admin only routes
router.get("/admin/unassigned", requireAuth, requireRole(["admin"]), getUnassignedAddresses);
router.patch("/admin/:id/zone", requireAuth, requireRole(["admin"]), assignZone);

// User only routes
router.use(requireAuth, requireRole(["user"]));

router.post("/", createAddress);
router.get("/", getAddresses);
router.put("/:id", updateAddress);
router.delete("/:id", deleteAddress);
router.patch("/:id/default", setDefaultAddress);

export default router;
