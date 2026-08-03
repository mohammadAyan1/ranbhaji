import express from "express";
import { createProduct, getProducts, getPublicVegetables, updateProduct, deleteProduct, createPurchase, getPurchases, getStockSummary, getProductSales, updateRetailPrice } from "../controllers/product.controller.js";
import { requireAuth, requireRole, optionalAuth } from "../middlewares/auth.middleware.js";
import { upload } from "../middlewares/multer.js";

const router = express.Router();

router.get("/public/vegetables", getPublicVegetables);
router.get("/", optionalAuth, getProducts);
router.post("/", requireAuth, requireRole(["admin"]), upload.single("image"), createProduct);
router.put("/:id", requireAuth, requireRole(["admin"]), upload.single("image"), updateProduct);
router.put("/:id/retail-price", requireAuth, requireRole(["admin"]), updateRetailPrice);
router.delete("/:id", requireAuth, requireRole(["admin"]), deleteProduct);

// Purchase & Stock routes
router.post("/purchase", requireAuth, requireRole(["admin"]), createPurchase);
router.get("/purchases", requireAuth, requireRole(["admin"]), getPurchases);
router.get("/stock-summary", requireAuth, requireRole(["admin"]), getStockSummary);

// Product Sales Report
router.get("/sales", requireAuth, requireRole(["admin"]), getProductSales);

export default router;
