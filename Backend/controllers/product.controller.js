import { Product } from "../models/index.js";

// POST /api/products  (admin)
export const createProduct = async (req, res) => {
    try {
        const { name, category, sub_category, purchase_price_per_gm, selling_price_per_gm, unit } = req.body;
        if (!name || !category || !purchase_price_per_gm || !selling_price_per_gm || !unit) {
            return res.status(400).json({ success: false, message: "name, category, purchase_price_per_gm, selling_price_per_gm and unit are required" });
        }
        const product = await Product.create({ name, category, sub_category, purchase_price_per_gm, selling_price_per_gm, unit });
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
        await product.update(req.body);
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
