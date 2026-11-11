import express from "express";
import { createProduct, getProducts, getPublicVegetables, updateProduct, deleteProduct, createPurchase, getPurchases, updatePurchasePrice, getStockSummary, getProductSales, updateRetailPrice, getProductPurchaseHistory, togglePackageStatus } from "../controllers/product.controller.js";
import { requireAuth, requireRole, optionalAuth } from "../middlewares/auth.middleware.js";
import { upload } from "../middlewares/multer.js";

const router = express.Router();

router.get("/public/vegetables", getPublicVegetables);
router.get("/", optionalAuth, getProducts);
router.post("/", requireAuth, requireRole(["admin"]), upload.single("image"), createProduct);
router.put("/:id", requireAuth, requireRole(["admin"]), upload.single("image"), updateProduct);
router.patch("/:id/package-status", requireAuth, requireRole(["admin"]), togglePackageStatus);
router.put("/:id/retail-price", optionalAuth, updateRetailPrice);
router.get("/:id/purchase-history", requireAuth, requireRole(["admin"]), getProductPurchaseHistory);
router.delete("/:id", requireAuth, requireRole(["admin"]), deleteProduct);

// Purchase & Stock routes (workers can log weight via optionalAuth; price update requires admin)
router.post("/purchase", optionalAuth, createPurchase);
router.get("/purchases", optionalAuth, getPurchases);
router.put("/purchase/:id/price", requireAuth, requireRole(["admin"]), updatePurchasePrice);
router.get("/stock-summary", requireAuth, requireRole(["admin"]), getStockSummary);

// Product Sales Report
router.get("/sales", requireAuth, requireRole(["admin"]), getProductSales);

export default router;
