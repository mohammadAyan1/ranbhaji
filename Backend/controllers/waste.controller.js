import { WasteLog, Product } from "../models/index.js";

// POST /api/waste
export const createWasteLog = async (req, res) => {
    try {
        const { product_id, quantity, remark } = req.body;
        if (!product_id || !quantity) {
            return res.status(400).json({ success: false, message: "Product and quantity are required" });
        }

        const log = await WasteLog.create({
            product_id,
            quantity,
            remark
        });

        const product = await Product.findByPk(product_id);
        if (product) {
            await product.update({
                current_stock: Math.max(0, parseFloat(product.current_stock || 0) - parseFloat(quantity))
            });
        }

        const wasteWithProduct = await WasteLog.findByPk(log.id, {
            include: [{ model: Product, attributes: ['name', 'hindi_name', 'unit'] }]
        });

        res.status(201).json({ success: true, message: "Waste logged successfully", waste: wasteWithProduct });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// GET /api/waste
export const getWasteLogs = async (req, res) => {
    try {
        const logs = await WasteLog.findAll({
            include: [{ model: Product, attributes: ['name', 'hindi_name', 'unit'] }],
            order: [['waste_date', 'DESC'], ['created_at', 'DESC']]
        });
        res.status(200).json({ success: true, logs });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
