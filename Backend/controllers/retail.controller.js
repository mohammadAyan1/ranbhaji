import { 
    sequelize, RetailOrder, RetailOrderItem, Product, User, Address, WalletTransaction
} from "../models/index.js";

// POST /api/retail/orders (COD Order Creation)
export const createRetailOrder = async (req, res) => {
    const t = await sequelize.transaction();
    try {
        const { address_id, items, payment_method } = req.body;
        const user_id = req.user.id;

        if (!address_id || !items || !Array.isArray(items) || items.length === 0) {
            await t.rollback();
            return res.status(400).json({ success: false, message: "address_id and non-empty items array are required" });
        }

        let subtotal = 0;
        const itemsToSave = [];

        for (const item of items) {
            const product = await Product.findByPk(item.product_id, { transaction: t });
            if (!product || product.status !== 'active') {
                await t.rollback();
                return res.status(404).json({ success: false, message: `Product ID ${item.product_id} not found or inactive` });
            }

            const qtyVal = parseFloat(item.quantity);
            let baseQty = qtyVal;
            if (product.unit === 'gm' || product.unit === 'ml') {
                baseQty = qtyVal * 1000;
            }

            const pricePerGm = parseFloat(product.selling_price_per_gm);
            const itemCost = baseQty * pricePerGm;
            subtotal += itemCost;

            itemsToSave.push({
                product_id: product.id,
                quantity: baseQty,
                price_per_unit: pricePerGm,
                total_price: itemCost
            });
        }

        const deliveryCharge = 30.00;
        const totalAmount = subtotal + deliveryCharge;

        // Cutoff Logic
        const now = new Date();
        const hour = now.getHours();
        const deliveryDate = new Date();
        if (hour < 20) {
            deliveryDate.setDate(deliveryDate.getDate() + 1); // Tomorrow
        } else {
            deliveryDate.setDate(deliveryDate.getDate() + 2); // Next-to-next day
        }
        const deliveryDateStr = deliveryDate.toISOString().split('T')[0];

        let user = null;
        if (payment_method === 'wallet') {
            user = await User.findByPk(user_id, { transaction: t });
            if (!user) {
                await t.rollback();
                return res.status(404).json({ success: false, message: "User not found" });
            }
            if (parseFloat(user.wallet_balance || 0) < totalAmount) {
                await t.rollback();
                return res.status(400).json({ success: false, message: `Insufficient wallet balance. Total amount needed: ₹${totalAmount.toFixed(2)}. Your balance: ₹${parseFloat(user.wallet_balance || 0).toFixed(2)}` });
            }
            const newBalance = parseFloat(user.wallet_balance || 0) - totalAmount;
            await user.update({ wallet_balance: newBalance }, { transaction: t });
            
            await WalletTransaction.create({
                user_id,
                amount: totalAmount,
                type: 'debit',
                reason: `Retail order payment`
            }, { transaction: t });
        }

        const retailOrder = await RetailOrder.create({
            user_id,
            address_id,
            total_amount: totalAmount,
            delivery_charge: deliveryCharge,
            payment_method: payment_method || 'cod',
            payment_status: payment_method === 'wallet' ? 'success' : 'pending',
            delivery_date: deliveryDateStr,
            delivery_status: 'pending'
        }, { transaction: t });

        for (const item of itemsToSave) {
            await RetailOrderItem.create({
                order_id: retailOrder.id,
                product_id: item.product_id,
                quantity: item.quantity,
                price_per_unit: item.price_per_unit,
                total_price: item.total_price
            }, { transaction: t });
        }

        await t.commit();
        res.status(201).json({ success: true, message: "Retail order placed successfully", order: retailOrder });
    } catch (error) {
        await t.rollback();
        res.status(500).json({ success: false, message: error.message });
    }
};

// GET /api/retail/orders (User Order History)
export const getUserRetailOrders = async (req, res) => {
    try {
        const orders = await RetailOrder.findAll({
            where: { user_id: req.user.id },
            include: [
                { model: Address },
                {
                    model: RetailOrderItem,
                    as: 'Items',
                    include: [{ model: Product, attributes: ['id', 'name', 'unit', 'category'] }]
                }
            ],
            order: [['created_at', 'DESC']]
        });
        res.status(200).json({ success: true, orders });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// GET /api/admin/retail/orders (Admin Orders Panel)
export const getAdminRetailOrders = async (req, res) => {
    try {
        const orders = await RetailOrder.findAll({
            include: [
                { model: User, attributes: ['id', 'name', 'phone'] },
                { model: Address },
                {
                    model: RetailOrderItem,
                    as: 'Items',
                    include: [{ model: Product, attributes: ['id', 'name', 'unit', 'category'] }]
                }
            ],
            order: [['created_at', 'DESC']]
        });
        res.status(200).json({ success: true, orders });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// PATCH /api/admin/retail/orders/:id/status (Admin updates delivery/payment status)
export const updateRetailOrderStatus = async (req, res) => {
    const t = await sequelize.transaction();
    try {
        const { status } = req.body; // 'delivered' or 'cancelled'
        const { id } = req.params;

        const order = await RetailOrder.findByPk(id, {
            include: [{ model: RetailOrderItem, as: 'Items' }],
            transaction: t
        });

        if (!order) {
            await t.rollback();
            return res.status(404).json({ success: false, message: "Order not found" });
        }

        if (order.delivery_status !== 'pending') {
            await t.rollback();
            return res.status(400).json({ success: false, message: `Order already processed (Status: ${order.delivery_status})` });
        }

        if (status === 'delivered') {
            // Deduct stock for all retail order items
            for (const item of order.Items) {
                const product = await Product.findByPk(item.product_id, { transaction: t });
                if (product) {
                    const currentStock = parseFloat(product.current_stock || 0);
                    const soldQty = parseFloat(product.total_sold_qty || 0);
                    const orderQty = parseFloat(item.quantity || 0);

                    await product.update({
                        current_stock: currentStock - orderQty,
                        total_sold_qty: soldQty + orderQty
                    }, { transaction: t });
                }
            }

            // Mark order as delivered and success payment if COD
            await order.update({
                delivery_status: 'delivered',
                payment_status: order.payment_method === 'cod' ? 'success' : order.payment_status
            }, { transaction: t });

        } else if (status === 'cancelled') {
            await order.update({
                delivery_status: 'cancelled'
            }, { transaction: t });
        } else {
            await t.rollback();
            return res.status(400).json({ success: false, message: "Invalid status value. Must be 'delivered' or 'cancelled'." });
        }

        await t.commit();
        res.status(200).json({ success: true, message: `Order marked as ${status} successfully`, order });
    } catch (error) {
        await t.rollback();
        res.status(500).json({ success: false, message: error.message });
    }
};
