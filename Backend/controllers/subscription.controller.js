import { Op } from "sequelize";
import { sequelize } from "../confiq/db.js";
import {
    Subscription, Package, PackageFixedItem, PackageSeasonalPool, PackageSeasonalConfig,
    SubscriptionItem, DeliverySchedule, WalletTransaction, PaymentTransaction, PauseLog, User, Product, Address,
    ScheduleSeasonalSelection
} from "../models/index.js";
import { generateDeliveryDates } from "../utils/scheduleEngine.js";

// POST /api/subscribe
export const subscribe = async (req, res) => {
    const t = await sequelize.transaction();
    try {
        const { package_id, type, payment_method, address_id } = req.body;
        const user_id = req.user.id;

        const pkg = await Package.findByPk(package_id, {
            include: [
                { model: PackageFixedItem, as: 'FixedItems', include: [{ model: Product }] },
                { model: PackageSeasonalConfig, as: 'SeasonalConfig' }
            ]
        });
        if (!pkg || pkg.status !== 'active') {
            await t.rollback();
            return res.status(404).json({ success: false, message: "Package not found or inactive" });
        }

        // Check custom package access
        if (pkg.type === 'custom' && pkg.target_user_id !== user_id) {
            await t.rollback();
            return res.status(403).json({ success: false, message: "This package is not available for you" });
        }

        // Calculate amount
        let amount = parseFloat(pkg.price);
        let yearly_amount_paid = null;
        let total_services = pkg.services_per_month;

        if (type === 'yearly') {
            const annual_total = parseFloat(pkg.price) * 12;
            amount = annual_total * 0.75; // 25% discount
            yearly_amount_paid = amount;
            total_services = pkg.services_per_month * 12;
        }

        // Credit or check wallet based on payment method
        const user = await User.findByPk(user_id, { transaction: t });
        let newBalance = parseFloat(user.wallet_balance);

        if (payment_method === 'wallet') {
            if (newBalance < amount) {
                await t.rollback();
                return res.status(400).json({
                    success: false,
                    message: `Insufficient wallet balance. Total amount needed: ₹${amount.toFixed(2)}. Your balance: ₹${newBalance.toFixed(2)}`
                });
            }
            // Do not credit or debit the wallet now — it will be debited per service delivery.
        } else {
            // Paid via Razorpay / Gateway — credit the wallet with the purchased amount
            newBalance += amount;
            await user.update({ wallet_balance: newBalance }, { transaction: t });

            await WalletTransaction.create({
                user_id, amount, type: 'credit',
                reason: `${type === 'yearly' ? 'Yearly' : 'Monthly'} package purchase: ${pkg.name} (Razorpay)`,
            }, { transaction: t });
        }

        await PaymentTransaction.create({
            user_id, amount,
            payment_method: payment_method || 'razorpay',
            status: 'success',
            type: type === 'yearly' ? 'yearly_booking' : 'package_purchase'
        }, { transaction: t });

        // Resolve address_id
        let finalAddressId = address_id;
        if (!finalAddressId) {
            const defAddress = await Address.findOne({ where: { user_id, is_default: true }, transaction: t });
            if (defAddress) finalAddressId = defAddress.id;
        }

        // Create subscription (no start_date yet — set after date confirmation)
        const subscription = await Subscription.create({
            user_id, package_id, type: type || 'monthly',
            status: 'active',
            yearly_amount_paid,
            total_services,
            address_id: finalAddressId
        }, { transaction: t });

        // Create subscription items (fixed)
        const fixedItemRows = pkg.FixedItems.map(fi => ({
            subscription_id: subscription.id,
            product_id: fi.product_id,
            qty_gm: fi.default_qty_gm,
            is_fixed: true,
            is_seasonal: false
        }));
        if (fixedItemRows.length > 0) {
            await SubscriptionItem.bulkCreate(fixedItemRows, { transaction: t });
        }

        await t.commit();
        res.status(201).json({
            success: true,
            message: "Subscription created. Please confirm a start date.",
            subscription_id: subscription.id,
            amount_charged: amount,
            wallet_balance: newBalance
        });
    } catch (error) {
        await t.rollback();
        res.status(500).json({ success: false, message: error.message });
    }
};

