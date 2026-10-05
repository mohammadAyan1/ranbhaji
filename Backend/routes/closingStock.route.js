import express from "express";
import { requireAuth, requireRole } from "../middlewares/auth.middleware.js";
import { getClosingStockReport, saveClosingStock } from "../controllers/closingStock.controller.js";

const router = express.Router();

router.get('/', requireAuth, requireRole(['admin', 'super_admin']), getClosingStockReport);
router.post('/', requireAuth, requireRole(['admin', 'super_admin']), saveClosingStock);

export default router;
