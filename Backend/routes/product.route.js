import express from "express";
import { createProduct, getProducts, updateProduct, deleteProduct } from "../controllers/product.controller.js";
import { requireAuth, requireRole } from "../middlewares/auth.middleware.js";

const router = express.Router();

router.get("/", requireAuth, getProducts);
router.post("/", requireAuth, requireRole(["admin"]), createProduct);
router.put("/:id", requireAuth, requireRole(["admin"]), updateProduct);
router.delete("/:id", requireAuth, requireRole(["admin"]), deleteProduct);

export default router;
