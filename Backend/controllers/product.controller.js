import fs from "fs";
import path from "path";
import { Product, PurchaseLog, sequelize } from "../models/index.js";

// POST /api/products  (admin)
export const createProduct = async (req, res) => {
    try {
        const { name, hindi_name, category, sub_category, purchase_price_per_gm, selling_price_per_gm, unit } = req.body;
        if (!name || !category || !purchase_price_per_gm || !selling_price_per_gm || !unit) {
            return res.status(400).json({ success: false, message: "name, category, purchase_price_per_gm, selling_price_per_gm and unit are required" });
        }
        
        let image_url = null;
        if (req.file) {
            image_url = `/uploads/${req.file.filename}`;
        }

        const product = await Product.create({ 
            name, hindi_name, image_url, category, sub_category, purchase_price_per_gm, selling_price_per_gm, unit 
        });
        res.status(201).json({ success: true, product });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// GET /api/products
export const getProducts = async (req, res) => {
    try {
        const { category, status } = req.query;
        const where = {};
        if (category) where.category = category;
        if (status) where.status = status;
        // Non-admins only see active products, and never see prices
        const isAdmin = req.user?.role === 'admin';
        if (!isAdmin) where.status = 'active';

        const products = await Product.findAll({ where });

        // Strip cost price info for non-admins
        const data = products.map(p => {
            const obj = p.toJSON();
            if (!isAdmin) {
                delete obj.purchase_price_per_gm;
            }
            return obj;
        });
        res.status(200).json({ success: true, products: data });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// PUT /api/products/:id  (admin)
export const updateProduct = async (req, res) => {
    try {
        const product = await Product.findByPk(req.params.id);
        if (!product) return res.status(404).json({ success: false, message: "Product not found" });

        const updateData = { ...req.body };
        
        if (req.file) {
            // New image uploaded, set new image url
            updateData.image_url = `/uploads/${req.file.filename}`;
            
            // Delete old image if it exists and starts with /uploads/
            if (product.image_url && product.image_url.startsWith("/uploads/")) {
                const oldImagePath = path.join(process.cwd(), product.image_url);
                if (fs.existsSync(oldImagePath)) {
                    fs.unlinkSync(oldImagePath);
                }
            }
        }

        await product.update(updateData);
        res.status(200).json({ success: true, product });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// DELETE /api/products/:id  (admin - soft delete)
export const deleteProduct = async (req, res) => {
    try {
        const product = await Product.findByPk(req.params.id);
        if (!product) return res.status(404).json({ success: false, message: "Product not found" });
        await product.update({ status: 'inactive' });
        res.status(200).json({ success: true, message: "Product deactivated" });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// POST /api/products/purchase (admin)
export const createPurchase = async (req, res) => {
    const t = await sequelize.transaction();
    try {
        const { product_id, quantity, purchase_price_per_kg, selling_price_per_kg } = req.body;
        if (!product_id || !quantity || !purchase_price_per_kg || !selling_price_per_kg) {
            await t.rollback();
            return res.status(400).json({ success: false, message: "product_id, quantity, purchase_price_per_kg, and selling_price_per_kg are required" });
        }

        const product = await Product.findByPk(product_id, { transaction: t });
        if (!product) {
            await t.rollback();
            return res.status(404).json({ success: false, message: "Product not found" });
        }

        const qtyVal = parseFloat(quantity);
        const purchasePricePerKg = parseFloat(purchase_price_per_kg);
        const sellingPricePerKg = parseFloat(selling_price_per_kg);

        let baseQty = qtyVal;
        if (product.unit === 'gm') {
            baseQty = qtyVal * 1000;
        } else if (product.unit === 'ml') {
            baseQty = qtyVal * 1000;
        }

        const totalAmount = qtyVal * purchasePricePerKg;
        const currentStock = parseFloat(product.current_stock || 0);
        
        const isPiece = product.unit === 'piece';
        const newSellingPricePerGm = sellingPricePerKg / (isPiece ? 1 : 1000);

        const updatedTotalPurchased = parseFloat(product.total_purchased_qty || 0) + baseQty;
        const updatedCurrentStock = currentStock + baseQty;

        await product.update({
            selling_price_per_gm: newSellingPricePerGm,
            total_purchased_qty: updatedTotalPurchased,
            current_stock: updatedCurrentStock
        }, { transaction: t });

        const log = await PurchaseLog.create({
            product_id,
            quantity: baseQty,
            purchase_price_per_kg: purchasePricePerKg,
            selling_price_per_kg: sellingPricePerKg,
            total_amount: totalAmount
        }, { transaction: t });

        await t.commit();
        res.status(201).json({ success: true, message: "Purchase recorded successfully", log, product });
    } catch (error) {
        await t.rollback();
        res.status(500).json({ success: false, message: error.message });
    }
};

// GET /api/products/purchases (admin)
export const getPurchases = async (req, res) => {
    try {
        const purchases = await PurchaseLog.findAll({
            include: [{ model: Product, attributes: ['id', 'name', 'unit', 'category'] }],
            order: [['purchase_date', 'DESC']]
        });
        res.status(200).json({ success: true, purchases });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// GET /api/products/stock-summary (admin)
export const getStockSummary = async (req, res) => {
    try {
        const products = await Product.findAll({
            attributes: ['id', 'name', 'category', 'unit', 'purchase_price_per_gm', 'selling_price_per_gm', 'total_purchased_qty', 'total_sold_qty', 'current_stock', 'status']
        });
        res.status(200).json({ success: true, products });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
