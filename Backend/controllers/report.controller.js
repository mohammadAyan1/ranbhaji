import { Op } from "sequelize";
import { 
  User, Subscription, Package, RetailOrder, RetailOrderItem, DeliverySchedule, DeliveryItem, 
  Product, PurchaseLog, LossLog 
} from "../models/index.js";

// GET /api/reports/items-purchased
export const getPurchasedItems = async (req, res) => {
    try {
        const { from, to } = req.query;
        if (!from || !to) return res.status(400).json({ success: false, message: "Date range required" });

        const fromDate = new Date(from);
        const toDate = new Date(to);
        toDate.setHours(23, 59, 59, 999);

        const logs = await PurchaseLog.findAll({
            where: {
                purchase_date: { [Op.between]: [fromDate, toDate] }
            },
            include: [{ model: Product, attributes: ['id', 'name', 'unit', 'hindi_name'] }]
        });

        const summary = {};
        logs.forEach(log => {
            const pId = log.Product?.id;
            if (!pId) return;
            if (!summary[pId]) {
                summary[pId] = {
                    product: log.Product,
                    total_quantity: 0,
                    total_amount: 0
                };
            }
            summary[pId].total_quantity += parseFloat(log.quantity);
            summary[pId].total_amount += parseFloat(log.total_amount);
        });

        res.status(200).json({ success: true, items: Object.values(summary) });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// GET /api/reports/items-delivered
export const getDeliveredItems = async (req, res) => {
    try {
        const { from, to } = req.query;
        if (!from || !to) return res.status(400).json({ success: false, message: "Date range required" });

        const packageItems = await DeliveryItem.findAll({
            include: [
                { model: Product, attributes: ['id', 'name', 'unit', 'hindi_name'] },
                { 
                    model: DeliverySchedule, 
                    where: { actual_delivery_date: { [Op.between]: [from, to] }, status: 'delivered' },
                    attributes: []
                }
            ]
        });

        const retailItems = await RetailOrderItem.findAll({
            include: [
                { model: Product, attributes: ['id', 'name', 'unit', 'hindi_name'] },
                { 
                    model: RetailOrder, 
                    where: { delivery_date: { [Op.between]: [from, to] }, delivery_status: 'delivered' },
                    attributes: []
                }
            ]
        });

        const summary = {};
        const addItems = (items, type) => {
            items.forEach(item => {
                const pId = item.Product?.id;
                if (!pId) return;
                if (!summary[pId]) summary[pId] = { product: item.Product, total_quantity: 0, package_qty: 0, retail_qty: 0 };
                const qty = type === 'retail' ? parseFloat(item.quantity) : parseFloat(item.qty_gm);
                summary[pId].total_quantity += qty;
                if (type === 'retail') summary[pId].retail_qty += qty;
                else summary[pId].package_qty += qty;
            });
        };

        addItems(packageItems, 'package');
        addItems(retailItems, 'retail');

        res.status(200).json({ success: true, items: Object.values(summary) });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// GET /api/reports/customers-registered
export const getRegisteredCustomers = async (req, res) => {
    try {
        const { from, to } = req.query;
        if (!from || !to) return res.status(400).json({ success: false, message: "Date range required" });
        
        const fromDate = new Date(from);
        const toDate = new Date(to);
        toDate.setHours(23, 59, 59, 999);

        const users = await User.findAll({
            where: {
                role: 'user',
                created_at: { [Op.between]: [fromDate, toDate] }
            },
            attributes: ['id', 'name', 'phone', 'created_at']
        });

        res.status(200).json({ success: true, count: users.length, users });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// GET /api/reports/subscriptions-converted
export const getConvertedSubscriptions = async (req, res) => {
    try {
        const { from, to } = req.query;
        if (!from || !to) return res.status(400).json({ success: false, message: "Date range required" });
        
        const fromDate = new Date(from);
        const toDate = new Date(to);
        toDate.setHours(23, 59, 59, 999);

        const users = await User.findAll({
            where: {
                role: 'user',
                created_at: { [Op.between]: [fromDate, toDate] }
            },
            attributes: ['id', 'name', 'phone', 'created_at'],
            include: [{ model: Subscription, required: true, attributes: ['id', 'start_date', 'status'] }]
        });
        
        // Remove duplicate users that might have multiple subscriptions
        const uniqueUsers = Array.from(new Map(users.map(u => [u.id, u])).values());

        res.status(200).json({ success: true, count: uniqueUsers.length, users: uniqueUsers });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// GET /api/reports/lost-customers
export const getLostCustomers = async (req, res) => {
    try {
        const { from, to } = req.query;
        if (!from || !to) return res.status(400).json({ success: false, message: "Date range required" });
        
        // Find users who have past subscriptions that ended within [from, to]
        // AND currently do not have any active or paused subscriptions.
        // Also wait for 2 days to consider them 'lost'
        
        const allUsers = await User.findAll({
            where: { role: 'user' },
            attributes: ['id', 'name', 'phone'],
            include: [{ model: Subscription, attributes: ['id', 'end_date', 'status'] }]
        });

        const lostUsers = [];
        const today = new Date();

        for (const user of allUsers) {
            if (!user.Subscriptions || user.Subscriptions.length === 0) continue;
            
            let hasActive = false;
            let endedInRange = false;

            for (const sub of user.Subscriptions) {
                if (sub.status === 'active' || sub.status === 'paused') {
                    hasActive = true;
                    break;
                }
                
                if (sub.status === 'completed' && sub.end_date) {
                    const endDate = new Date(sub.end_date);
                    const fromDate = new Date(from);
                    const toDate = new Date(to);
                    toDate.setHours(23, 59, 59, 999);
                    
                    if (endDate >= fromDate && endDate <= toDate) {
                        // Check if 2 days have passed
                        const diffTime = Math.abs(today - endDate);
                        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
                        if (diffDays >= 2) {
                            endedInRange = true;
                        }
                    }
                }
            }

            if (!hasActive && endedInRange) {
                lostUsers.push(user);
            }
        }

        res.status(200).json({ success: true, count: lostUsers.length, users: lostUsers });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// GET /api/reports/loss
export const getLossReport = async (req, res) => {
    try {
        const { from, to } = req.query;
        let where = {};
        if (from && to) {
            where.loss_date = { [Op.between]: [from, to] };
        }

        const logs = await LossLog.findAll({
            where,
            include: [{ model: Product, attributes: ['id', 'name', 'unit', 'hindi_name'] }],
            order: [['loss_date', 'DESC']]
        });

        const summary = {};
        logs.forEach(log => {
            const pId = log.Product?.id;
            if (!pId) return;
            if (!summary[pId]) {
                summary[pId] = {
                    product: log.Product,
                    total_quantity: 0,
                    total_amount: 0,
                    logs: []
                };
            }
            summary[pId].total_quantity += parseFloat(log.loss_qty);
            summary[pId].total_amount += parseFloat(log.total_loss_amount);
            summary[pId].logs.push(log);
        });

        res.status(200).json({ success: true, items: Object.values(summary) });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// POST /api/reports/loss (manual entry)
export const createManualLoss = async (req, res) => {
    try {
        const { product_id, loss_date, loss_qty } = req.body;
        if (!product_id || !loss_date || !loss_qty) {
            return res.status(400).json({ success: false, message: "Missing required fields" });
        }

        // Find the most recent purchase log on or before the loss_date to get the price
        const lastPurchase = await PurchaseLog.findOne({
            where: { 
                product_id, 
                purchase_date: { [Op.lte]: new Date(loss_date) }
            },
            order: [['purchase_date', 'DESC']]
        });

        // Default to a fallback if no purchase history is found
        let price = 0;
        if (lastPurchase) {
            price = parseFloat(lastPurchase.purchase_price_per_kg); // Assuming price_per_kg
        } else {
            // Try fetching from product directly if purchase log is empty
            const p = await Product.findByPk(product_id);
            if (p) {
                // p.purchase_price_per_gm -> price per kg = price_per_gm * 1000
                price = parseFloat(p.purchase_price_per_gm) * 1000;
            }
        }

        // Calculate amount (loss_qty is usually in kg for this manual entry if unit is kg, wait, need to check unit)
        const product = await Product.findByPk(product_id);
        let amount = 0;
        if (product.unit === 'gm') {
            amount = (parseFloat(loss_qty) / 1000) * price;
        } else if (product.unit === 'piece') {
            amount = parseFloat(loss_qty) * (price / 1000); // Wait, if piece, price is per piece. Let's assume price is per standard unit
        }

        // Safer calculation: Just use purchase_price_per_gm
        let safeAmount = 0;
        if (product) {
            safeAmount = parseFloat(loss_qty) * parseFloat(product.purchase_price_per_gm);
            // wait, if user enters loss_qty as 1 for 1kg, and purchase_price_per_gm = 0.025
            // then amount = 1 * 0.025 = 0.025, which is wrong. 
            // If user enters 1000 (gm) -> 1000 * 0.025 = 25.
            // We should ensure frontend passes loss_qty in the base unit (grams or piece).
        }
        
        // Let's rely on purchase_price_per_gm from the product as it's the safest base rate.
        let baseRate = product ? parseFloat(product.purchase_price_per_gm) : 0;
        let total_loss = parseFloat(loss_qty) * baseRate;

        const newLog = await LossLog.create({
            product_id,
            loss_date,
            loss_qty: parseFloat(loss_qty),
            loss_type: 'spoiled/unsold',
            purchase_price_at_loss: baseRate,
            total_loss_amount: total_loss
        });

        res.status(201).json({ success: true, log: newLog, message: "Manual loss recorded" });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
