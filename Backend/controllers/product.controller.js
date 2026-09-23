import fs from "fs";
import path from "path";
import { Op } from "sequelize";
import { Product, PurchaseLog, RetailOrder, RetailOrderItem, DeliverySchedule, Subscription, SubscriptionItem, WaterSubscription, DeliveryItem, ScheduleSeasonalSelection, sequelize, ProductionBatch } from '../models/index.js';

// POST /api/products  (admin)
export const createProduct = async (req, res) => {
    try {
        const { name, hindi_name, category, sub_category, purchase_price_per_gm, selling_price_per_gm, unit, unit_id, description, min_retail_qty, weighing_time_seconds, soaking_time_seconds, cutting_mode, pieces_per_25g, time_per_piece_seconds, time_per_25g_seconds, drying_time_seconds, drying_time_per_piece_seconds, drying_time_per_25g_seconds, margin_percentage, water_capacity_liters } = req.body;
        if (!name || !category || (!unit && !unit_id)) {
            return res.status(400).json({ success: false, message: "name, category and unit/unit_id are required" });
        }
        
        let image_url = null;
        if (req.file) {
            image_url = `/uploads/${req.file.filename}`;
        }

        const product = await Product.create({ 
            name, hindi_name, image_url, category, sub_category, 
            purchase_price_per_gm: purchase_price_per_gm || 0, 
            selling_price_per_gm: selling_price_per_gm || 0, 
            default_margin_percentage: margin_percentage || 0,
            unit, unit_id, description,
            water_capacity_liters: water_capacity_liters || 0,
            min_retail_qty: min_retail_qty || 0,
            weighing_time_seconds: weighing_time_seconds || 0,
            soaking_time_seconds: soaking_time_seconds || 0,
            cutting_mode: cutting_mode || 'PER_25G',
            pieces_per_25g: pieces_per_25g || null,
            time_per_piece_seconds: time_per_piece_seconds || null,
            time_per_25g_seconds: time_per_25g_seconds || null,
            drying_time_seconds: drying_time_seconds || 0,
            drying_time_per_piece_seconds: drying_time_per_piece_seconds || 0,
            drying_time_per_25g_seconds: drying_time_per_25g_seconds || 0
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

        const products = await Product.findAll({ 
            where,
            include: [{
                model: PurchaseLog,
                as: 'PurchaseLogs', // Assuming standard association, or we might need to check the model definition
                attributes: ['purchase_price_per_kg', 'purchase_date'],
                order: [['purchase_date', 'DESC']],
                limit: 2,
                separate: true
            }]
        });

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

// GET /api/products/public/vegetables
export const getPublicVegetables = async (req, res) => {
    try {
        const products = await Product.findAll({
            where: { category: 'vegetable', status: 'active' },
            attributes: ['id', 'name', 'hindi_name', 'sub_category', 'image_url']
        });
        res.status(200).json({ success: true, products });
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

        const numericFields = ['pieces_per_25g', 'time_per_piece_seconds', 'time_per_25g_seconds', 'weighing_time_seconds', 'soaking_time_seconds', 'drying_time_seconds', 'drying_time_per_piece_seconds', 'drying_time_per_25g_seconds'];
        for (const field of numericFields) {
            if (updateData[field] === "") {
                updateData[field] = null;
            }
        }

        if (updateData.margin_percentage !== undefined) {
            updateData.default_margin_percentage = updateData.margin_percentage;
            delete updateData.margin_percentage;
        }

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
        if (!product_id || !quantity || !purchase_price_per_kg) {
            await t.rollback();
            return res.status(400).json({ success: false, message: "product_id, quantity, and purchase_price_per_kg are required" });
        }

        const product = await Product.findByPk(product_id, { transaction: t });
        if (!product) {
            await t.rollback();
            return res.status(404).json({ success: false, message: "Product not found" });
        }

        const qtyVal = parseFloat(quantity);
        const purchasePricePerKg = parseFloat(purchase_price_per_kg);
        const sellingPricePerKg = selling_price_per_kg ? parseFloat(selling_price_per_kg) : null;

        let baseQty = qtyVal;
        if (product.unit === 'gm') {
            baseQty = qtyVal * 1000;
        } else if (product.unit === 'ml') {
            baseQty = qtyVal * 1000;
        }

        const totalAmount = qtyVal * purchasePricePerKg;
        const currentStock = parseFloat(product.current_stock || 0);
        
        const updatedTotalPurchased = parseFloat(product.total_purchased_qty || 0) + baseQty;
        const updatedCurrentStock = currentStock + baseQty;
        
        const updateData = {
            total_purchased_qty: updatedTotalPurchased,
            current_stock: updatedCurrentStock
        };

        if (sellingPricePerKg !== null) {
            const isPiece = product.unit === 'piece';
            updateData.selling_price_per_gm = sellingPricePerKg / (isPiece ? 1 : 1000);
        }

        await product.update(updateData, { transaction: t });

        const log = await PurchaseLog.create({
            product_id,
            quantity: baseQty,
            purchase_price_per_kg: purchasePricePerKg,
            selling_price_per_kg: sellingPricePerKg || 0,
            total_amount: totalAmount
        }, { transaction: t });

        // Auto-create a Production Batch so workers have pending tasks
        await ProductionBatch.create({
            product_id,
            date: new Date().toISOString().split('T')[0],
            total_qty_kg: qtyVal,
            pending_qty_kg: qtyVal,
            status: 'pending'
        }, { transaction: t });

        await t.commit();
        
        // Notify socket clients about new production batch
        if (req.app.get('io')) {
            req.app.get('io').emit('production:update', { timestamp: new Date() });
        }
        res.status(201).json({ success: true, message: "Purchase recorded successfully", log, product });
    } catch (error) {
        await t.rollback();
        res.status(500).json({ success: false, message: error.message });
    }
};

// GET /api/products/purchases (admin)
export const getPurchases = async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        let whereClause = {};

        if (startDate && endDate) {
            const endOfDay = new Date(endDate);
            endOfDay.setHours(23, 59, 59, 999);
            whereClause.purchase_date = {
                [Op.between]: [new Date(startDate), endOfDay]
            };
        }

        const purchases = await PurchaseLog.findAll({
            where: whereClause,
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
        const { startDate, endDate } = req.query;
        
        let products = await Product.findAll({
            attributes: ['id', 'name', 'category', 'unit', 'purchase_price_per_gm', 'selling_price_per_gm', 'total_purchased_qty', 'total_sold_qty', 'current_stock', 'status'],
            raw: true
        });

        if (startDate && endDate) {
            const startDateTime = new Date(startDate);
            startDateTime.setHours(0, 0, 0, 0);
            const endDateTime = new Date(endDate);
            endDateTime.setHours(23, 59, 59, 999);

            // 1. Calculate Purchased Qty
            const purchases = await PurchaseLog.findAll({
                where: { purchase_date: { [Op.between]: [startDateTime, endDateTime] } },
                attributes: ['product_id', [sequelize.fn('SUM', sequelize.col('quantity')), 'total_qty']],
                group: ['product_id'],
                raw: true
            });

            const purchaseMap = {};
            purchases.forEach(p => {
                purchaseMap[p.product_id] = parseFloat(p.total_qty || 0);
            });

            // Calculate Yesterday's Purchased Qty
            const prevDayStart = new Date(startDate);
            prevDayStart.setDate(prevDayStart.getDate() - 1);
            prevDayStart.setHours(0, 0, 0, 0);

            const prevDayEnd = new Date(startDate);
            prevDayEnd.setDate(prevDayEnd.getDate() - 1);
            prevDayEnd.setHours(23, 59, 59, 999);

            const yesterdayPurchases = await PurchaseLog.findAll({
                where: { purchase_date: { [Op.between]: [prevDayStart, prevDayEnd] } },
                attributes: ['product_id', [sequelize.fn('SUM', sequelize.col('quantity')), 'total_qty']],
                group: ['product_id'],
                raw: true
            });

            const yesterdayPurchaseMap = {};
            yesterdayPurchases.forEach(p => {
                yesterdayPurchaseMap[p.product_id] = parseFloat(p.total_qty || 0);
            });

            // 2. Calculate Sold Qty
            // 2a. Retail Orders
            const retailItems = await RetailOrderItem.findAll({
                include: [{
                    model: RetailOrder,
                    where: { delivery_date: { [Op.between]: [startDate, endDate] } },
                    attributes: []
                }],
                attributes: ['product_id', [sequelize.fn('SUM', sequelize.col('quantity')), 'totalQty']],
                group: ['product_id'],
                raw: true
            });

            const salesMap = {};
            retailItems.forEach(item => {
                salesMap[item.product_id] = (salesMap[item.product_id] || 0) + parseFloat(item.totalQty || 0);
            });

            // 2b. Package Deliveries (DeliveryItem)
            const deliveryItems = await DeliveryItem.findAll({
                include: [{
                    model: DeliverySchedule,
                    where: { scheduled_date: { [Op.between]: [startDate, endDate] } },
                    attributes: []
                }],
                attributes: ['product_id', [sequelize.fn('SUM', sequelize.col('qty_gm')), 'totalQty']],
                group: ['product_id'],
                raw: true
            });

            deliveryItems.forEach(item => {
                salesMap[item.product_id] = (salesMap[item.product_id] || 0) + parseFloat(item.totalQty || 0);
            });

            // 2c. Package Deliveries (Seasonal Selections)
            const seasonalItems = await ScheduleSeasonalSelection.findAll({
                include: [{
                    model: DeliverySchedule,
                    where: { scheduled_date: { [Op.between]: [startDate, endDate] } },
                    attributes: []
                }],
                attributes: ['product_id', [sequelize.fn('SUM', sequelize.col('qty_gm')), 'totalQty']],
                group: ['product_id'],
                raw: true
            });

            seasonalItems.forEach(item => {
                salesMap[item.product_id] = (salesMap[item.product_id] || 0) + parseFloat(item.totalQty || 0);
            });

            // Apply to products
            products = products.map(p => {
                let purchased = purchaseMap[p.id] || 0;
                let sold = salesMap[p.id] || 0;
                let yesterday_purchased = yesterdayPurchaseMap[p.id] || 0;

                return {
                    ...p,
                    total_purchased_qty: purchased,
                    total_sold_qty: sold,
                    yesterday_purchased_qty: yesterday_purchased
                };
            });
        }

        res.status(200).json({ success: true, products });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// GET /api/products/sales (admin)
export const getProductSales = async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        if (!startDate || !endDate) {
            return res.status(400).json({ success: false, message: "startDate and endDate are required" });
        }

        // Fetch all products
        const products = await Product.findAll({
            attributes: ['id', 'name', 'unit', 'category']
        });

        const productSalesMap = {};
        products.forEach(p => {
            productSalesMap[p.id] = {
                id: p.id,
                name: p.name,
                unit: p.unit,
                category: p.category,
                totalQty: 0,
                retailQty: 0,
                packageQty: 0
            };
        });

        // 1. Retail Orders
        const retailItems = await RetailOrderItem.findAll({
            include: [{
                model: RetailOrder,
                where: { delivery_date: { [Op.between]: [startDate, endDate] } },
                attributes: []
            }],
            attributes: ['product_id', [sequelize.fn('SUM', sequelize.col('quantity')), 'totalQty']],
            group: ['product_id']
        });

        retailItems.forEach(item => {
            const pid = item.product_id;
            const qty = parseFloat(item.dataValues.totalQty || 0);
            if (productSalesMap[pid]) {
                productSalesMap[pid].retailQty += qty;
                productSalesMap[pid].totalQty += qty;
            }
        });

        // 2. Package Deliveries (DeliveryItem)
        const deliveryItems = await DeliveryItem.findAll({
            include: [{
                model: DeliverySchedule,
                where: { scheduled_date: { [Op.between]: [startDate, endDate] } },
                attributes: []
            }],
            attributes: ['product_id', [sequelize.fn('SUM', sequelize.col('qty_gm')), 'totalQty']],
            group: ['product_id']
        });

        deliveryItems.forEach(item => {
            const pid = item.product_id;
            const qty = parseFloat(item.dataValues.totalQty || 0);
            if (productSalesMap[pid]) {
                productSalesMap[pid].packageQty += qty;
                productSalesMap[pid].totalQty += qty;
            }
        });

        // 3. Package Deliveries (Seasonal Selections)
        const seasonalItems = await ScheduleSeasonalSelection.findAll({
            include: [{
                model: DeliverySchedule,
                where: { scheduled_date: { [Op.between]: [startDate, endDate] } },
                attributes: []
            }],
            attributes: ['product_id', [sequelize.fn('SUM', sequelize.col('qty_gm')), 'totalQty']],
            group: ['product_id']
        });

        seasonalItems.forEach(item => {
            const pid = item.product_id;
            const qty = parseFloat(item.dataValues.totalQty || 0);
            if (productSalesMap[pid]) {
                productSalesMap[pid].packageQty += qty;
                productSalesMap[pid].totalQty += qty;
            }
        });

        // Convert map to array and filter out products with 0 total qty (optional)
        // Let's filter out products with 0 qty to make it cleaner
        const salesData = Object.values(productSalesMap)
            .filter(p => p.totalQty > 0)
            .sort((a, b) => b.totalQty - a.totalQty);

        res.status(200).json({ success: true, data: salesData });
    } catch (error) {
        console.error("Error in getProductSales:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// PUT /api/products/:id/retail-price
export const updateRetailPrice = async (req, res) => {
    try {
        const { id } = req.params;
        const { markup_percentage } = req.body;

        if (markup_percentage === undefined) {
            return res.status(400).json({ success: false, message: "markup_percentage is required" });
        }

        const product = await Product.findByPk(id);
        if (!product) {
            return res.status(404).json({ success: false, message: "Product not found" });
        }

        const percentage = parseFloat(markup_percentage);
        const purchasePrice = parseFloat(product.purchase_price_per_gm || 0);

        const newSellingPrice = purchasePrice * (percentage / 100);

        await product.update({
            selling_price_per_gm: newSellingPrice
        });

        // Update today's purchase log so frontend knows the margin is set
        const todayStart = new Date();
        todayStart.setMinutes(todayStart.getMinutes() + 330);
        todayStart.setUTCHours(0, 0, 0, 0);
        todayStart.setMinutes(todayStart.getMinutes() - 330);

        const todayEnd = new Date();
        todayEnd.setMinutes(todayEnd.getMinutes() + 330);
        todayEnd.setUTCHours(23, 59, 59, 999);
        todayEnd.setMinutes(todayEnd.getMinutes() - 330);

        const recentLog = await PurchaseLog.findOne({
            where: {
                product_id: id,
                purchase_date: {
                    [Op.between]: [todayStart, todayEnd]
                }
            },
            order: [['purchase_date', 'DESC']]
        });

        if (recentLog) {
            await recentLog.update({
                selling_price_per_kg: newSellingPrice * (product.unit === 'piece' ? 1 : 1000)
            });
        }

        res.status(200).json({ success: true, message: "Retail price updated successfully", product });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// GET /api/products/:id/purchase-history
export const getProductPurchaseHistory = async (req, res) => {
    try {
        const { id } = req.params;
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        thirtyDaysAgo.setHours(0, 0, 0, 0);

        const logs = await PurchaseLog.findAll({
            where: {
                product_id: id,
                purchase_date: {
                    [Op.gte]: thirtyDaysAgo
                }
            },
            order: [['purchase_date', 'ASC']]
        });

        res.status(200).json({ success: true, logs });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
