import express from "express";
import { createPackage, getPackages, getPackageById, updatePackage } from "../controllers/package.controller.js";
import { requireAuth, requireRole, optionalAuth } from "../middlewares/auth.middleware.js";
import { upload } from "../middlewares/multer.js";

const router = express.Router();

router.get("/", optionalAuth, getPackages);
router.get("/:id", requireAuth, getPackageById);
router.post("/", requireAuth, requireRole(["admin"]), upload.single("image"), createPackage);
router.put("/:id", requireAuth, requireRole(["admin"]), upload.single("image"), updatePackage);

export default router;
