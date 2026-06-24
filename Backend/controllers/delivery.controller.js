import { Op } from "sequelize";
import { sequelize } from "../confiq/db.js";
import {
    DeliverySchedule, DeliveryItem, Subscription, SubscriptionItem, User, Product,
    WalletTransaction, Notification, WaterSubscription, Package, Address,
    ScheduleSeasonalSelection, PackageSeasonalConfig
} from "../models/index.js";
import path from "path";

// GET /api/today-deliveries  (delivery role)
export const getTodayDeliveries = async (req, res) => {
    try {
        const today = new Date().toISOString().split('T')[0];

        const schedules = await DeliverySchedule.findAll({
            where: { scheduled_date: today, status: 'pending' },
            include: [
                {
                    model: Subscription,
                    include: [
                        { model: User, attributes: ['id', 'name', 'phone'] },
                        { model: Package, attributes: ['id', 'name'] },
                        { model: Address }
                    ]
                },
                {
                    model: WaterSubscription,
                    include: [
                        { model: User, attributes: ['id', 'name', 'phone'] },
                        { model: Address }
                    ]
                }
            ]
        });

        // Group by user
        const userMap = {};
        for (const sched of schedules) {
            let user, package_name;
            let addressStr = "No address provided";
            let defaultAddr;
            let address_id = null;

            if (sched.Subscription) {
                user = sched.Subscription.User;
                package_name = sched.Subscription.Package.name;
                if (sched.Subscription.Address) {
                    const addr = sched.Subscription.Address;
                    address_id = addr.id;
                    addressStr = `${addr.address_line}${addr.landmark ? ', ' + addr.landmark : ''}, ${addr.city} - ${addr.pincode}`;
                } else {
                    defaultAddr = await Address.findOne({ where: { user_id: user.id, is_default: true } });
                }
            } else if (sched.WaterSubscription) {
                user = sched.WaterSubscription.User;
                package_name = `${sched.WaterSubscription.water_type} Water (${sched.WaterSubscription.container})`;
                if (sched.WaterSubscription.Address) {
                    const addr = sched.WaterSubscription.Address;
                    address_id = addr.id;
                    addressStr = `${addr.address_line}${addr.landmark ? ', ' + addr.landmark : ''}, ${addr.city} - ${addr.pincode}`;
                } else {
                    defaultAddr = await Address.findOne({ where: { user_id: user.id, is_default: true } });
                }
            }

            if (!user) continue;

            if (defaultAddr) {
                address_id = defaultAddr.id;
                addressStr = `${defaultAddr.address_line}${defaultAddr.landmark ? ', ' + defaultAddr.landmark : ''}, ${defaultAddr.city} - ${defaultAddr.pincode}`;
            }

            if (!userMap[user.id]) {
                userMap[user.id] = {
                    user: {
                        id: user.id,
                        name: user.name,
                        phone: user.phone,
                        address: addressStr,
                        address_id: address_id
                    },
                    schedules: []
                };
            }

            // Load delivery items
            let items = await DeliveryItem.findAll({
                where: { schedule_id: sched.id },
                include: [{ model: Product, attributes: ['id', 'name', 'unit', 'category'] }]
            });

            if (items.length === 0) {
                // Auto-fill delivery items if empty (safety fallback)
                if (sched.Subscription) {
                    const subItems = await SubscriptionItem.findAll({
                        where: { subscription_id: sched.Subscription.id, is_active: true }
                    });
                    if (subItems.length > 0) {
                        const deliveryItems = subItems.map(item => ({
                            schedule_id: sched.id,
                            product_id: item.product_id,
                            qty_gm: item.qty_gm
                        }));
                        await DeliveryItem.bulkCreate(deliveryItems);
                        // Re-fetch
                        items = await DeliveryItem.findAll({
                            where: { schedule_id: sched.id },
                            include: [{ model: Product, attributes: ['id', 'name', 'unit', 'category'] }]
                        });
                    }
                } else if (sched.WaterSubscription) {
                    const sub = sched.WaterSubscription;
                    const products = await Product.findAll({ where: { category: 'water', status: 'active' } });
                    const matchedProduct = products.find(p => {
                        const nameLower = p.name.toLowerCase();
                        return nameLower.includes(sub.water_type.toLowerCase()) && nameLower.includes(sub.container.toLowerCase());
                    });
                    if (matchedProduct) {
                        const qty = matchedProduct.unit === 'ml' ? 2000 : 1;
                        await DeliveryItem.create({
                            schedule_id: sched.id,
                            product_id: matchedProduct.id,
                            qty_gm: qty
                        });
                        // Re-fetch
                        items = await DeliveryItem.findAll({
                            where: { schedule_id: sched.id },
                            include: [{ model: Product, attributes: ['id', 'name', 'unit', 'category'] }]
                        });
                    }
                }
            }

            userMap[user.id].schedules.push({
                schedule_id: sched.id,
                package: package_name,
                items: items.map(i => ({ product: i.Product?.name, qty_gm: i.qty_gm, unit: i.Product?.unit }))
            });
        }

        res.status(200).json({ success: true, deliveries: Object.values(userMap) });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// POST /api/mark-delivered  (delivery role)
export const markDelivered = async (req, res) => {
    const t = await sequelize.transaction();
    try {
        const { schedule_id, remark } = req.body;
        const photo_url = req.file ? `/uploads/${req.file.filename}` : null;

        if (!photo_url && !remark) {
            await t.rollback();
            return res.status(400).json({ success: false, message: "At least a photo or remark is required" });
        }

        const schedule = await DeliverySchedule.findByPk(schedule_id, {
            include: [
                { model: Subscription, include: [{ model: Package }, { model: User }] },
                { model: WaterSubscription, include: [{ model: User }] }
            ]
        });
        if (!schedule || schedule.status !== 'pending') {
            await t.rollback();
            return res.status(400).json({ success: false, message: "Delivery not found or already processed" });
        }

        let sub, user, per_service_amount, name;
        let deliveryItems = [];
        if (schedule.Subscription) {
            sub = schedule.Subscription;
            user = sub.User;
            per_service_amount = parseFloat(sub.Package.price) / sub.Package.services_per_month;
            name = sub.Package.name;

            // Load delivery items, or auto-fill them if they don't exist
            deliveryItems = await DeliveryItem.findAll({
                where: { schedule_id: schedule.id },
                include: [{ model: Product }],
                transaction: t
            });

            if (deliveryItems.length === 0) {
                const subItems = await SubscriptionItem.findAll({
                    where: { subscription_id: sub.id, is_active: true },
                    include: [{ model: Product }],
                    transaction: t
                });

                const selections = await ScheduleSeasonalSelection.findAll({
                    where: { schedule_id: schedule.id },
                    include: [{ model: Product }],
                    transaction: t
                });

                const itemsToCreate = [];
                const defaultFixedItems = subItems.filter(i => i.is_fixed);

                const packageSeasonalConfig = await PackageSeasonalConfig.findOne({
                    where: { package_id: sub.Package.id },
                    transaction: t
                });

                if (selections.length > 0) {
                    // 1. Add all selections (custom fixed and seasonal)
                    itemsToCreate.push(...selections.map(sel => ({
                        schedule_id: schedule.id,
                        product_id: sel.product_id,
                        qty_gm: sel.qty_gm
                    })));

                    // 2. Add default fixed items that are not in selections
                    const selectionProductIds = selections.map(sel => sel.product_id);
                    const missingFixed = defaultFixedItems.filter(f => !selectionProductIds.includes(f.product_id));
                    itemsToCreate.push(...missingFixed.map(item => ({
                        schedule_id: schedule.id,
                        product_id: item.product_id,
                        qty_gm: item.qty_gm
                    })));
                } else {
                    // Use default fixed and seasonal
                    itemsToCreate.push(...defaultFixedItems.map(item => ({
                        schedule_id: schedule.id,
                        product_id: item.product_id,
                        qty_gm: item.qty_gm
                    })));

                    if (packageSeasonalConfig) {
                        const defaultSeasonal = subItems.filter(i => i.is_seasonal);
                        itemsToCreate.push(...defaultSeasonal.map(item => ({
                            schedule_id: schedule.id,
                            product_id: item.product_id,
                            qty_gm: item.qty_gm
                        })));
                    } else {
                        const seasonalItems = subItems.filter(i => i.is_seasonal);
                        itemsToCreate.push(...seasonalItems.map(item => ({
                            schedule_id: schedule.id,
                            product_id: item.product_id,
                            qty_gm: item.qty_gm
                        })));
                    }
                }

                if (itemsToCreate.length > 0) {
                    await DeliveryItem.bulkCreate(itemsToCreate, { transaction: t });
                    deliveryItems = await DeliveryItem.findAll({
                        where: { schedule_id: schedule.id },
                        include: [{ model: Product }],
                        transaction: t
                    });
                }
            }
        } else if (schedule.WaterSubscription) {
            sub = schedule.WaterSubscription;
            user = sub.User;
            per_service_amount = parseFloat(sub.price_per_bottle);
            name = `${sub.water_type} Water (${sub.container})`;
        }

        // Debit wallet
        let newBalance = parseFloat(user.wallet_balance) - per_service_amount;
        let newDue = parseFloat(user.due_amount);

        if (newBalance < 0) {
            newDue += Math.abs(newBalance);
            newBalance = 0;
        }

        await user.update({ wallet_balance: newBalance, due_amount: newDue }, { transaction: t });
        await WalletTransaction.create({
            user_id: user.id, amount: per_service_amount, type: 'debit',
            reason: `Delivery on ${schedule.scheduled_date} — ${name}`,
            reference_id: schedule.id
        }, { transaction: t });

        // Refund unused budget if standard subscription
        if (schedule.Subscription) {
            let actual_cost = 0;
            for (const item of deliveryItems) {
                if (item.Product) {
                    actual_cost += parseFloat(item.qty_gm) * parseFloat(item.Product.purchase_price_per_gm);
                }
            }

            if (actual_cost < per_service_amount) {
                const refund_amount = per_service_amount - actual_cost;
                if (refund_amount > 0) {
                    let refundBalance = newBalance;
                    let refundDue = newDue;

                    if (refundDue > 0) {
                        if (refund_amount >= refundDue) {
                            const remaining = refund_amount - refundDue;
                            refundDue = 0;
                            refundBalance += remaining;
                        } else {
                            refundDue -= refund_amount;
                        }
                    } else {
                        refundBalance += refund_amount;
                    }

                    newBalance = refundBalance;
                    newDue = refundDue;

                    await user.update({ wallet_balance: newBalance, due_amount: newDue }, { transaction: t });
                    await WalletTransaction.create({
                        user_id: user.id,
                        amount: refund_amount,
                        type: 'credit',
                        reason: `Refund for unused package budget on ${schedule.scheduled_date}`,
                        reference_id: schedule.id
                    }, { transaction: t });
                }
            }
        }

        await schedule.update({
            status: 'delivered',
            actual_delivery_date: new Date().toISOString().split('T')[0],
            delivery_boy_id: req.user.id,
            delivery_remark: remark || null,
            delivery_photo_url: photo_url || null
        }, { transaction: t });

        await sub.update({ services_completed: sub.services_completed + 1 }, { transaction: t });

        // Stock deduction logic
        let itemsForStockDeduction = [];
        if (schedule.Subscription) {
            itemsForStockDeduction = deliveryItems;
        } else if (schedule.WaterSubscription) {
            itemsForStockDeduction = await DeliveryItem.findAll({
                where: { schedule_id: schedule.id },
                include: [{ model: Product }],
                transaction: t
            });
            if (itemsForStockDeduction.length === 0) {
                const wsub = schedule.WaterSubscription;
                const products = await Product.findAll({ where: { category: 'water', status: 'active' }, transaction: t });
                const matchedProduct = products.find(p => {
                    const nameLower = p.name.toLowerCase();
                    return nameLower.includes(wsub.water_type.toLowerCase()) && nameLower.includes(wsub.container.toLowerCase());
                });
                if (matchedProduct) {
                    const qty = matchedProduct.unit === 'ml' ? 2000 : 1;
                    const createdItem = await DeliveryItem.create({
                        schedule_id: schedule.id,
                        product_id: matchedProduct.id,
                        qty_gm: qty
                    }, { transaction: t });
                    const reloadedItem = await DeliveryItem.findByPk(createdItem.id, {
                        include: [{ model: Product }],
                        transaction: t
                    });
                    itemsForStockDeduction = [reloadedItem];
                }
            }
        }

        for (const item of itemsForStockDeduction) {
            if (item.Product) {
                const product = await Product.findByPk(item.product_id, { transaction: t });
                if (product) {
                    const currentStock = parseFloat(product.current_stock || 0);
                    const soldQty = parseFloat(product.total_sold_qty || 0);
                    const qtyDeduct = parseFloat(item.qty_gm || 0);

                    await product.update({
                        current_stock: currentStock - qtyDeduct,
                        total_sold_qty: soldQty + qtyDeduct
                    }, { transaction: t });
                }
            }
        }

        await t.commit();
        res.status(200).json({ success: true, message: "Delivery marked complete", new_wallet_balance: newBalance });
    } catch (error) {
        await t.rollback();
        res.status(500).json({ success: false, message: error.message });
    }
};

// POST /api/return-item  (user)
export const requestReturn = async (req, res) => {
    const t = await sequelize.transaction();
    try {
        const { items, return_reason } = req.body;
        const return_photo_url = req.file ? `/uploads/${req.file.filename}` : null;

        let itemsList = [];
        if (items) {
            try {
                itemsList = typeof items === 'string' ? JSON.parse(items) : items;
            } catch (e) {
                await t.rollback();
                return res.status(400).json({ success: false, message: "Invalid items format" });
            }
        } else {
            // Fallback for single-item requests (backward compatibility)
            const { delivery_item_id, return_qty } = req.body;
            if (!delivery_item_id) {
                await t.rollback();
                return res.status(400).json({ success: false, message: "No items specified for return" });
            }
            itemsList = [{ delivery_item_id, return_qty }];
        }

        if (itemsList.length === 0) {
            await t.rollback();
            return res.status(400).json({ success: false, message: "No items selected for return" });
        }

        for (const returnReq of itemsList) {
            const item = await DeliveryItem.findByPk(returnReq.delivery_item_id, {
                include: [{
                    model: DeliverySchedule,
                    include: [
                        { model: Subscription, required: false },
                        { model: WaterSubscription, required: false }
                    ]
                }],
                transaction: t
            });

            if (!item) {
                await t.rollback();
                return res.status(404).json({ success: false, message: `Delivery item ID ${returnReq.delivery_item_id} not found` });
            }

            // Verify ownership
            const userId = item.DeliverySchedule?.Subscription?.user_id || item.DeliverySchedule?.WaterSubscription?.user_id;
            if (userId !== req.user.id) {
                await t.rollback();
                return res.status(403).json({ success: false, message: "Unauthorized return request" });
            }

            if (item.return_status !== 'none') {
                await t.rollback();
                return res.status(400).json({ success: false, message: `Return already requested/processed for item ${returnReq.delivery_item_id}` });
            }

            const requestedQty = parseFloat(returnReq.return_qty);
            if (isNaN(requestedQty) || requestedQty <= 0 || requestedQty > parseFloat(item.qty_gm)) {
                await t.rollback();
                return res.status(400).json({ success: false, message: `Invalid return quantity for item ${returnReq.delivery_item_id}` });
            }

            await item.update({
                return_status: 'requested',
                return_qty: requestedQty,
                return_reason: return_reason || "No reason specified",
                return_photo_url
            }, { transaction: t });
        }

        await t.commit();
        res.status(200).json({ success: true, message: "Return request(s) submitted successfully" });
    } catch (error) {
        await t.rollback();
        res.status(500).json({ success: false, message: error.message });
    }
};

// PATCH /api/return-item/:id/review  (admin)
export const reviewReturn = async (req, res) => {
    const t = await sequelize.transaction();
    try {
        const { status } = req.body; // 'approved' or 'rejected'
        const item = await DeliveryItem.findByPk(req.params.id, {
            include: [{
                model: DeliverySchedule,
                include: [
                    { model: Subscription, include: [{ model: Package }, { model: User }] },
                    { model: WaterSubscription, include: [{ model: User }] }
                ]
            }]
        });
        if (!item || item.return_status !== 'requested') {
            await t.rollback();
            return res.status(400).json({ success: false, message: "Return not found or not pending" });
        }

        const user = item.DeliverySchedule?.Subscription?.User || item.DeliverySchedule?.WaterSubscription?.User;
        if (!user) {
            await t.rollback();
            return res.status(404).json({ success: false, message: "User associated with delivery not found" });
        }

        if (status === 'approved') {
            const product = await Product.findByPk(item.product_id);
            const refund = parseFloat(item.return_qty || item.qty_gm) * parseFloat(product.purchase_price_per_gm);

            await user.update({ wallet_balance: parseFloat(user.wallet_balance) + refund }, { transaction: t });
            await WalletTransaction.create({
                user_id: user.id, amount: refund, type: 'credit',
                reason: `Return approved for ${product.name}`,
                reference_id: item.id
            }, { transaction: t });

            await Notification.create({
                user_id: user.id,
                title: 'Return Approved',
                message: `Your return for ${product.name} has been approved. ₹${refund.toFixed(2)} credited to wallet.`,
                type: 'alert',
                scheduled_at: new Date()
            }, { transaction: t });
        } else {
            await Notification.create({
                user_id: user.id,
                title: 'Return Rejected',
                message: `Your return request has been reviewed and rejected.`,
                type: 'alert',
                scheduled_at: new Date()
            }, { transaction: t });
        }

        await item.update({ return_status: status }, { transaction: t });
        await t.commit();
        res.status(200).json({ success: true, message: `Return ${status}` });
    } catch (error) {
        await t.rollback();
        res.status(500).json({ success: false, message: error.message });
    }
};

// GET /api/delivery-history (user)
export const getDeliveryHistory = async (req, res) => {
    try {
        const schedules = await DeliverySchedule.findAll({
            include: [{
                model: Subscription,
                where: { user_id: req.user.id },
                include: [{ model: Package, attributes: ['name'] }]
            }, {
                model: DeliveryItem,
                as: 'DeliveryItems',
                include: [{ model: Product, attributes: ['id', 'name', 'unit'] }]
            }],
            where: { status: 'delivered' },
            order: [['actual_delivery_date', 'DESC']]
        });
        res.status(200).json({ success: true, history: schedules });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// GET /api/admin/deliveries (admin)
export const getCompletedDeliveries = async (req, res) => {
    try {
        const deliveries = await DeliverySchedule.findAll({
            where: { status: 'delivered' },
            include: [
                {
                    model: Subscription,
                    include: [
                        { model: User, attributes: ['id', 'name', 'phone'] },
                        { model: Package, attributes: ['id', 'name'] }
                    ]
                },
                {
                    model: WaterSubscription,
                    include: [
                        { model: User, attributes: ['id', 'name', 'phone'] }
                    ]
                },
                {
                    model: User,
                    as: 'DeliveryBoy',
                    attributes: ['id', 'name', 'phone']
                },
                {
                    model: DeliveryItem,
                    as: 'DeliveryItems',
                    include: [{ model: Product, attributes: ['id', 'name', 'unit'] }]
                }
            ],
            order: [['actual_delivery_date', 'DESC'], ['id', 'DESC']]
        });

        res.status(200).json({ success: true, deliveries });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// GET /api/admin/returns (admin)
export const getReturns = async (req, res) => {
    try {
        const returns = await DeliveryItem.findAll({
            where: { return_status: { [Op.ne]: 'none' } },
            include: [
                { model: Product },
                {
                    model: DeliverySchedule,
                    include: [
                        { model: Subscription, required: false, include: [{ model: User, attributes: ['id', 'name', 'phone'] }] },
                        { model: WaterSubscription, required: false, include: [{ model: User, attributes: ['id', 'name', 'phone'] }] }
                    ]
                }
            ],
            order: [['id', 'DESC']]
        });
        res.status(200).json({ success: true, returns });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// GET /api/admin/demands (admin)
export const getProductDemands = async (req, res) => {
    try {
        const { date } = req.query;
        let dateStr = date;
        if (!dateStr) {
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            dateStr = tomorrow.toISOString().split('T')[0];
        }

        const schedules = await DeliverySchedule.findAll({
            where: { scheduled_date: dateStr, status: 'pending' },
            include: [
                {
                    model: Subscription,
                    required: false,
                    include: [
                        { model: SubscriptionItem, as: 'Items', include: [{ model: Product }] },
                        { model: Package, include: [{ model: PackageSeasonalConfig, as: 'SeasonalConfig' }] }
                    ]
                },
                {
                    model: WaterSubscription,
                    required: false
                },
                {
                    model: DeliveryItem,
                    as: 'DeliveryItems',
                    required: false,
                    include: [{ model: Product }]
                },
                {
                    model: ScheduleSeasonalSelection,
                    as: 'SeasonalSelections',
                    required: false,
                    include: [{ model: Product }]
                }
            ]
        });

        // Fetch active water products
        const waterProducts = await Product.findAll({ where: { category: 'water', status: 'fresh' } }); // Let's check what water status is used or fallback to active
        const actualWaterProducts = waterProducts.length > 0 ? waterProducts : await Product.findAll({ where: { category: 'water' } });

        const demandMap = {};

        for (const schedule of schedules) {
            const dbItems = schedule.DeliveryItems || [];
            if (dbItems.length > 0) {
                for (const item of dbItems) {
                    if (!item.Product) continue;
                    const p = item.Product;
                    const qty = parseFloat(item.qty_gm || 0);
                    if (!demandMap[p.id]) {
                        demandMap[p.id] = {
                            id: p.id,
                            name: p.name,
                            category: p.category,
                            unit: p.unit,
                            total_qty: 0
                        };
                    }
                    demandMap[p.id].total_qty += qty;
                }
            } else {
                if (schedule.Subscription) {
                    const sub = schedule.Subscription;
                    const items = sub.Items || [];

                    // Fixed items default
                    const fixedItems = items.filter(item => item.is_fixed && item.is_active);
                    const selections = schedule.SeasonalSelections || [];

                    if (selections.length > 0) {
                        // 1. Add all selections (custom fixed and seasonal)
                        for (const sel of selections) {
                            if (!sel.Product) continue;
                            const p = sel.Product;
                            const qty = parseFloat(sel.qty_gm || 0);
                            if (!demandMap[p.id]) {
                                demandMap[p.id] = {
                                    id: p.id,
                                    name: p.name,
                                    category: p.category,
                                    unit: p.unit,
                                    total_qty: 0
                                };
                            }
                            demandMap[p.id].total_qty += qty;
                        }

                        // 2. Add default fixed items that are not in selections
                        const selectionProductIds = selections.map(sel => sel.product_id);
                        const missingFixed = fixedItems.filter(f => !selectionProductIds.includes(f.product_id));
                        for (const item of missingFixed) {
                            if (!item.Product) continue;
                            const p = item.Product;
                            const qty = parseFloat(item.qty_gm || 0);
                            if (!demandMap[p.id]) {
                                demandMap[p.id] = {
                                    id: p.id,
                                    name: p.name,
                                    category: p.category,
                                    unit: p.unit,
                                    total_qty: 0
                                };
                            }
                            demandMap[p.id].total_qty += qty;
                        }
                    } else {
                        // Use default fixed and seasonal
                        for (const item of fixedItems) {
                            if (!item.Product) continue;
                            const p = item.Product;
                            const qty = parseFloat(item.qty_gm || 0);
                            if (!demandMap[p.id]) {
                                demandMap[p.id] = {
                                    id: p.id,
                                    name: p.name,
                                    category: p.category,
                                    unit: p.unit,
                                    total_qty: 0
                                };
                            }
                            demandMap[p.id].total_qty += qty;
                        }

                        const defaultSeasonal = items.filter(item => item.is_seasonal && item.is_active);
                        for (const item of defaultSeasonal) {
                            if (!item.Product) continue;
                            const p = item.Product;
                            const qty = parseFloat(item.qty_gm || 0);
                            if (!demandMap[p.id]) {
                                demandMap[p.id] = {
                                    id: p.id,
                                    name: p.name,
                                    category: p.category,
                                    unit: p.unit,
                                    total_qty: 0
                                };
                            }
                            demandMap[p.id].total_qty += qty;
                        }
                    }
                } else if (schedule.WaterSubscription) {
                    const sub = schedule.WaterSubscription;
                    const matchedProduct = actualWaterProducts.find(p => {
                        const nameLower = p.name.toLowerCase();
                        return nameLower.includes(sub.water_type.toLowerCase()) && nameLower.includes(sub.container.toLowerCase());
                    });
                    if (matchedProduct) {
                        const qty = matchedProduct.unit === 'ml' ? 2000 : 1;
                        if (!demandMap[matchedProduct.id]) {
                            demandMap[matchedProduct.id] = {
                                id: matchedProduct.id,
                                name: matchedProduct.name,
                                category: matchedProduct.category,
                                unit: matchedProduct.unit,
                                total_qty: 0
                            };
                        }
                        demandMap[matchedProduct.id].total_qty += qty;
                    }
                }
            }
        }

        const demandsList = Object.values(demandMap);
        res.status(200).json({ success: true, date: dateStr, demands: demandsList });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// GET /api/admin/seasonal-selections
export const getAdminSeasonalSelections = async (req, res) => {
    try {
        const { date } = req.query;
        let dateStr = date;
        if (!dateStr) {
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            dateStr = tomorrow.toISOString().split('T')[0];
        }

        // Find all delivery schedules for this date that belong to a subscription
        const schedules = await DeliverySchedule.findAll({
            where: { scheduled_date: dateStr },
            include: [
                {
                    model: Subscription,
                    required: true,
                    include: [
                        { model: User, attributes: ['id', 'name', 'phone'] },
                        { model: Package, include: [{ model: PackageSeasonalConfig, as: 'SeasonalConfig' }] },
                        {
                            model: SubscriptionItem,
                            as: 'Items',
                            include: [{ model: Product, attributes: ['id', 'name', 'unit', 'category', 'selling_price_per_gm', 'purchase_price_per_gm'] }]
                        }
                    ]
                },
                {
                    model: ScheduleSeasonalSelection,
                    as: 'SeasonalSelections',
                    include: [{ model: Product, attributes: ['id', 'name', 'unit', 'category', 'selling_price_per_gm', 'purchase_price_per_gm'] }]
                }
            ]
        });

        // Filter only those packages that have a SeasonalConfig
        const seasonalSchedules = schedules.filter(s => s.Subscription && s.Subscription.Package && s.Subscription.Package.SeasonalConfig);

        const response = [];

        for (const s of seasonalSchedules) {
            const sub = s.Subscription;
            const user = sub.User;

            // Check if there are selections for this schedule
            const selections = s.SeasonalSelections || [];
            let seasonalItems = [];
            let isAuto = false;
            let status = 'pending';

            if (selections.length > 0) {
                status = 'selected';
                isAuto = selections[0].is_auto; // assuming all entries for the same schedule have the same is_auto value
                seasonalItems = selections.map(sel => {
                    const price = parseFloat(sel.Product?.purchase_price_per_gm || 0);
                    const qty = parseFloat(sel.qty_gm || 0);
                    return {
                        product_id: sel.product_id,
                        name: sel.Product?.name,
                        qty_gm: qty,
                        unit: sel.Product?.unit,
                        price: price,
                        amount: qty * price
                    };
                });
            } else {
                // Check if cutoff has passed
                const cutoffTime = new Date(`${dateStr}T00:00:00`);
                cutoffTime.setDate(cutoffTime.getDate() - 1);
                cutoffTime.setHours(20, 0, 0, 0); // 8:00 PM the day before
                const now = new Date();

                if (now >= cutoffTime || s.is_locked) {
                    status = 'fallback'; // deadline passed, default preferences will be used
                    // Get defaults from subscription
                    const defaultSeasonal = sub.Items.filter(i => i.is_seasonal);
                    seasonalItems = defaultSeasonal.map(i => {
                        const price = parseFloat(i.Product?.purchase_price_per_gm || 0);
                        const qty = parseFloat(i.qty_gm || 0);
                        return {
                            product_id: i.product_id,
                            name: i.Product?.name,
                            qty_gm: qty,
                            unit: i.Product?.unit,
                            price: price,
                            amount: qty * price
                        };
                    });
                } else {
                    status = 'pending';
                }
            }

            const fixedItems = sub.Items.filter(i => i.is_fixed).map(i => {
                const price = parseFloat(i.Product?.purchase_price_per_gm || 0);
                const qty = parseFloat(i.qty_gm || 0);
                return {
                    product_id: i.product_id,
                    name: i.Product?.name,
                    qty_gm: qty,
                    unit: i.Product?.unit,
                    price: price,
                    amount: qty * price
                };
            });

            response.push({
                user: {
                    id: user.id,
                    name: user.name,
                    phone: user.phone
                },
                subscription_id: sub.id,
                package_name: sub.Package.name,
                schedule_id: s.id,
                scheduled_date: s.scheduled_date,
                status,
                is_auto: isAuto,
                fixed_items: fixedItems,
                seasonal_items: seasonalItems
            });
        }

        res.status(200).json({ success: true, date: dateStr, selections: response });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

