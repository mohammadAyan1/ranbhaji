import express from "express";
import { createProduct, getProducts, updateProduct, deleteProduct, createPurchase, getPurchases, getStockSummary, getProductSales } from "../controllers/product.controller.js";
import { requireAuth, requireRole } from "../middlewares/auth.middleware.js";
import { upload } from "../middlewares/multer.js";

const router = express.Router();

router.get("/", requireAuth, getProducts);
router.post("/", requireAuth, requireRole(["admin"]), upload.single("image"), createProduct);
router.put("/:id", requireAuth, requireRole(["admin"]), upload.single("image"), updateProduct);
router.delete("/:id", requireAuth, requireRole(["admin"]), deleteProduct);

// Purchase & Stock routes
router.post("/purchase", requireAuth, requireRole(["admin"]), createPurchase);
router.get("/purchases", requireAuth, requireRole(["admin"]), getPurchases);
router.get("/stock-summary", requireAuth, requireRole(["admin"]), getStockSummary);

// Product Sales Report
router.get("/sales", requireAuth, requireRole(["admin"]), getProductSales);

export default router;