// GET /api/available-dates?package_id=X
export const getAvailableDates = async (req, res) => {
    try {
        const { package_id } = req.query;
        if (!package_id) return res.status(400).json({ success: false, message: "package_id is required" });

        // Find upcoming scheduled dates used by active subscriptions for same package
        // Use raw approach to avoid GROUP BY issues with Sequelize
        const activeSubIds = await Subscription.findAll({
            where: { package_id, status: 'active' },
            attributes: ['id']
        });
        const subIds = activeSubIds.map(s => s.id);

        let dates = [];
        if (subIds.length > 0) {
            const schedules = await DeliverySchedule.findAll({
                where: {
                    subscription_id: { [Op.in]: subIds },
                    scheduled_date: { [Op.gt]: new Date().toISOString().split('T')[0] },
                    status: 'pending'
                },
                attributes: ['scheduled_date'],
                order: [['scheduled_date', 'ASC']]
            });
            dates = [...new Set(schedules.map(s => s.scheduled_date))].slice(0, 14);
        }

        // If no existing dates, suggest next 7 non-Sunday days from today
        if (dates.length === 0) {
            const today = new Date();
            for (let i = 1; i <= 10; i++) {
                const d = new Date(today);
                d.setDate(d.getDate() + i);
                if (d.getDay() !== 0) { // Skip Sundays
                    dates.push(d.toISOString().split('T')[0]);
                }
                if (dates.length >= 7) break;
            }
        }

        res.status(200).json({ success: true, available_dates: dates });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// POST /api/confirm-start-date
export const confirmStartDate = async (req, res) => {
    const t = await sequelize.transaction();
    try {
        const { subscription_id, start_date } = req.body;
        const subscription = await Subscription.findOne({
            where: { id: subscription_id, user_id: req.user.id },
            include: [{ model: Package }]
        });

        if (!subscription) { await t.rollback(); return res.status(404).json({ success: false, message: "Subscription not found" }); }
        if (subscription.start_date) { await t.rollback(); return res.status(400).json({ success: false, message: "Start date already confirmed" }); }

        const pkg = subscription.Package;
        const daysInCycle = subscription.type === 'yearly' ? 360 : 30;
        const total_services = pkg.services_per_month * (subscription.type === 'yearly' ? 12 : 1);
        const end_date = new Date(start_date);
        end_date.setDate(end_date.getDate() + daysInCycle - 1);

        // Generate delivery dates
        const deliveryDates = generateDeliveryDates(start_date, pkg.services_per_month, subscription.type === 'yearly' ? 12 : 1);

        const scheduleRows = deliveryDates.map(date => ({
            subscription_id,
            scheduled_date: date,
            status: 'pending'
        }));

        await DeliverySchedule.bulkCreate(scheduleRows, { transaction: t });
        await subscription.update({ start_date, end_date, total_services }, { transaction: t });

        await t.commit();
        res.status(200).json({
            success: true,
            message: "Start date confirmed. Delivery schedule created.",
            start_date,
            end_date,
            total_deliveries: deliveryDates.length,
            delivery_dates: deliveryDates
        });
    } catch (error) {
        await t.rollback();
        res.status(500).json({ success: false, message: error.message });
    }
};

// GET /api/my-subscriptions
export const getMySubscriptions = async (req, res) => {
    try {
        const subscriptions = await Subscription.findAll({
            where: { user_id: req.user.id },
            include: [
                { model: Package, include: [{ model: PackageSeasonalConfig, as: 'SeasonalConfig' }] },
                { model: SubscriptionItem, as: 'Items', include: [{ model: Product, attributes: ['id', 'name', 'unit', 'category'] }] },
                {
                    model: DeliverySchedule,
                    as: 'Schedules',
                    include: [
                        {
                            model: ScheduleSeasonalSelection,
                            as: 'SeasonalSelections',
                            include: [{ model: Product, attributes: ['id', 'name', 'unit', 'category', 'selling_price_per_gm'] }]
                        }
                    ]
                }
            ],
            order: [
                ['id', 'DESC'],
                [{ model: DeliverySchedule, as: 'Schedules' }, 'scheduled_date', 'ASC']
            ]
        });
        
        const serialized = subscriptions.map(s => {
            const obj = s.toJSON();
            if (obj.Package) {
                delete obj.Package.margin_percent;
            }
            return obj;
        });

        res.status(200).json({ success: true, subscriptions: serialized });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Helper for pausing a standard subscription
const pauseStandardSubscription = async (subscription, pause_days, pause_type, today, t) => {
    const todayStr = today.toISOString().split('T')[0];
    if (pause_type === 'monthly') {
        const cycleStart = new Date(subscription.start_date);
        const existingPauses = await PauseLog.sum('actual_days_used', {
            where: { subscription_id: subscription.id, status: { [Op.ne]: 'cancelled' }, pause_start: { [Op.gte]: cycleStart } },
            transaction: t
        }) || 0;
        if (existingPauses >= 15) {
            throw new Error(`Monthly pause limit reached (${existingPauses}/15 days used this cycle)`);
        }
        const remaining = 15 - existingPauses;
        if (pause_days > remaining) {
            throw new Error(`Only ${remaining} monthly pause days remaining. Requested: ${pause_days}`);
        }
        const pause_end = new Date(today);
        pause_end.setDate(pause_end.getDate() + pause_days - 1);

        await PauseLog.create({
            subscription_id: subscription.id,
            pause_start: today,
            pause_end,
            requested_days: pause_days,
            actual_days_used: pause_days,
            type: 'monthly',
            status: 'active'
        }, { transaction: t });
    } else {
        // yearly
        const existingPause = await PauseLog.findOne({
            where: { subscription_id: subscription.id, type: 'yearly', status: { [Op.ne]: 'cancelled' } },
            transaction: t
        });
        if (existingPause) {
            throw new Error("Yearly pause can only be taken once per subscription");
        }
        if (pause_days > 45) {
            throw new Error("Yearly pause limit is 45 days maximum");
        }
        const pause_end = new Date(today);
        pause_end.setDate(pause_end.getDate() + pause_days - 1);

        await PauseLog.create({
            subscription_id: subscription.id,
            pause_start: today,
            pause_end,
            requested_days: pause_days,
            actual_days_used: pause_days,
            type: 'yearly',
            status: 'active'
        }, { transaction: t });
    }

    await subscription.update({ status: 'paused' }, { transaction: t });

    // Cancel pending deliveries from today onwards (similar to original code)
    await DeliverySchedule.update(
        { status: 'skipped' },
        {
            where: {
                subscription_id: subscription.id,
                status: 'pending',
                scheduled_date: { [Op.gte]: todayStr }
            },
            transaction: t
        }
    );
};

// Helper for pausing a water subscription
const pauseWaterSubscriptionInternal = async (sub, pause_days, pause_type, today, t) => {
    const todayStr = today.toISOString().split('T')[0];
    if (pause_type === 'monthly') {
        const cycleStart = new Date(sub.start_date);
        const existingPauses = await PauseLog.sum('actual_days_used', {
            where: { water_subscription_id: sub.id, status: { [Op.ne]: 'cancelled' }, pause_start: { [Op.gte]: cycleStart } },
            transaction: t
        }) || 0;
        if (existingPauses >= 15) {
            throw new Error(`Monthly pause limit reached (${existingPauses}/15 days used this cycle)`);
        }
        const remaining = 15 - existingPauses;
        if (pause_days > remaining) {
            throw new Error(`Only ${remaining} monthly pause days remaining. Requested: ${pause_days}`);
        }
        const pause_end = new Date(today);
        pause_end.setDate(pause_end.getDate() + pause_days - 1);

        await PauseLog.create({
            water_subscription_id: sub.id,
            pause_start: today,
            pause_end,
            requested_days: pause_days,
            actual_days_used: pause_days,
            type: 'monthly',
            status: 'active'
        }, { transaction: t });
    } else {
        // yearly
        const existingPause = await PauseLog.findOne({
            where: { water_subscription_id: sub.id, type: 'yearly', status: { [Op.ne]: 'cancelled' } },
            transaction: t
        });
        if (existingPause) {
            throw new Error("Yearly pause can only be taken once per subscription");
        }
        if (pause_days > 45) {
            throw new Error("Yearly pause limit is 45 days maximum");
        }
        const pause_end = new Date(today);
        pause_end.setDate(pause_end.getDate() + pause_days - 1);

        await PauseLog.create({
            water_subscription_id: sub.id,
            pause_start: today,
            pause_end,
            requested_days: pause_days,
            actual_days_used: pause_days,
            type: 'yearly',
            status: 'active'
        }, { transaction: t });
    }

    await sub.update({ status: 'paused' }, { transaction: t });

    // Cancel pending deliveries from today onwards
    await DeliverySchedule.update(
        { status: 'skipped' },
        {
            where: {
                water_subscription_id: sub.id,
                status: 'pending',
                scheduled_date: { [Op.gte]: todayStr }
            },
            transaction: t
        }
    );
};

// PATCH /api/subscriptions/:id/pause
export const pauseSubscription = async (req, res) => {
    const t = await sequelize.transaction();
    try {
        const { pause_days, pause_type, pause_scope } = req.body;
        const subId = req.params.id;
        const user_id = req.user.id;

        const days = parseInt(pause_days);
        const type = pause_type || 'monthly'; // 'monthly' or 'yearly'
        const scope = pause_scope || 'single'; // 'single' or 'all'

        if (!days || days <= 0) {
            await t.rollback();
            return res.status(400).json({ success: false, message: "Valid pause_days is required" });
        }

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        if (scope === 'all') {
            const standardSubs = await Subscription.findAll({
                where: { user_id, status: 'active' },
                include: [{ model: Package }],
                transaction: t
            });
            const waterSubs = await WaterSubscription.findAll({
                where: { user_id, status: 'active' },
                transaction: t
            });

            if (standardSubs.length === 0 && waterSubs.length === 0) {
                await t.rollback();
                return res.status(400).json({ success: false, message: "No active subscriptions found to pause" });
            }

            let pausedCount = 0;
            let errors = [];

            for (const sub of standardSubs) {
                try {
                    await pauseStandardSubscription(sub, days, type, today, t);
                    pausedCount++;
                } catch (e) {
                    errors.push(`${sub.Package?.name || 'Standard Package'}: ${e.message}`);
                }
            }

            for (const sub of waterSubs) {
                try {
                    await pauseWaterSubscriptionInternal(sub, days, type, today, t);
                    pausedCount++;
                } catch (e) {
                    errors.push(`${sub.water_type} Water: ${e.message}`);
                }
            }

            if (pausedCount === 0) {
                await t.rollback();
                return res.status(400).json({ success: false, message: `Could not pause any packages. Errors: ${errors.join(', ')}` });
            }

            await t.commit();
            return res.status(200).json({
                success: true,
                message: `Successfully paused ${pausedCount} package(s).${errors.length > 0 ? ' Skipped: ' + errors.join(', ') : ''}`
            });

        } else {
            // single subscription
            const subscription = await Subscription.findOne({ where: { id: subId, user_id }, transaction: t });
            if (!subscription) {
                await t.rollback();
                return res.status(404).json({ success: false, message: "Subscription not found" });
            }
            if (subscription.status !== 'active') {
                await t.rollback();
                return res.status(400).json({ success: false, message: "Subscription is not active" });
            }

            try {
                await pauseStandardSubscription(subscription, days, type, today, t);
            } catch (e) {
                await t.rollback();
                return res.status(400).json({ success: false, message: e.message });
            }

            await t.commit();
            res.status(200).json({ success: true, message: "Subscription paused successfully" });
        }
    } catch (error) {
        await t.rollback();
        res.status(500).json({ success: false, message: error.message });
    }
};

// PATCH /api/subscriptions/:id/restart
export const restartSubscription = async (req, res) => {
    const t = await sequelize.transaction();
    try {
        const { restart_date } = req.body;
        if (!restart_date) {
            await t.rollback();
            return res.status(400).json({ success: false, message: "restart_date is required" });
        }

        const subscription = await Subscription.findOne({
            where: { id: req.params.id, user_id: req.user.id },
            include: [{ model: Package }]
        });
        if (!subscription || subscription.status !== 'paused') {
            await t.rollback();
            return res.status(400).json({ success: false, message: "Subscription is not paused" });
        }

        const pauseLog = await PauseLog.findOne({ where: { subscription_id: subscription.id, status: 'active' } });
        if (pauseLog) {
            const today = new Date();
            const daysUsed = Math.ceil((today - new Date(pauseLog.pause_start)) / (1000 * 60 * 60 * 24));
            await pauseLog.update({ status: 'completed', actual_days_used: daysUsed, pause_end: today }, { transaction: t });
        }

        // Generate new delivery dates from restart_date for remaining services only
        const pkg = subscription.Package;
        const remainingServices = subscription.total_services - subscription.services_completed;
        const newDates = [];

        if (remainingServices > 0) {
            const gap_days = 30 / pkg.services_per_month;
            const startParts = restart_date.split('-').map(Number);
            const baseTime = Date.UTC(startParts[0], startParts[1] - 1, startParts[2]);

            for (let i = 0; i < remainingServices; i++) {
                const dateVal = new Date(baseTime + Math.round(i * gap_days) * 24 * 60 * 60 * 1000);

                if (dateVal.getUTCDay() === 0) { // Sunday rule: shift to Saturday
                    dateVal.setUTCDate(dateVal.getUTCDate() - 1);
                }
                newDates.push(dateVal.toISOString().split('T')[0]);
            }
        }

        const scheduleRows = newDates.map(date => ({ subscription_id: subscription.id, scheduled_date: date, status: 'pending' }));
        await DeliverySchedule.bulkCreate(scheduleRows, { transaction: t });

        const new_end_date = newDates.length > 0 ? newDates[newDates.length - 1] : subscription.end_date;
        await subscription.update({ status: 'active', end_date: new_end_date }, { transaction: t });

        await t.commit();
        res.status(200).json({ success: true, message: "Subscription restarted", restart_date, end_date: new_end_date, new_delivery_dates: newDates });
    } catch (error) {
        await t.rollback();
        res.status(500).json({ success: false, message: error.message });
    }
};

// PATCH /api/subscriptions/:id/cancel
export const cancelSubscription = async (req, res) => {
    try {
        const subscription = await Subscription.findOne({ where: { id: req.params.id, user_id: req.user.id } });
        if (!subscription) return res.status(404).json({ success: false, message: "Subscription not found" });
        await subscription.update({ status: 'cancelled' });
        res.status(200).json({ success: true, message: "Subscription cancelled" });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// GET /api/seasonal-options/:subscription_id
export const getSeasonalOptions = async (req, res) => {
    try {
        const subscription = await Subscription.findOne({
            where: { id: req.params.subscription_id, user_id: req.user.id },
            include: [
                {
                    model: SubscriptionItem,
                    as: 'Items',
                    include: [{ model: Product, attributes: ['id', 'name', 'unit', 'category', 'selling_price_per_gm'] }]
                },
                {
                    model: Package, include: [
                        { model: PackageSeasonalPool, as: 'SeasonalPool', include: [{ model: Product, attributes: ['id', 'name', 'unit', 'category', 'selling_price_per_gm'] }] },
                        { model: PackageSeasonalConfig, as: 'SeasonalConfig' },
                        { model: PackageFixedItem, as: 'FixedItems', include: [{ model: Product, attributes: ['id', 'name', 'unit', 'category', 'selling_price_per_gm'] }] }
                    ]
                }
            ]
        });
        if (!subscription) return res.status(404).json({ success: false, message: "Subscription not found" });

        const pkg = subscription.Package;
        const pool = pkg.SeasonalPool;
        const maxCount = pkg.SeasonalConfig?.max_select_count;

        // Calculate package price details
        const per_service_amount = (parseFloat(pkg.price) / pkg.services_per_month) * (1 - parseFloat(pkg.margin_percent || 0) / 200);

        // Extract fixed items from subscription (if present) or fallback to package fixed items
        const subFixedItems = subscription.Items.filter(i => i.is_fixed);
        const fixed_items = subFixedItems.length > 0
            ? subFixedItems.map(i => ({
                product_id: i.product_id,
                qty_gm: i.qty_gm,
                Product: i.Product
            }))
            : pkg.FixedItems.map(fi => ({
                product_id: fi.product_id,
                qty_gm: fi.default_qty_gm,
                Product: fi.Product
            }));

        // Calculate default fixed cost
        let fixed_cost = 0;
        for (const fi of fixed_items) {
            fixed_cost += parseFloat(fi.qty_gm) * parseFloat(fi.Product.selling_price_per_gm);
        }
        const seasonal_budget = per_service_amount - fixed_cost;

        // Extract any seasonal items already chosen
        const seasonal_items = subscription.Items.filter(i => i.is_seasonal).map(i => ({
            product_id: i.product_id,
            qty_gm: i.qty_gm
        }));

        res.status(200).json({
            success: true,
            seasonal_pool: pool,
            max_select_count: maxCount,
            seasonal_budget,
            per_service_amount,
            fixed_cost_per_service: fixed_cost,
            fixed_items,
            seasonal_items
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// POST /api/select-seasonal
export const selectSeasonalItems = async (req, res) => {
    const t = await sequelize.transaction();
    try {
        const { subscription_id, items, fixed_items } = req.body;
        // items: [{ product_id, qty_gm }]
        // fixed_items: [{ product_id, qty_gm }]

        const subscription = await Subscription.findOne({
            where: { id: subscription_id, user_id: req.user.id },
            include: [{
                model: Package, include: [
                    { model: PackageSeasonalConfig, as: 'SeasonalConfig' },
                    { model: PackageFixedItem, as: 'FixedItems', include: [{ model: Product }] }
                ]
            }]
        });
        if (!subscription) { await t.rollback(); return res.status(404).json({ success: false, message: "Subscription not found" }); }

        const pkg = subscription.Package;
        const per_service_amount = (parseFloat(pkg.price) / pkg.services_per_month) * (1 - parseFloat(pkg.margin_percent || 0) / 200);

        // 1. Validate fixed items (cannot completely delete or leave empty)
        const pkgFixedItemIds = pkg.FixedItems.map(fi => fi.product_id);
        const inputFixedItems = fixed_items || [];

        for (const fiId of pkgFixedItemIds) {
            const found = inputFixedItems.find(i => parseInt(i.product_id) === fiId);
            if (!found || parseFloat(found.qty_gm) <= 0) {
                await t.rollback();
                return res.status(400).json({
                    success: false,
                    message: "You cannot remove fixed products. You can only reduce their quantity."
                });
            }
        }

        // Calculate combined total cost of fixed and seasonal items
        let total_cost = 0;

        for (const item of inputFixedItems) {
            const product = await Product.findByPk(item.product_id);
            if (!product) { await t.rollback(); return res.status(404).json({ success: false, message: `Product ${item.product_id} not found` }); }
            total_cost += parseFloat(item.qty_gm) * parseFloat(product.selling_price_per_gm);
        }

        const inputSeasonalItems = items || [];
        for (const item of inputSeasonalItems) {
            const product = await Product.findByPk(item.product_id);
            if (!product) { await t.rollback(); return res.status(404).json({ success: false, message: `Product ${item.product_id} not found` }); }
            total_cost += parseFloat(item.qty_gm) * parseFloat(product.selling_price_per_gm);
        }

        let overage = total_cost - per_service_amount;
        if (overage > 0) {
            const { payment_method } = req.body;
            if (payment_method === 'razorpay') {
                // User paid the overage amount! Record transaction
                await PaymentTransaction.create({
                    user_id: req.user.id,
                    amount: overage,
                    payment_method: 'razorpay',
                    status: 'success',
                    type: 'extra_overage_charge'
                }, { transaction: t });
            } else {
                await t.rollback();
                return res.status(400).json({
                    success: false,
                    message: "Selected items exceed your package's delivery budget. Please adjust quantities or pay the overage amount.",
                    overage: overage.toFixed(2),
                    needs_payment: true
                });
            }
        }

        // 2. Update fixed items in SubscriptionItem
        for (const item of inputFixedItems) {
            const [subItem, created] = await SubscriptionItem.findOrCreate({
                where: { subscription_id, product_id: item.product_id, is_fixed: true },
                defaults: { qty_gm: parseFloat(item.qty_gm), is_seasonal: false },
                transaction: t
            });
            if (!created) {
                await subItem.update({ qty_gm: parseFloat(item.qty_gm) }, { transaction: t });
            }
        }

        // 3. Re-save Seasonal Items
        // Remove old seasonal items
        await SubscriptionItem.destroy({ where: { subscription_id, is_seasonal: true }, transaction: t });

        // Add new ones
        const rows = inputSeasonalItems.map(i => ({
            subscription_id,
            product_id: i.product_id,
            qty_gm: i.qty_gm,
            is_fixed: false,
            is_seasonal: true
        }));
        if (rows.length > 0) await SubscriptionItem.bulkCreate(rows, { transaction: t });

        // 4. Update the earliest pending unlocked delivery schedule with these selections
        const earliestSchedule = await DeliverySchedule.findOne({
            where: {
                subscription_id,
                status: 'pending',
                is_locked: false
            },
            order: [['scheduled_date', 'ASC']],
            transaction: t
        });

        if (earliestSchedule) {
            // Delete existing selections for this schedule
            await ScheduleSeasonalSelection.destroy({
                where: { schedule_id: earliestSchedule.id },
                transaction: t
            });

            // Insert new selections (both seasonal and fixed)
            const scheduleSelections = [];

            // Add seasonal selections
            scheduleSelections.push(...inputSeasonalItems
                .filter(item => parseFloat(item.qty_gm) > 0)
                .map(i => ({
                    schedule_id: earliestSchedule.id,
                    product_id: i.product_id,
                    qty_gm: i.qty_gm,
                    is_auto: false
                }))
            );

            // Add fixed selections
            scheduleSelections.push(...inputFixedItems
                .filter(item => parseFloat(item.qty_gm) > 0)
                .map(i => ({
                    schedule_id: earliestSchedule.id,
                    product_id: i.product_id,
                    qty_gm: i.qty_gm,
                    is_auto: false
                }))
            );

            if (scheduleSelections.length > 0) {
                await ScheduleSeasonalSelection.bulkCreate(scheduleSelections, { transaction: t });
            }
        }

        await t.commit();
        res.status(200).json({ success: true, message: "Custom selections saved successfully" });
    } catch (error) {
        await t.rollback();
        res.status(500).json({ success: false, message: error.message });
    }
};

// GET /api/subscriptions/:id/upcoming-selections
export const getUpcomingSelections = async (req, res) => {
    try {
        const subscription = await Subscription.findOne({
            where: { id: req.params.id, user_id: req.user.id },
            include: [
                {
                    model: SubscriptionItem,
                    as: 'Items',
                    include: [{ model: Product, attributes: ['id', 'name', 'unit', 'category', 'selling_price_per_gm'] }]
                },
                {
                    model: Package, include: [
                        { model: PackageSeasonalPool, as: 'SeasonalPool', include: [{ model: Product, attributes: ['id', 'name', 'unit', 'category', 'selling_price_per_gm'] }] },
                        { model: PackageSeasonalConfig, as: 'SeasonalConfig' },
                        { model: PackageFixedItem, as: 'FixedItems', include: [{ model: Product, attributes: ['id', 'name', 'unit', 'category', 'selling_price_per_gm'] }] }
                    ]
                }
            ]
        });

        if (!subscription) {
            return res.status(404).json({ success: false, message: "Subscription not found" });
        }

        const pkg = subscription.Package;
        if (!pkg.SeasonalConfig) {
            return res.status(400).json({ success: false, message: "This package does not support seasonal selections" });
        }

        const pool = pkg.SeasonalPool;
        const maxCount = pkg.SeasonalConfig?.max_select_count;
        const per_service_amount = (parseFloat(pkg.price) / pkg.services_per_month) * (1 - parseFloat(pkg.margin_percent || 0) / 200);

        // Extract fixed items from subscription (if present) or fallback to package fixed items
        const subFixedItems = subscription.Items.filter(i => i.is_fixed);
        const fixed_items = subFixedItems.length > 0
            ? subFixedItems.map(i => ({
                product_id: i.product_id,
                qty_gm: i.qty_gm,
                Product: i.Product
            }))
            : pkg.FixedItems.map(fi => ({
                product_id: fi.product_id,
                qty_gm: fi.default_qty_gm,
                Product: fi.Product
            }));

        let fixed_cost = 0;
        for (const fi of fixed_items) {
            fixed_cost += parseFloat(fi.qty_gm) * parseFloat(fi.Product.selling_price_per_gm);
        }
        const seasonal_budget = per_service_amount - fixed_cost;

        // Fetch pending, unlocked schedules
        const schedules = await DeliverySchedule.findAll({
            where: {
                subscription_id: subscription.id,
                status: 'pending',
                is_locked: false
            },
            order: [['scheduled_date', 'ASC']],
            include: [
                {
                    model: ScheduleSeasonalSelection,
                    as: 'SeasonalSelections',
                    include: [{ model: Product, attributes: ['id', 'name', 'unit', 'category', 'selling_price_per_gm'] }]
                }
            ]
        });

        const now = new Date();
        const formattedSchedules = schedules.map(s => {
            const scheduledDateStr = s.scheduled_date; // YYYY-MM-DD
            const cutoffTime = new Date(`${scheduledDateStr}T00:00:00`);
            cutoffTime.setDate(cutoffTime.getDate() - 1);
            cutoffTime.setHours(20, 0, 0, 0); // 8:00 PM the day before

            const isWindowOpen = now < cutoffTime;

            return {
                id: s.id,
                scheduled_date: s.scheduled_date,
                is_locked: s.is_locked,
                is_window_open: isWindowOpen,
                cutoff_time: cutoffTime,
                selections: s.SeasonalSelections || []
            };
        });

        // Default seasonal selections from subscription
        const default_seasonal = subscription.Items.filter(i => i.is_seasonal).map(i => ({
            product_id: i.product_id,
            qty_gm: i.qty_gm,
            Product: i.Product
        }));

        res.status(200).json({
            success: true,
            seasonal_pool: pool,
            max_select_count: maxCount,
            seasonal_budget,
            per_service_amount,
            fixed_cost_per_service: fixed_cost,
            fixed_items,
            default_seasonal,
            schedules: formattedSchedules
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// POST /api/subscriptions/:id/schedule-seasonal
export const saveScheduleSeasonal = async (req, res) => {
    const t = await sequelize.transaction();
    try {
        const { schedule_id, items, fixed_items } = req.body;
        // items: [{ product_id, qty_gm }]
        // fixed_items: [{ product_id, qty_gm }]

        const subscription = await Subscription.findOne({
            where: { id: req.params.id, user_id: req.user.id },
            include: [{
                model: Package, include: [
                    { model: PackageSeasonalConfig, as: 'SeasonalConfig' },
                    { model: PackageFixedItem, as: 'FixedItems', include: [{ model: Product }] }
                ]
            }, {
                model: SubscriptionItem,
                as: 'Items',
                include: [{ model: Product }]
            }]
        });

        if (!subscription) {
            await t.rollback();
            return res.status(404).json({ success: false, message: "Subscription not found" });
        }

        const schedule = await DeliverySchedule.findOne({
            where: { id: schedule_id, subscription_id: subscription.id }
        });

        if (!schedule) {
            await t.rollback();
            return res.status(404).json({ success: false, message: "Schedule not found or doesn't belong to this subscription" });
        }

        if (schedule.status !== 'pending' || schedule.is_locked) {
            await t.rollback();
            return res.status(400).json({ success: false, message: "This delivery schedule is locked or already processed" });
        }

        // Check 8 PM cutoff
        const scheduledDateStr = schedule.scheduled_date; // YYYY-MM-DD
        const cutoffTime = new Date(`${scheduledDateStr}T00:00:00`);
        cutoffTime.setDate(cutoffTime.getDate() - 1);
        cutoffTime.setHours(20, 0, 0, 0); // 8:00 PM the day before

        const now = new Date();
        if (now >= cutoffTime) {
            await t.rollback();
            return res.status(400).json({ success: false, message: "Selection window closed for this delivery date (cutoff was 8 PM of the day before)" });
        }

        const pkg = subscription.Package;
        const per_service_amount = (parseFloat(pkg.price) / pkg.services_per_month) * (1 - parseFloat(pkg.margin_percent || 0) / 200);

        // 1. Validate fixed items (cannot completely delete or leave empty)
        const pkgFixedItemIds = pkg.FixedItems.map(fi => fi.product_id);
        const inputFixedItems = fixed_items || [];

        for (const fiId of pkgFixedItemIds) {
            const found = inputFixedItems.find(i => parseInt(i.product_id) === fiId);
            if (!found || parseFloat(found.qty_gm) <= 0) {
                await t.rollback();
                return res.status(400).json({
                    success: false,
                    message: "You cannot remove fixed products. You can only reduce/increase their quantity."
                });
            }
        }

        // Calculate combined total cost of fixed and seasonal items in this selection
        let total_cost = 0;

        for (const item of inputFixedItems) {
            const product = await Product.findByPk(item.product_id);
            if (!product) {
                await t.rollback();
                return res.status(404).json({ success: false, message: `Product ${item.product_id} not found` });
            }
            total_cost += parseFloat(item.qty_gm) * parseFloat(product.selling_price_per_gm);
        }

        const inputSeasonalItems = items || [];

        // Max item count check for seasonal items
        const maxCount = pkg.SeasonalConfig?.max_select_count;
        const activeSelectionsCount = inputSeasonalItems.filter(item => parseFloat(item.qty_gm) > 0).length;
        if (maxCount && activeSelectionsCount > maxCount) {
            await t.rollback();
            return res.status(400).json({ success: false, message: `You can select a maximum of ${maxCount} seasonal items.` });
        }

        for (const item of inputSeasonalItems) {
            const product = await Product.findByPk(item.product_id);
            if (!product) {
                await t.rollback();
                return res.status(404).json({ success: false, message: `Product ${item.product_id} not found` });
            }
            total_cost += parseFloat(item.qty_gm) * parseFloat(product.selling_price_per_gm);
        }

        let overage = total_cost - per_service_amount;
        if (overage > 0) {
            const { payment_method } = req.body;
            if (payment_method === 'razorpay') {
                // User paid the overage amount! Record transaction
                await PaymentTransaction.create({
                    user_id: req.user.id,
                    amount: overage,
                    payment_method: 'razorpay',
                    status: 'success',
                    type: 'extra_overage_charge'
                }, { transaction: t });
            } else {
                await t.rollback();
                return res.status(400).json({
                    success: false,
                    message: "Selected items exceed your seasonal budget for this delivery. Please adjust quantities or pay the overage amount.",
                    overage: overage.toFixed(2),
                    needs_payment: true
                });
            }
        }

        // Delete existing selections for this schedule
        await ScheduleSeasonalSelection.destroy({
            where: { schedule_id },
            transaction: t
        });

        // Insert new selections (both seasonal and fixed)
        const rows = [];
        
        // Add seasonal selections
        rows.push(...inputSeasonalItems
            .filter(item => parseFloat(item.qty_gm) > 0)
            .map(i => ({
                schedule_id,
                product_id: i.product_id,
                qty_gm: i.qty_gm,
                is_auto: false
            }))
        );

        // Add custom fixed selections
        rows.push(...inputFixedItems.map(i => ({
            schedule_id,
            product_id: i.product_id,
            qty_gm: i.qty_gm,
            is_auto: false
        })));

        if (rows.length > 0) {
            await ScheduleSeasonalSelection.bulkCreate(rows, { transaction: t });
        }

        await t.commit();
        res.status(200).json({ success: true, message: "Seasonal selections for this service saved successfully" });
    } catch (error) {
        await t.rollback();
        res.status(500).json({ success: false, message: error.message });
    }
};

