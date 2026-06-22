import express from "express";
import { createDraft, getDrafts, deleteDraft } from "../controllers/calculator.controller.js";
import { requireAuth, requireRole } from "../middlewares/auth.middleware.js";

const router = express.Router();

router.post("/drafts", requireAuth, requireRole(["admin"]), createDraft);
router.get("/drafts", requireAuth, requireRole(["admin"]), getDrafts);
router.delete("/drafts/:id", requireAuth, requireRole(["admin"]), deleteDraft);

export default router;
