import express from "express";
import { createProduct, getProducts, updateProduct, deleteProduct, createPurchase, getPurchases, getStockSummary } from "../controllers/product.controller.js";
import { requireAuth, requireRole } from "../middlewares/auth.middleware.js";

const router = express.Router();

router.get("/", requireAuth, getProducts);
router.post("/", requireAuth, requireRole(["admin"]), createProduct);
router.put("/:id", requireAuth, requireRole(["admin"]), updateProduct);
router.delete("/:id", requireAuth, requireRole(["admin"]), deleteProduct);

// Purchase & Stock routes
router.post("/purchase", requireAuth, requireRole(["admin"]), createPurchase);
router.get("/purchases", requireAuth, requireRole(["admin"]), getPurchases);
router.get("/stock-summary", requireAuth, requireRole(["admin"]), getStockSummary);

export default router;
