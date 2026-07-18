import { Op } from "sequelize";
import { sequelize } from "../confiq/db.js";
import {
    DeliverySchedule, DeliveryItem, Subscription, SubscriptionItem, User, Product,
    WalletTransaction, Notification, WaterSubscription, Package, Address,
    ScheduleSeasonalSelection, PackageSeasonalConfig,
    RetailOrder, RetailOrderItem, Batch, MissedProductLog
} from "../models/index.js";
import path from "path";

// GET /api/today-deliveries  (delivery role)
export const getTodayDeliveries = async (req, res) => {
    try {
        const today = new Date().toISOString().split('T')[0];
        const deliveryBoyId = req.user.id;

        const schedules = await DeliverySchedule.findAll({
            where: {
                scheduled_date: today,
                status: ['pending', 'ready_for_delivery'],
                delivery_boy_id: deliveryBoyId
            },
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

        const retailOrders = await RetailOrder.findAll({
            where: {
                delivery_date: today,
                delivery_status: ['pending', 'ready_for_delivery'],
                delivery_boy_id: deliveryBoyId
            },
            include: [
                { model: User, attributes: ['id', 'name', 'phone'] },
                { model: Address },
                { model: RetailOrderItem, as: 'Items', include: [{ model: Product }] }
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
                include: [{ model: Product, attributes: ['id', 'name', 'hindi_name', 'unit', 'category'] }]
            });

            if (items.length > 0) {
                const uniqueMap = {};
                const toKeep = [];
                for (const item of items) {
                    if (!uniqueMap[item.product_id]) {
                        uniqueMap[item.product_id] = true;
                        toKeep.push(item);
                    } else {
                        await item.destroy().catch(e => console.error(e));
                    }
                }
                items = toKeep;
            }

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
                            include: [{ model: Product, attributes: ['id', 'name', 'hindi_name', 'unit', 'category'] }]
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
                            include: [{ model: Product, attributes: ['id', 'name', 'hindi_name', 'unit', 'category'] }]
                        });
                    }
                }
            }

            userMap[user.id].schedules.push({
                schedule_id: sched.id,
                type: 'package',
                package: package_name,
                items: items
                    .filter(i => i.packed_qty === null || parseFloat(i.packed_qty) > 0)
                    .map(i => ({
                        product: i.Product?.name,
                        hindi_name: i.Product?.hindi_name,
                        qty_gm: i.packed_qty !== null ? parseFloat(i.packed_qty) : parseFloat(i.qty_gm),
                        unit: i.Product?.unit
                    }))
            });
        }

        for (const ro of retailOrders) {
            const user = ro.User;
            if (!user) continue;

            let addressStr = "No address provided";
            let address_id = null;
            if (ro.Address) {
                address_id = ro.Address.id;
                addressStr = `${ro.Address.address_line}${ro.Address.landmark ? ', ' + ro.Address.landmark : ''}, ${ro.Address.city} - ${ro.Address.pincode}`;
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

            userMap[user.id].schedules.push({
                schedule_id: ro.id,
                type: 'retail',
                package: "Retail Order",
                items: ro.Items
                    .filter(i => i.packed_qty === null || parseFloat(i.packed_qty) > 0)
                    .map(i => ({
                        product: i.Product?.name,
                        hindi_name: i.Product?.hindi_name,
                        qty_gm: i.packed_qty !== null ? parseFloat(i.packed_qty) : parseFloat(i.quantity),
                        unit: i.Product?.unit
                    }))
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
        const { schedule_id, type, remark } = req.body;
        const photo_url = req.file ? `/uploads/${req.file.filename}` : null;

        if (!photo_url && !remark) {
            await t.rollback();
            return res.status(400).json({ success: false, message: "At least a photo or remark is required" });
        }

        if (type === 'retail') {
            const ro = await RetailOrder.findByPk(schedule_id, { include: [{ model: User }], transaction: t });
            if (!ro || !['pending', 'ready_for_delivery'].includes(ro.delivery_status)) {
                await t.rollback();
                return res.status(400).json({ success: false, message: "Retail Delivery not found or already processed" });
            }

            const per_service_amount = parseFloat(ro.total_price);
            const user = ro.User;

            let newBalance = parseFloat(user.wallet_balance) - per_service_amount;
            let newDue = parseFloat(user.due_amount);

            if (newBalance < 0) {
                newDue += Math.abs(newBalance);
                newBalance = 0;
            }

            await user.update({ wallet_balance: newBalance, due_amount: newDue }, { transaction: t });
            await WalletTransaction.create({
                user_id: user.id, amount: per_service_amount, type: 'debit',
                reason: `Retail Delivery on ${ro.delivery_date}`,
                reference_id: ro.id
            }, { transaction: t });

            await ro.update({
                delivery_status: 'delivered',
                actual_delivery_date: new Date().toISOString().split('T')[0],
                delivery_photo_url: photo_url,
                delivery_remark: remark
            }, { transaction: t });

            await t.commit();
            return res.status(200).json({ success: true, message: "Retail order marked as delivered" });
        }

        const schedule = await DeliverySchedule.findByPk(schedule_id, {
            include: [
                { model: Subscription, include: [{ model: Package }, { model: User }] },
                { model: WaterSubscription, include: [{ model: User }] }
            ],
            transaction: t
        });
        if (!schedule || !['pending', 'ready_for_delivery'].includes(schedule.status)) {
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

        // --- NEW LOGIC: Deduct for Carried-over Items ---
        const carriedOverLogs = await MissedProductLog.findAll({
            where: { user_id: user.id, next_schedule_date: schedule.scheduled_date },
            transaction: t
        });

        if (carriedOverLogs.length > 0) {
            let carryOverDebit = 0;
            for (const log of carriedOverLogs) {
                const p = await Product.findByPk(log.product_id, { transaction: t });
                if (p) {
                    carryOverDebit += parseFloat(log.missed_qty) * parseFloat(p.purchase_price_per_gm);
                }
            }

            if (carryOverDebit > 0) {
                let currentBalance = newBalance;
                let currentDue = newDue;

                currentBalance -= carryOverDebit;
                if (currentBalance < 0) {
                    currentDue += Math.abs(currentBalance);
                    currentBalance = 0;
                }

                newBalance = currentBalance;
                newDue = currentDue;

                await user.update({ wallet_balance: newBalance, due_amount: newDue }, { transaction: t });
                await WalletTransaction.create({
                    user_id: user.id, amount: carryOverDebit, type: 'debit',
                    reason: `Deduction for returned/missed items delivered on ${schedule.scheduled_date}`,
                    reference_id: schedule.id
                }, { transaction: t });
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

        // --- NEW LOGIC: Post-paid Serving Generation ---
        if (schedule.Subscription && (sub.services_completed + 1) === sub.total_services && sub.renewal_count >= 3 && !sub.postpaid_serving_given) {
            const lastSchedule = await DeliverySchedule.findOne({
                where: { subscription_id: sub.id },
                order: [['scheduled_date', 'DESC']],
                transaction: t
            });
            let nextDateStr = new Date().toISOString().split('T')[0];
            if (lastSchedule) {
                 const gap_days = 30 / sub.Package.services_per_month;
                 const d = new Date(lastSchedule.scheduled_date);
                 d.setDate(d.getDate() + Math.round(gap_days));
                 if (d.getDay() === 0) d.setDate(d.getDate() - 1);
                 nextDateStr = d.toISOString().split('T')[0];
            }
            await DeliverySchedule.create({
                subscription_id: sub.id,
                scheduled_date: nextDateStr,
                status: 'pending'
            }, { transaction: t });
            
            await sub.update({ postpaid_serving_given: true, end_date: nextDateStr }, { transaction: t });
            
            const cost = parseFloat(sub.locked_price || sub.Package.price) / sub.Package.services_per_month;
            const userForDebt = await User.findByPk(sub.user_id, { transaction: t });
            await userForDebt.update({ postpaid_debt: parseFloat(userForDebt.postpaid_debt) + cost }, { transaction: t });
        }
        // ------------------------------------------

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
                return_photo_url,
                returned_by: 'user'
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
            const returnQty = parseFloat(item.return_qty || item.qty_gm);
            const refund = returnQty * parseFloat(product.purchase_price_per_gm);

            // Add returned quantity back to stock and reduce total sold qty
            await product.update({
                current_stock: parseFloat(product.current_stock || 0) + returnQty,
                total_sold_qty: Math.max(0, parseFloat(product.total_sold_qty || 0) - returnQty)
            }, { transaction: t });

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
        const { from_date, to_date, order_id, user_id, delivery_boy_id, all_time } = req.query;
        let whereClause = { status: 'delivered' };

        if (order_id) {
            whereClause.id = order_id;
        } else if (all_time === 'true') {
            // no date filter
        } else if (from_date && to_date) {
            whereClause.actual_delivery_date = { [Op.between]: [from_date, to_date] };
        } else {
            const today = new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" }).split(',')[0];
            const [m, d, y] = today.split('/');
            whereClause.actual_delivery_date = `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
        }

        if (delivery_boy_id) {
            whereClause.delivery_boy_id = delivery_boy_id;
        }

        const includeSubscriptionWhere = user_id ? { user_id } : undefined;

        const deliveries = await DeliverySchedule.findAll({
            where: whereClause,
            include: [
                {
                    model: Subscription,
                    where: includeSubscriptionWhere,
                    required: !!user_id,
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
        const { from_date, to_date, order_id, user_id, delivery_boy_id, all_time } = req.query;
        let scheduleWhere = {};

        if (order_id) {
            scheduleWhere.id = order_id;
        } else if (all_time === 'true') {
            // no date filter
        } else if (from_date && to_date) {
            scheduleWhere.actual_delivery_date = { [Op.between]: [from_date, to_date] };
        } else {
            const today = new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" }).split(',')[0];
            const [m, d, y] = today.split('/');
            scheduleWhere.actual_delivery_date = `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
        }

        if (delivery_boy_id) {
            scheduleWhere.delivery_boy_id = delivery_boy_id;
        }

        const subWhere = user_id ? { user_id } : undefined;

        const returns = await DeliveryItem.findAll({
            where: { return_status: { [Op.ne]: 'none' } },
            include: [
                { model: Product },
                {
                    model: DeliverySchedule,
                    where: Object.keys(scheduleWhere).length ? scheduleWhere : undefined,
                    required: true,
                    include: [
                        { model: Subscription, required: !!user_id, where: subWhere, include: [{ model: User, attributes: ['id', 'name', 'phone'] }, { model: Package, attributes: ['id', 'name'] }] },
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
                        { model: User, attributes: ['id', 'name', 'phone'] },
                        { model: SubscriptionItem, as: 'Items', include: [{ model: Product }] },
                        { model: Package, include: [{ model: PackageSeasonalConfig, as: 'SeasonalConfig' }] }
                    ]
                },
                {
                    model: WaterSubscription,
                    required: false,
                    include: [
                        { model: User, attributes: ['id', 'name', 'phone'] }
                    ]
                },
                { model: DeliveryItem, as: 'DeliveryItems', required: false, include: [{ model: Product }] },
                { model: ScheduleSeasonalSelection, as: 'SeasonalSelections', required: false, include: [{ model: Product }] },
                { model: Batch, required: false }
            ]
        });

        const retailOrders = await RetailOrder.findAll({
            where: { delivery_date: dateStr, delivery_status: 'pending' },
            include: [
                { model: User, attributes: ['id', 'name', 'phone'] },
                { model: RetailOrderItem, as: 'Items', include: [{ model: Product }] },
                { model: Batch, required: false }
            ]
        });

        const waterProducts = await Product.findAll({ where: { category: 'water', status: 'fresh' } });
        const actualWaterProducts = waterProducts.length > 0 ? waterProducts : await Product.findAll({ where: { category: 'water' } });

        const demandMap = {};

        const addDemand = (p, qty, source, batchName, user) => {
            if (!demandMap[p.id]) {
                demandMap[p.id] = {
                    id: p.id,
                    name: p.name,
                    category: p.category,
                    unit: p.unit,
                    total_package_qty: 0,
                    total_retail_qty: 0,
                    package_details: {},
                    retail_details: {}
                };
            }
            if (source === 'package') {
                demandMap[p.id].total_package_qty += qty;
                const key = `${qty}_${batchName || 'Unassigned'}`;
                if (!demandMap[p.id].package_details[key]) {
                    demandMap[p.id].package_details[key] = { qty, batch: batchName || 'Unassigned', count: 0, orders: [] };
                }
                demandMap[p.id].package_details[key].count += 1;
                if (user) {
                    demandMap[p.id].package_details[key].orders.push({ userName: user.name, phone: user.phone });
                }
            } else {
                demandMap[p.id].total_retail_qty += qty;
                const key = `${qty}_${batchName || 'Unassigned'}`;
                if (!demandMap[p.id].retail_details[key]) {
                    demandMap[p.id].retail_details[key] = { qty, batch: batchName || 'Unassigned', count: 0, orders: [] };
                }
                demandMap[p.id].retail_details[key].count += 1;
                if (user) {
                    demandMap[p.id].retail_details[key].orders.push({ userName: user.name, phone: user.phone });
                }
            }
        };

        for (const schedule of schedules) {
            const batchName = schedule.Batch ? schedule.Batch.name : null;
            let user = null;
            if (schedule.Subscription && schedule.Subscription.User) {
                user = schedule.Subscription.User;
            } else if (schedule.WaterSubscription && schedule.WaterSubscription.User) {
                user = schedule.WaterSubscription.User;
            }

            const dbItems = schedule.DeliveryItems || [];
            if (dbItems.length > 0) {
                for (const item of dbItems) {
                    if (!item.Product) continue;
                    addDemand(item.Product, parseFloat(item.qty_gm || 0), 'package', batchName, user);
                }
            } else {
                if (schedule.Subscription) {
                    const sub = schedule.Subscription;
                    const items = sub.Items || [];
                    const fixedItems = items.filter(item => item.is_fixed && item.is_active);
                    const selections = schedule.SeasonalSelections || [];

                    if (selections.length > 0) {
                        for (const sel of selections) {
                            if (!sel.Product) continue;
                            addDemand(sel.Product, parseFloat(sel.qty_gm || 0), 'package', batchName, user);
                        }
                        const selectionProductIds = selections.map(sel => sel.product_id);
                        const missingFixed = fixedItems.filter(f => !selectionProductIds.includes(f.product_id));
                        for (const item of missingFixed) {
                            if (!item.Product) continue;
                            addDemand(item.Product, parseFloat(item.qty_gm || 0), 'package', batchName, user);
                        }
                    } else {
                        for (const item of fixedItems) {
                            if (!item.Product) continue;
                            addDemand(item.Product, parseFloat(item.qty_gm || 0), 'package', batchName, user);
                        }
                        const defaultSeasonal = items.filter(item => item.is_seasonal && item.is_active);
                        for (const item of defaultSeasonal) {
                            if (!item.Product) continue;
                            addDemand(item.Product, parseFloat(item.qty_gm || 0), 'package', batchName, user);
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
                        addDemand(matchedProduct, qty, 'package', batchName, user);
                    }
                }
            }
        }

        for (const order of retailOrders) {
            const batchName = order.Batch ? order.Batch.name : null;
            const user = order.User;
            const items = order.Items || [];
            for (const item of items) {
                if (!item.Product) continue;
                addDemand(item.Product, parseFloat(item.quantity || 0), 'retail', batchName, user);
            }
        }

        const demandsList = Object.values(demandMap).map(d => ({
            ...d,
            package_details: Object.values(d.package_details),
            retail_details: Object.values(d.retail_details)
        }));

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


// GET /api/admin/orders
export const getAllOrdersForDate = async (req, res) => {
    try {
        const { date } = req.query;
        let dateStr = date;
        if (!dateStr) {
            const today = new Date();
            dateStr = today.toISOString().split('T')[0];
        }

        const schedules = await DeliverySchedule.findAll({
            where: { scheduled_date: dateStr, status: ['pending', 'ready_for_delivery'] },
            include: [
                { model: Batch },
                {
                    model: Subscription,
                    include: [
                        { model: User, attributes: ['id', 'name', 'phone'] },
                        { model: Address },
                        { model: SubscriptionItem, as: 'Items', include: [{ model: Product }] },
                        { model: Package, include: [{ model: PackageSeasonalConfig, as: 'SeasonalConfig' }] }
                    ]
                },
                {
                    model: WaterSubscription,
                    include: [
                        { model: User, attributes: ['id', 'name', 'phone'] },
                        { model: Address }
                    ]
                },
                { model: DeliveryItem, as: 'DeliveryItems', required: false, include: [{ model: Product }] },
                { model: ScheduleSeasonalSelection, as: 'SeasonalSelections', required: false, include: [{ model: Product }] }
            ]
        });

        const retailOrders = await RetailOrder.findAll({
            where: { delivery_date: dateStr, delivery_status: ['pending', 'ready_for_delivery'] },
            include: [
                { model: Batch },
                { model: User, attributes: ['id', 'name', 'phone'] },
                { model: Address },
                { model: RetailOrderItem, as: 'Items', include: [{ model: Product }] }
            ]
        });

        const waterProducts = await Product.findAll({ where: { category: 'water', status: 'fresh' } });
        const actualWaterProducts = waterProducts.length > 0 ? waterProducts : await Product.findAll({ where: { category: 'water' } });

        // Fetch all default addresses in one go to avoid N+1
        const allUsersIds = new Set();
        schedules.forEach(s => {
            if (s.Subscription) allUsersIds.add(s.Subscription.User.id);
            else if (s.WaterSubscription) allUsersIds.add(s.WaterSubscription.User.id);
        });
        retailOrders.forEach(r => {
            if (r.User) allUsersIds.add(r.User.id);
        });
        const defaultAddresses = await Address.findAll({
            where: { user_id: Array.from(allUsersIds), is_default: true }
        });
        const defaultAddressMap = {};
        defaultAddresses.forEach(a => {
            defaultAddressMap[a.user_id] = a;
        });

        const formatAddress = (addr) => {
            if (!addr) return "No Address Provided";
            return `${addr.address_line}${addr.landmark ? ', ' + addr.landmark : ''}, ${addr.city} - ${addr.pincode}`;
        };

        const usersMap = {};

        const getOrInitUser = (user, status) => {
            if (!user) return null;
            if (!usersMap[user.id]) {
                usersMap[user.id] = {
                    user: user,
                    hasPackage: false,
                    status: status,
                    addressesMap: {}, // To group by address string
                    // Also keep total map for the overall summary view
                    totalItemsMap: {},
                    allScheduleIds: [],
                    allRetailOrderIds: [],
                    commonBatchId: null // Optional common batch if all match
                };
            }
            return usersMap[user.id];
        };

        const getOrInitAddressGroup = (uMap, addrStr, batchId, status) => {
            if (!uMap.addressesMap[addrStr]) {
                uMap.addressesMap[addrStr] = {
                    addressText: addrStr,
                    batch_id: batchId,
                    status: status, // Add status to track if it's ready_for_delivery
                    scheduleIds: [],
                    retailOrderIds: [],
                    itemsMap: {}
                };
            }
            if (batchId && !uMap.addressesMap[addrStr].batch_id) {
                uMap.addressesMap[addrStr].batch_id = batchId;
            }
            if (status === 'ready_for_delivery') {
                uMap.addressesMap[addrStr].status = 'ready_for_delivery';
            }
            return uMap.addressesMap[addrStr];
        };

        const addItem = (uMap, addrGrp, product, qty, source, packedQty = null) => {
            if (!product) return;
            // Add to Address Group
            if (!addrGrp.itemsMap[product.id]) {
                addrGrp.itemsMap[product.id] = { product, packageQty: 0, retailQty: 0, unit: product.unit, packedQty: 0, isPackedSet: false };
            }
            if (source === 'package') addrGrp.itemsMap[product.id].packageQty += qty;
            else addrGrp.itemsMap[product.id].retailQty += qty;

            if (packedQty !== null && packedQty !== undefined) {
                addrGrp.itemsMap[product.id].packedQty += packedQty;
                addrGrp.itemsMap[product.id].isPackedSet = true;
            }

            // Add to User Totals
            if (!uMap.totalItemsMap[product.id]) {
                uMap.totalItemsMap[product.id] = { product, packageQty: 0, retailQty: 0, unit: product.unit };
            }
            if (source === 'package') uMap.totalItemsMap[product.id].packageQty += qty;
            else uMap.totalItemsMap[product.id].retailQty += qty;
        };

        // Process Schedules
        for (const s of schedules) {
            let user = null;
            let address = null;

            if (s.Subscription) {
                user = s.Subscription.User;
                address = s.Subscription.Address || defaultAddressMap[user.id];
            } else if (s.WaterSubscription) {
                user = s.WaterSubscription.User;
                address = s.WaterSubscription.Address || defaultAddressMap[user.id];
            }

            const uMap = getOrInitUser(user, s.status);
            if (!uMap) continue;

            uMap.hasPackage = true;
            uMap.allScheduleIds.push(s.id);
            if (!uMap.commonBatchId && s.batch_id) uMap.commonBatchId = s.batch_id;

            const addrStr = formatAddress(address);
            const addrGrp = getOrInitAddressGroup(uMap, addrStr, s.batch_id, s.status);
            addrGrp.scheduleIds.push(s.id);

            const dbItems = s.DeliveryItems || [];
            if (dbItems.length > 0) {
                const uniqueMap = {};
                for (const item of dbItems) {
                    if (!uniqueMap[item.product_id]) {
                        uniqueMap[item.product_id] = true;
                        if (item.Product) addItem(uMap, addrGrp, item.Product, parseFloat(item.qty_gm || 0), 'package', item.packed_qty !== null ? parseFloat(item.packed_qty) : null);
                    } else {
                        await item.destroy().catch(e => console.error(e));
                    }
                }
            } else {
                const newDeliveryItems = [];
                if (s.Subscription) {
                    const sub = s.Subscription;
                    const items = sub.Items || [];
                    const fixedItems = items.filter(item => item.is_fixed && item.is_active);
                    const selections = s.SeasonalSelections || [];

                    if (selections.length > 0) {
                        for (const sel of selections) {
                            if (sel.Product) {
                                addItem(uMap, addrGrp, sel.Product, parseFloat(sel.qty_gm || 0), 'package');
                                newDeliveryItems.push({ schedule_id: s.id, product_id: sel.product_id, qty_gm: sel.qty_gm });
                            }
                        }
                        const selectionProductIds = selections.map(sel => sel.product_id);
                        const missingFixed = fixedItems.filter(f => !selectionProductIds.includes(f.product_id));
                        for (const item of missingFixed) {
                            if (item.Product) {
                                addItem(uMap, addrGrp, item.Product, parseFloat(item.qty_gm || 0), 'package');
                                newDeliveryItems.push({ schedule_id: s.id, product_id: item.product_id, qty_gm: item.qty_gm });
                            }
                        }
                    } else {
                        for (const item of fixedItems) {
                            if (item.Product) {
                                addItem(uMap, addrGrp, item.Product, parseFloat(item.qty_gm || 0), 'package');
                                newDeliveryItems.push({ schedule_id: s.id, product_id: item.product_id, qty_gm: item.qty_gm });
                            }
                        }
                        const defaultSeasonal = items.filter(item => item.is_seasonal && item.is_active);
                        for (const item of defaultSeasonal) {
                            if (item.Product) {
                                addItem(uMap, addrGrp, item.Product, parseFloat(item.qty_gm || 0), 'package');
                                newDeliveryItems.push({ schedule_id: s.id, product_id: item.product_id, qty_gm: item.qty_gm });
                            }
                        }
                    }
                } else if (s.WaterSubscription) {
                    const sub = s.WaterSubscription;
                    const matchedProduct = actualWaterProducts.find(p => {
                        const nameLower = p.name.toLowerCase();
                        return nameLower.includes(sub.water_type.toLowerCase()) && nameLower.includes(sub.container.toLowerCase());
                    });
                    if (matchedProduct) {
                        const qty = matchedProduct.unit === 'ml' ? 2000 : 1;
                        addItem(uMap, addrGrp, matchedProduct, qty, 'package');
                        newDeliveryItems.push({ schedule_id: s.id, product_id: matchedProduct.id, qty_gm: qty });
                    }
                }

                if (newDeliveryItems.length > 0) {
                    await DeliveryItem.bulkCreate(newDeliveryItems).catch(err => console.error('Auto-create DeliveryItems error:', err));
                }
            }
        }

        // Process Retail Orders
        for (const r of retailOrders) {
            const user = r.User;
            const address = r.Address || defaultAddressMap[user?.id];
            const uMap = getOrInitUser(user, r.delivery_status);
            if (!uMap) continue;

            uMap.allRetailOrderIds.push(r.id);
            if (!uMap.commonBatchId && r.batch_id) uMap.commonBatchId = r.batch_id;

            const addrStr = formatAddress(address);
            const addrGrp = getOrInitAddressGroup(uMap, addrStr, r.batch_id, r.delivery_status);
            addrGrp.retailOrderIds.push(r.id);

            const items = r.Items || [];
            for (const item of items) {
                if (item.Product) addItem(uMap, addrGrp, item.Product, parseFloat(item.quantity || 0), 'retail', item.packed_qty !== null ? parseFloat(item.packed_qty) : null);
            }
        }

        const usersList = Object.values(usersMap).map(u => {
            const totalItems = Object.values(u.totalItemsMap).map(i => ({
                id: i.product.id,
                name: i.product.name,
                hindi_name: i.product.hindi_name,
                unit: i.unit,
                packageQty: i.packageQty,
                retailQty: i.retailQty,
                totalQty: i.packageQty + i.retailQty
            }));

            const addresses = Object.values(u.addressesMap).map(a => ({
                address: a.addressText,
                batch_id: a.batch_id,
                status: a.status,
                scheduleIds: a.scheduleIds,
                retailOrderIds: a.retailOrderIds,
                items: Object.values(a.itemsMap).map(i => ({
                    id: i.product.id,
                    name: i.product.name,
                    hindi_name: i.product.hindi_name,
                    unit: i.unit,
                    packageQty: i.packageQty,
                    retailQty: i.retailQty,
                    totalQty: i.packageQty + i.retailQty,
                    packedQty: i.isPackedSet ? i.packedQty : (i.packageQty + i.retailQty),
                    isPackedSet: i.isPackedSet
                }))
            }));

            return {
                user: u.user,
                hasPackage: u.hasPackage,
                status: u.status,
                batch_id: u.commonBatchId, // Overall batch if we want to default it
                allScheduleIds: u.allScheduleIds,
                allRetailOrderIds: u.allRetailOrderIds,
                totalItems: totalItems,
                addresses: addresses
            };
        });

        res.status(200).json({ success: true, users: usersList, date: dateStr });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// PUT /api/admin/orders/assign-batch
export const assignBatch = async (req, res) => {
    try {
        const { scheduleIds, retailOrderIds, batch_id } = req.body;

        if (Array.isArray(scheduleIds) && scheduleIds.length > 0) {
            await DeliverySchedule.update({ batch_id: batch_id || null }, { where: { id: scheduleIds } });
        }

        if (Array.isArray(retailOrderIds) && retailOrderIds.length > 0) {
            await RetailOrder.update({ batch_id: batch_id || null }, { where: { id: retailOrderIds } });
        }

        res.status(200).json({ success: true, message: "Batch assigned successfully" });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// PUT /api/admin/orders/assign-delivery-boy
export const assignDeliveryBoy = async (req, res) => {
    try {
        const { scheduleIds, retailOrderIds, delivery_boy_id } = req.body;

        if (Array.isArray(scheduleIds) && scheduleIds.length > 0) {
            await DeliverySchedule.update({ delivery_boy_id: delivery_boy_id || null }, { where: { id: scheduleIds } });
        }

        if (Array.isArray(retailOrderIds) && retailOrderIds.length > 0) {
            await RetailOrder.update({ delivery_boy_id: delivery_boy_id || null }, { where: { id: retailOrderIds } });
        }

        res.status(200).json({ success: true, message: "Delivery boy assigned successfully" });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// PUT /api/admin/orders/pack
export const packOrders = async (req, res) => {
    try {
        const { scheduleIds, retailOrderIds, items } = req.body;
        // items: [{ id: productId, packedQty: value, isChecked: boolean }]

        const remainingPacked = {};
        if (items) {
            items.forEach(i => {
                remainingPacked[i.id] = i.isChecked ? parseFloat(i.packedQty ?? 0) : 0;
            });
        }

        const allItemsByProduct = {};

        if (Array.isArray(scheduleIds) && scheduleIds.length > 0) {
            const schedules = await DeliverySchedule.findAll({
                where: { id: scheduleIds },
                include: [{ model: DeliveryItem, as: 'DeliveryItems' }]
            });
            for (const schedule of schedules) {
                for (const dItem of schedule.DeliveryItems) {
                    if (!allItemsByProduct[dItem.product_id]) allItemsByProduct[dItem.product_id] = [];
                    allItemsByProduct[dItem.product_id].push({ type: 'package', item: dItem, parent: schedule });
                }
            }
        }

        if (Array.isArray(retailOrderIds) && retailOrderIds.length > 0) {
            const retailOrders = await RetailOrder.findAll({
                where: { id: retailOrderIds },
                include: [{ model: RetailOrderItem, as: 'Items' }]
            });
            for (const rOrder of retailOrders) {
                for (const rItem of rOrder.Items) {
                    if (!allItemsByProduct[rItem.product_id]) allItemsByProduct[rItem.product_id] = [];
                    allItemsByProduct[rItem.product_id].push({ type: 'retail', item: rItem, parent: rOrder });
                }
            }
        }

        for (const productIdStr of Object.keys(allItemsByProduct)) {
            const productId = parseInt(productIdStr);
            const productItems = allItemsByProduct[productId];
            const payloadItem = items?.find(i => i.id === productId);

            if (payloadItem) {
                if (payloadItem.isChecked) {
                    for (let i = 0; i < productItems.length; i++) {
                        const { type, item } = productItems[i];
                        const demanded = parseFloat(type === 'retail' ? (item.quantity || 0) : (item.qty_gm || 0));
                        const rem = remainingPacked[productId] || 0;
                        const isLast = (i === productItems.length - 1);

                        let alloc = 0;
                        if (isLast) {
                            alloc = rem; // Give all remaining to the last one
                        } else {
                            alloc = Math.min(demanded, rem);
                        }

                        await item.update({ packed_qty: alloc });
                        remainingPacked[productId] = Math.max(0, rem - alloc);
                    }
                } else {
                    // Unchecked
                    for (const { type, item, parent } of productItems) {
                        await item.update({ packed_qty: 0 });

                        if (type === 'package') {
                            const schedule = parent;
                            // Carry over logic
                            const nextSchedule = await DeliverySchedule.findOne({
                                where: {
                                    subscription_id: schedule.subscription_id,
                                    scheduled_date: { [Op.gt]: schedule.scheduled_date }
                                },
                                order: [['scheduled_date', 'ASC']]
                            });

                            if (nextSchedule) {
                                const existingNextItem = await DeliveryItem.findOne({
                                    where: { schedule_id: nextSchedule.id, product_id: item.product_id }
                                });
                                if (existingNextItem) {
                                    await existingNextItem.update({ qty_gm: parseFloat(existingNextItem.qty_gm) + parseFloat(item.qty_gm) });
                                } else {
                                    await DeliveryItem.create({
                                        schedule_id: nextSchedule.id,
                                        product_id: item.product_id,
                                        qty_gm: item.qty_gm,
                                        packed_qty: null
                                    });
                                }

                                // Log the missed product carry-over
                                await MissedProductLog.create({
                                    user_id: schedule.subscription_id ? (await Subscription.findByPk(schedule.subscription_id)).user_id : null,
                                    product_id: item.product_id,
                                    missed_date: schedule.scheduled_date,
                                    missed_qty: item.qty_gm,
                                    next_schedule_date: nextSchedule.scheduled_date
                                });
                            }
                        }
                    }
                }
            } else {
                // Default if not specified in payload
                for (const { type, item } of productItems) {
                    const demanded = parseFloat(type === 'retail' ? (item.quantity || 0) : (item.qty_gm || 0));
                    await item.update({ packed_qty: demanded });
                }
            }
        }

        const autoAssignDelivery = async (scheduleOrOrderId, isRetail) => {
            let addressId = null;
            let targetObj = null;

            if (isRetail) {
                targetObj = await RetailOrder.findByPk(scheduleOrOrderId);
                if (targetObj && !targetObj.delivery_boy_id) addressId = targetObj.address_id;
            } else {
                targetObj = await DeliverySchedule.findByPk(scheduleOrOrderId, {
                    include: [
                        { model: Subscription },
                        { model: WaterSubscription }
                    ]
                });
                if (targetObj && !targetObj.delivery_boy_id) {
                    if (targetObj.Subscription) addressId = targetObj.Subscription.address_id;
                    else if (targetObj.WaterSubscription) addressId = targetObj.WaterSubscription.address_id;
                }
            }

            if (addressId) {
                const address = await Address.findByPk(addressId);
                if (address && address.zone) {
                    let deliveryBoys = await User.findAll({
                        where: { role: 'delivery', status: 'active' }
                    });
                    
                    // Sort manually by last_assigned_at ASC, treating null as very old date
                    deliveryBoys.sort((a, b) => {
                        const aTime = a.last_assigned_at ? new Date(a.last_assigned_at).getTime() : 0;
                        const bTime = b.last_assigned_at ? new Date(b.last_assigned_at).getTime() : 0;
                        return aTime - bTime;
                    });
                    
                    const matchedBoy = deliveryBoys.find(boy => {
                        try {
                            const zones = typeof boy.delivery_zones === 'string' ? JSON.parse(boy.delivery_zones) : boy.delivery_zones;
                            return Array.isArray(zones) && zones.includes(address.zone);
                        } catch (e) { return false; }
                    });

                    if (matchedBoy) {
                        await matchedBoy.update({ last_assigned_at: new Date() });
                        return matchedBoy.id;
                    }
                }
            }
            return null;
        };

        if (Array.isArray(scheduleIds) && scheduleIds.length > 0) {
            for (const sid of scheduleIds) {
                const boyId = await autoAssignDelivery(sid, false);
                const updates = { status: 'ready_for_delivery' };
                if (boyId) updates.delivery_boy_id = boyId;
                await DeliverySchedule.update(updates, { where: { id: sid } });
            }
        }
        if (Array.isArray(retailOrderIds) && retailOrderIds.length > 0) {
            for (const rid of retailOrderIds) {
                const boyId = await autoAssignDelivery(rid, true);
                const updates = { delivery_status: 'ready_for_delivery' };
                if (boyId) updates.delivery_boy_id = boyId;
                await RetailOrder.update(updates, { where: { id: rid } });
            }
        }

        res.status(200).json({ success: true, message: "Orders packed and marked ready for delivery" });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// GET /api/delivery/available-orders
export const getAvailableOrders = async (req, res) => {
    try {
        const today = new Date().toISOString().split('T')[0];

        // Fetch schedules ready for delivery without a delivery boy
        const schedules = await DeliverySchedule.findAll({
            where: {
                scheduled_date: today,
                status: 'ready_for_delivery',
                delivery_boy_id: null
            },
            include: [
                {
                    model: Subscription,
                    include: [{ model: User, attributes: ['name', 'phone', 'id'] }, { model: Address }]
                },
                { model: DeliveryItem, as: 'DeliveryItems', include: [Product] },
                { model: Batch }
            ]
        });

        // Group schedules by user to avoid duplicates on the frontend
        const groupedSchedulesMap = {};
        for (const schedule of schedules) {
            const userId = schedule.Subscription?.User?.id;
            if (!userId) continue;
            
            if (!groupedSchedulesMap[userId]) {
                groupedSchedulesMap[userId] = schedule.toJSON();
                // Ensure DeliveryItems is an array we can push to
                groupedSchedulesMap[userId].DeliveryItems = [...(groupedSchedulesMap[userId].DeliveryItems || [])];
            } else {
                // Combine DeliveryItems
                if (schedule.DeliveryItems && schedule.DeliveryItems.length > 0) {
                    groupedSchedulesMap[userId].DeliveryItems.push(...schedule.toJSON().DeliveryItems);
                }
            }
        }
        
        const groupedSchedules = Object.values(groupedSchedulesMap);

        // Fetch retail orders ready for delivery without a delivery boy
        const retailOrders = await RetailOrder.findAll({
            where: {
                delivery_date: today,
                delivery_status: 'ready_for_delivery',
                delivery_boy_id: null
            },
            include: [
                { model: User, attributes: ['name', 'phone', 'id'] },
                { model: Address },
                { model: RetailOrderItem, as: 'Items', include: [Product] },
                { model: Batch }
            ]
        });

        res.status(200).json({ success: true, schedules: groupedSchedules, retailOrders });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// PUT /api/delivery/accept-order
export const acceptOrder = async (req, res) => {
    try {
        const { type, id } = req.body;
        const deliveryBoyId = req.user.id;

        if (type === 'package') {
            const schedule = await DeliverySchedule.findByPk(id, { include: [Subscription] });
            if (schedule && schedule.Subscription) {
                // Find all schedules for this user today that are ready for delivery to accept them together
                const userSchedules = await DeliverySchedule.findAll({
                    where: { scheduled_date: schedule.scheduled_date, status: 'ready_for_delivery', delivery_boy_id: null },
                    include: [{ model: Subscription, where: { user_id: schedule.Subscription.user_id } }]
                });
                const scheduleIds = userSchedules.map(s => s.id);
                if (scheduleIds.length > 0) {
                    await DeliverySchedule.update({ delivery_boy_id: deliveryBoyId }, { where: { id: scheduleIds } });
                }
            } else {
                await DeliverySchedule.update({ delivery_boy_id: deliveryBoyId }, { where: { id } });
            }
        } else if (type === 'retail') {
            const retail = await RetailOrder.findByPk(id);
            if (retail) {
                const userRetails = await RetailOrder.findAll({
                    where: { delivery_date: retail.delivery_date, delivery_status: 'ready_for_delivery', delivery_boy_id: null, user_id: retail.user_id }
                });
                const retailIds = userRetails.map(r => r.id);
                if (retailIds.length > 0) {
                    await RetailOrder.update({ delivery_boy_id: deliveryBoyId }, { where: { id: retailIds } });
                }
            } else {
                await RetailOrder.update({ delivery_boy_id: deliveryBoyId }, { where: { id } });
            }
        } else {
            return res.status(400).json({ success: false, message: "Invalid type" });
        }

        res.status(200).json({ success: true, message: "Order accepted successfully" });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};// GET /api/admin/missed-products
export const getMissedProducts = async (req, res) => {
    try {
        const missedLogs = await MissedProductLog.findAll({
            include: [
                { model: User, attributes: ['id', 'name', 'phone'] },
                { model: Product, attributes: ['id', 'name', 'unit'] }
            ],
            order: [['created_at', 'DESC']]
        });
        res.status(200).json({ success: true, missedLogs });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// GET /api/delivery/boy-history
export const getDeliveryBoyHistory = async (req, res) => {
    try {
        const deliveryBoyId = req.user.id;
        const { from_date, to_date, order_id, all_time } = req.query;

        let whereClause = { delivery_boy_id: deliveryBoyId, status: 'delivered' };
        let retailWhereClause = { delivery_boy_id: deliveryBoyId, delivery_status: 'delivered' };

        if (order_id) {
            whereClause.id = order_id;
            retailWhereClause.id = order_id;
        } else if (all_time === 'true') {
            // no date filter
        } else if (from_date && to_date) {
            whereClause.actual_delivery_date = { [Op.between]: [from_date, to_date] };
            retailWhereClause.actual_delivery_date = { [Op.between]: [from_date, to_date] };
        } else {
            // Default to today
            const today = new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" }).split(',')[0];
            const [m, d, y] = today.split('/');
            const dateStr = `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
            
            whereClause.actual_delivery_date = dateStr;
            retailWhereClause.actual_delivery_date = dateStr;
        }

        const schedules = await DeliverySchedule.findAll({
            where: whereClause,
            include: [
                {
                    model: Subscription,
                    include: [{ model: User, attributes: ['id', 'name', 'phone'] }, { model: Address }]
                },
                { model: DeliveryItem, as: 'DeliveryItems', include: [{ model: Product, attributes: ['id', 'name', 'hindi_name', 'unit'] }] }
            ],
            order: [['actual_delivery_date', 'DESC']]
        });

        const retailOrders = await RetailOrder.findAll({
            where: retailWhereClause,
            include: [
                { model: User, attributes: ['id', 'name', 'phone'] },
                { model: Address },
                { model: RetailOrderItem, as: 'Items', include: [{ model: Product, attributes: ['id', 'name', 'hindi_name', 'unit'] }] }
            ],
            order: [['actual_delivery_date', 'DESC']]
        });

        res.status(200).json({ success: true, schedules, retailOrders });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// POST /api/admin/return-item
export const adminReturnItem = async (req, res) => {
    const t = await sequelize.transaction();
    try {
        const { delivery_item_id, return_qty, return_reason } = req.body;
        
        const item = await DeliveryItem.findByPk(delivery_item_id, {
            include: [{
                model: DeliverySchedule,
                include: [
                    { model: Subscription, include: [{ model: User }] },
                    { model: WaterSubscription, include: [{ model: User }] }
                ]
            }],
            transaction: t
        });

        if (!item || item.DeliverySchedule?.status !== 'delivered') {
            await t.rollback();
            return res.status(400).json({ success: false, message: "Item not found or schedule not delivered" });
        }

        if (item.return_status !== 'none' && item.return_status !== 'rejected') {
            await t.rollback();
            return res.status(400).json({ success: false, message: `Return already processed for this item` });
        }

        const requestedQty = parseFloat(return_qty);
        if (isNaN(requestedQty) || requestedQty <= 0 || requestedQty > parseFloat(item.qty_gm)) {
            await t.rollback();
            return res.status(400).json({ success: false, message: `Invalid return quantity` });
        }

        const user = item.DeliverySchedule?.Subscription?.User || item.DeliverySchedule?.WaterSubscription?.User;
        if (!user) {
            await t.rollback();
            return res.status(404).json({ success: false, message: "User associated with delivery not found" });
        }

        const product = await Product.findByPk(item.product_id, { transaction: t });
        const refund = requestedQty * parseFloat(product.purchase_price_per_gm);

        // Add returned quantity back to stock and reduce total sold qty
        await product.update({
            current_stock: parseFloat(product.current_stock || 0) + requestedQty,
            total_sold_qty: Math.max(0, parseFloat(product.total_sold_qty || 0) - requestedQty)
        }, { transaction: t });

        await user.update({ wallet_balance: parseFloat(user.wallet_balance) + refund }, { transaction: t });
        await WalletTransaction.create({
            user_id: user.id, amount: refund, type: 'credit',
            reason: `Return processed by Admin for ${product.name}`,
            reference_id: item.id
        }, { transaction: t });

        await Notification.create({
            user_id: user.id,
            title: 'Return Processed',
            message: `Admin has processed a return for ${product.name}. ₹${refund.toFixed(2)} credited to wallet.`,
            type: 'alert',
            scheduled_at: new Date()
        }, { transaction: t });

        await item.update({ 
            return_status: 'approved',
            return_qty: requestedQty,
            return_reason: return_reason || "Admin initiated return",
            returned_by: 'admin'
        }, { transaction: t });

        // Carry-over logic
        if (item.DeliverySchedule?.Subscription) {
            const schedule = item.DeliverySchedule;
            const nextSchedule = await DeliverySchedule.findOne({
                where: {
                    subscription_id: schedule.subscription_id,
                    scheduled_date: { [Op.gt]: schedule.scheduled_date },
                    status: ['pending', 'ready_for_delivery']
                },
                order: [['scheduled_date', 'ASC']],
                transaction: t
            });

            if (nextSchedule) {
                const existingNextItem = await DeliveryItem.findOne({
                    where: { schedule_id: nextSchedule.id, product_id: item.product_id },
                    transaction: t
                });
                if (existingNextItem) {
                    await existingNextItem.update({ qty_gm: parseFloat(existingNextItem.qty_gm) + requestedQty }, { transaction: t });
                } else {
                    await DeliveryItem.create({
                        schedule_id: nextSchedule.id,
                        product_id: item.product_id,
                        qty_gm: requestedQty,
                        packed_qty: null
                    }, { transaction: t });
                }

                await MissedProductLog.create({
                    user_id: user.id,
                    product_id: item.product_id,
                    missed_date: schedule.scheduled_date,
                    missed_qty: requestedQty,
                    next_schedule_date: nextSchedule.scheduled_date
                }, { transaction: t });
            }
        }

        await t.commit();
        res.status(200).json({ success: true, message: "Return processed successfully by Admin" });
    } catch (error) {
        await t.rollback();
        res.status(500).json({ success: false, message: error.message });
    }
};

// POST /api/delivery/boy-return-item
export const boyReturnItem = async (req, res) => {
    const t = await sequelize.transaction();
    try {
        const { delivery_item_id, return_qty, return_reason } = req.body;
        const return_photo_url = req.file ? `/uploads/${req.file.filename}` : null;

        if (!return_photo_url) {
            await t.rollback();
            return res.status(400).json({ success: false, message: "Image is required for return" });
        }
        
        const item = await DeliveryItem.findByPk(delivery_item_id, {
            include: [{
                model: DeliverySchedule,
                include: [
                    { model: Subscription, include: [{ model: User }] },
                    { model: WaterSubscription, include: [{ model: User }] }
                ]
            }],
            transaction: t
        });

        if (!item || item.DeliverySchedule?.status !== 'delivered') {
            await t.rollback();
            return res.status(400).json({ success: false, message: "Item not found or schedule not delivered" });
        }

        if (item.DeliverySchedule.delivery_boy_id !== req.user.id) {
            await t.rollback();
            return res.status(403).json({ success: false, message: "You are not authorized to return this item" });
        }

        if (item.return_status !== 'none' && item.return_status !== 'rejected') {
            await t.rollback();
            return res.status(400).json({ success: false, message: `Return already processed for this item` });
        }

        const requestedQty = parseFloat(return_qty);
        if (isNaN(requestedQty) || requestedQty <= 0 || requestedQty > parseFloat(item.qty_gm)) {
            await t.rollback();
            return res.status(400).json({ success: false, message: `Invalid return quantity` });
        }

        const user = item.DeliverySchedule?.Subscription?.User || item.DeliverySchedule?.WaterSubscription?.User;
        if (!user) {
            await t.rollback();
            return res.status(404).json({ success: false, message: "User associated with delivery not found" });
        }

        const product = await Product.findByPk(item.product_id, { transaction: t });
        const refund = requestedQty * parseFloat(product.purchase_price_per_gm);

        // Add returned quantity back to stock and reduce total sold qty
        await product.update({
            current_stock: parseFloat(product.current_stock || 0) + requestedQty,
            total_sold_qty: Math.max(0, parseFloat(product.total_sold_qty || 0) - requestedQty)
        }, { transaction: t });

        await user.update({ wallet_balance: parseFloat(user.wallet_balance) + refund }, { transaction: t });
        await WalletTransaction.create({
            user_id: user.id, amount: refund, type: 'credit',
            reason: `Return processed by Delivery Boy for ${product.name}`,
            reference_id: item.id
        }, { transaction: t });

        await Notification.create({
            user_id: user.id,
            title: 'Return Processed',
            message: `Delivery Boy has processed a return for ${product.name}. ₹${refund.toFixed(2)} credited to wallet.`,
            type: 'alert',
            scheduled_at: new Date()
        }, { transaction: t });

        await item.update({ 
            return_status: 'approved',
            return_qty: requestedQty,
            return_reason: return_reason || "Delivery Boy initiated return",
            return_photo_url,
            returned_by: 'delivery_boy'
        }, { transaction: t });

        // Carry-over logic
        if (item.DeliverySchedule?.Subscription) {
            const schedule = item.DeliverySchedule;
            const nextSchedule = await DeliverySchedule.findOne({
                where: {
                    subscription_id: schedule.subscription_id,
                    scheduled_date: { [Op.gt]: schedule.scheduled_date },
                    status: ['pending', 'ready_for_delivery']
                },
                order: [['scheduled_date', 'ASC']],
                transaction: t
            });

            if (nextSchedule) {
                const existingNextItem = await DeliveryItem.findOne({
                    where: { schedule_id: nextSchedule.id, product_id: item.product_id },
                    transaction: t
                });
                if (existingNextItem) {
                    await existingNextItem.update({ qty_gm: parseFloat(existingNextItem.qty_gm) + requestedQty }, { transaction: t });
                } else {
                    await DeliveryItem.create({
                        schedule_id: nextSchedule.id,
                        product_id: item.product_id,
                        qty_gm: requestedQty,
                        packed_qty: null
                    }, { transaction: t });
                }

                await MissedProductLog.create({
                    user_id: user.id,
                    product_id: item.product_id,
                    missed_date: schedule.scheduled_date,
                    missed_qty: requestedQty,
                    next_schedule_date: nextSchedule.scheduled_date
                }, { transaction: t });
            }
        }

        await t.commit();
        res.status(200).json({ success: true, message: "Return processed successfully by Delivery Boy" });
    } catch (error) {
        await t.rollback();
        res.status(500).json({ success: false, message: error.message });
    }
};

export const adminReturnOrder = async (req, res) => {
    const t = await sequelize.transaction();
    try {
        const { schedule_id, return_reason } = req.body;
        const schedule = await DeliverySchedule.findByPk(schedule_id, {
            include: [
                { model: Subscription, include: [{ model: User }, { model: Package }] },
                { model: DeliveryItem, as: 'DeliveryItems' }
            ],
            transaction: t
        });

        if (!schedule || schedule.status !== 'delivered') {
            await t.rollback();
            return res.status(400).json({ success: false, message: 'Schedule not found or not delivered' });
        }

        const user = schedule.Subscription?.User;
        if (!user) {
            await t.rollback();
            return res.status(404).json({ success: false, message: 'User not found or retail order (not supported)' });
        }

        let totalRefund = 0;
        for (const item of schedule.DeliveryItems) {
            if (item.return_status === 'none') {
                const product = await Product.findByPk(item.product_id, { transaction: t });
                const refund = parseFloat(item.qty_gm) * parseFloat(product.purchase_price_per_gm);
                totalRefund += refund;
                
                await product.update({
                    current_stock: parseFloat(product.current_stock || 0) + parseFloat(item.qty_gm),
                    total_sold_qty: Math.max(0, parseFloat(product.total_sold_qty || 0) - parseFloat(item.qty_gm))
                }, { transaction: t });

                await item.update({ 
                    return_status: 'approved',
                    return_qty: item.qty_gm,
                    return_reason: return_reason || 'Admin returned entire order',
                    returned_by: 'admin'
                }, { transaction: t });
            }
        }

        if (totalRefund > 0) {
            await user.update({ wallet_balance: parseFloat(user.wallet_balance) + totalRefund }, { transaction: t });
            await WalletTransaction.create({
                user_id: user.id, amount: totalRefund, type: 'credit',
                reason: 'Full order return processed by Admin',
                reference_id: schedule.id
            }, { transaction: t });
        }

        // Add a new schedule at the end of the subscription
        const lastSchedule = await DeliverySchedule.findOne({
            where: { subscription_id: schedule.subscription_id },
            order: [['scheduled_date', 'DESC']],
            transaction: t
        });

        if (lastSchedule && schedule.Subscription.Package) {
            const gap_days = Math.round(30 / schedule.Subscription.Package.services_per_month);
            let nextDate = new Date(lastSchedule.scheduled_date);
            nextDate.setDate(nextDate.getDate() + gap_days);
            if (nextDate.getUTCDay() === 0) nextDate.setUTCDate(nextDate.getUTCDate() - 1); // skip sunday

            const newSchedule = await DeliverySchedule.create({
                subscription_id: schedule.subscription_id,
                scheduled_date: nextDate.toISOString().split('T')[0],
                status: 'pending'
            }, { transaction: t });

            // Copy all items to new schedule and log
            for (const item of schedule.DeliveryItems) {
                await DeliveryItem.create({
                    schedule_id: newSchedule.id,
                    product_id: item.product_id,
                    qty_gm: item.qty_gm,
                    packed_qty: null
                }, { transaction: t });

                await MissedProductLog.create({
                    user_id: user.id,
                    product_id: item.product_id,
                    missed_date: schedule.scheduled_date,
                    missed_qty: item.qty_gm,
                    next_schedule_date: newSchedule.scheduled_date
                }, { transaction: t });
            }
        }

        await t.commit();
        res.status(200).json({ success: true, message: 'Order returned successfully and pushed to next schedule' });
    } catch (error) {
        await t.rollback();
        res.status(500).json({ success: false, message: error.message });
    }
};

export const boyReturnOrder = async (req, res) => {
    const t = await sequelize.transaction();
    try {
        const { schedule_id, return_reason } = req.body;
        const return_photo_url = req.file ? `/uploads/${req.file.filename}` : null;

        if (!return_photo_url) {
            await t.rollback();
            return res.status(400).json({ success: false, message: 'Image is required for full order return' });
        }

        const schedule = await DeliverySchedule.findByPk(schedule_id, {
            include: [
                { model: Subscription, include: [{ model: User }, { model: Package }] },
                { model: DeliveryItem, as: 'DeliveryItems' }
            ],
            transaction: t
        });

        if (!schedule || schedule.status !== 'delivered' || schedule.delivery_boy_id !== req.user.id) {
            await t.rollback();
            return res.status(400).json({ success: false, message: 'Schedule not found, not delivered, or unauthorized' });
        }

        const user = schedule.Subscription?.User;
        if (!user) {
            await t.rollback();
            return res.status(404).json({ success: false, message: 'User not found or retail order (not supported)' });
        }

        let totalRefund = 0;
        for (const item of schedule.DeliveryItems) {
            if (item.return_status === 'none') {
                const product = await Product.findByPk(item.product_id, { transaction: t });
                const refund = parseFloat(item.qty_gm) * parseFloat(product.purchase_price_per_gm);
                totalRefund += refund;
                
                await product.update({
                    current_stock: parseFloat(product.current_stock || 0) + parseFloat(item.qty_gm),
                    total_sold_qty: Math.max(0, parseFloat(product.total_sold_qty || 0) - parseFloat(item.qty_gm))
                }, { transaction: t });

                await item.update({ 
                    return_status: 'approved',
                    return_qty: item.qty_gm,
                    return_reason: return_reason || 'Delivery Boy returned entire order',
                    return_photo_url,
                    returned_by: 'delivery_boy'
                }, { transaction: t });
            }
        }

        if (totalRefund > 0) {
            await user.update({ wallet_balance: parseFloat(user.wallet_balance) + totalRefund }, { transaction: t });
            await WalletTransaction.create({
                user_id: user.id, amount: totalRefund, type: 'credit',
                reason: 'Full order return processed by Delivery Boy',
                reference_id: schedule.id
            }, { transaction: t });
        }

        // Add a new schedule at the end of the subscription
        const lastSchedule = await DeliverySchedule.findOne({
            where: { subscription_id: schedule.subscription_id },
            order: [['scheduled_date', 'DESC']],
            transaction: t
        });

        if (lastSchedule && schedule.Subscription.Package) {
            const gap_days = Math.round(30 / schedule.Subscription.Package.services_per_month);
            let nextDate = new Date(lastSchedule.scheduled_date);
            nextDate.setDate(nextDate.getDate() + gap_days);
            if (nextDate.getUTCDay() === 0) nextDate.setUTCDate(nextDate.getUTCDate() - 1); // skip sunday

            const newSchedule = await DeliverySchedule.create({
                subscription_id: schedule.subscription_id,
                scheduled_date: nextDate.toISOString().split('T')[0],
                status: 'pending'
            }, { transaction: t });

            // Copy all items to new schedule and log
            for (const item of schedule.DeliveryItems) {
                await DeliveryItem.create({
                    schedule_id: newSchedule.id,
                    product_id: item.product_id,
                    qty_gm: item.qty_gm,
                    packed_qty: null
                }, { transaction: t });

                await MissedProductLog.create({
                    user_id: user.id,
                    product_id: item.product_id,
                    missed_date: schedule.scheduled_date,
                    missed_qty: item.qty_gm,
                    next_schedule_date: newSchedule.scheduled_date
                }, { transaction: t });
            }
        }

        await t.commit();
        res.status(200).json({ success: true, message: 'Order returned successfully and pushed to next schedule' });
    } catch (error) {
        await t.rollback();
        res.status(500).json({ success: false, message: error.message });
    }
};
