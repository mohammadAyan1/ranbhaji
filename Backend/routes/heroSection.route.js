import express from "express";
import {
    getPublicHeroSection,
    getAllHeroSections,
    saveHeroSection,
    deleteHeroSection,
    toggleHeroStatus
} from "../controllers/heroSection.controller.js";
import { optionalAuth } from "../middlewares/auth.middleware.js";
import { upload } from "../middlewares/multer.js";

const router = express.Router();

// Public routes for Next.js website
router.get("/", getPublicHeroSection);
router.get("/public", getPublicHeroSection);

// Admin routes
router.get("/all", optionalAuth, getAllHeroSections);
router.post("/", optionalAuth, upload.single("image"), saveHeroSection);
router.put("/", optionalAuth, upload.single("image"), saveHeroSection);
router.put("/:id", optionalAuth, upload.single("image"), saveHeroSection);
router.delete("/:id", optionalAuth, deleteHeroSection);
router.patch("/:id/status", optionalAuth, toggleHeroStatus);

export default router;
