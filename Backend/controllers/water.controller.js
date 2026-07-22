import { sequelize } from "../confiq/db.js";
import { WaterSubscription, User, WalletTransaction, PaymentTransaction, DeliverySchedule, PauseLog, Product, Address, Subscription, Package } from "../models/index.js";
import { Op } from "sequelize";

// POST /api/water/subscribe
export const subscribeWater = async (req, res) => {
    const t = await sequelize.transaction();
    try {
        const { water_type, container, frequency, type, payment_method, address_id } = req.body;
        
        if (!water_type || !container || !frequency) {
            await t.rollback();
            return res.status(400).json({ success: false, message: "water_type, container, and frequency are required" });
        }

        const subType = type || 'monthly'; // 'monthly' or 'yearly'

        // Check if user already has an active water subscription
        const existing = await WaterSubscription.findOne({ 
            where: { user_id: req.user.id, status: { [Op.in]: ['active', 'paused'] } } 
        });
        if (existing) {
            await t.rollback();
            return res.status(400).json({ success: false, message: "You already have an active or paused water subscription" });
        }

        // Find matched water product from admin products to get the price
        const products = await Product.findAll({
            where: { category: 'water', status: 'active' }
        });

        const matchedProduct = products.find(p => {
            const nameLower = p.name.toLowerCase();
            return nameLower.includes(water_type.toLowerCase()) && nameLower.includes(container.toLowerCase());
        });

        if (!matchedProduct) {
            await t.rollback();
            return res.status(404).json({ success: false, message: `No active water product found for ${water_type} in ${container} container. Please add it in Admin Products first.` });
        }

        const price_per_bottle = parseFloat(matchedProduct.selling_price_per_gm); // price per bottle

        // Calculate total services and total amount
        // Daily: 30 services per month. Alternate: 15 services per month.
        const services_per_month = frequency === 'daily' ? 30 : 15;
        let total_services = services_per_month;
        let amount = price_per_bottle * total_services;
        let yearly_amount_paid = null;

        if (subType === 'yearly') {
            total_services = services_per_month * 12; // 360 or 180
            const annual_total = price_per_bottle * total_services;
            amount = annual_total * 0.75; // 25% discount for yearly booking
            yearly_amount_paid = amount;
        }

        // Credit or check wallet based on payment method
        const user = await User.findByPk(req.user.id, { transaction: t });
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
                user_id: user.id, amount, type: 'credit',
                reason: `${subType === 'yearly' ? 'Yearly' : 'Monthly'} Water Subscription purchase (Razorpay)`,
            }, { transaction: t });
        }

        await PaymentTransaction.create({
            user_id: user.id, amount,
            payment_method: payment_method || 'razorpay',
            status: 'success',
            type: subType === 'yearly' ? 'yearly_booking' : 'package_purchase'
        }, { transaction: t });

        // Resolve address_id
        let finalAddressId = address_id;
        if (!finalAddressId) {
            const defAddress = await Address.findOne({ where: { user_id: req.user.id, is_default: true }, transaction: t });
            if (defAddress) finalAddressId = defAddress.id;
        }

        // Create the WaterSubscription (no start_date yet)
        const water = await WaterSubscription.create({
            user_id: req.user.id,
            water_type,
            container,
            frequency,
            price_per_bottle,
            status: 'active',
            type: subType,
            yearly_amount_paid,
            total_services,
            services_completed: 0,
            address_id: finalAddressId
        }, { transaction: t });

        await t.commit();
        res.status(201).json({ 
            success: true, 
            message: "Water subscription purchased! Please select a start date.", 
            water_subscription_id: water.id,
            amount_charged: amount,
            wallet_balance: newBalance
        });
    } catch (error) {
        await t.rollback();
        res.status(500).json({ success: false, message: error.message });
    }
};

// GET /api/water/subscriptions
export const getWaterSubscriptions = async (req, res) => {
    try {
        const waters = await WaterSubscription.findAll({ 
            where: { user_id: req.user.id },
            include: [{ model: DeliverySchedule, as: 'Schedules' }]
        });
        res.status(200).json({ success: true, water_subscriptions: waters });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// GET /api/water/available-dates
export const getWaterAvailableDates = async (req, res) => {
    try {
        // Find active water subscriptions to suggest matching delivery dates
        const activeWaters = await WaterSubscription.findAll({
            where: { status: 'active', start_date: { [Op.ne]: null } },
            attributes: ['id']
        });
        const waterIds = activeWaters.map(w => w.id);

        let dates = [];
        if (waterIds.length > 0) {
            const schedules = await DeliverySchedule.findAll({
                where: {
                    water_subscription_id: { [Op.in]: waterIds },
                    scheduled_date: { [Op.gte]: new Date().toISOString().split('T')[0] },
                    status: 'pending'
                },
                attributes: ['scheduled_date'],
                order: [['scheduled_date', 'ASC']]
            });
            dates = [...new Set(schedules.map(s => s.scheduled_date))].slice(0, 14);
        }

        // Fallback to next 7 non-Sunday days
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

// POST /api/water/confirm-start-date
export const confirmWaterStartDate = async (req, res) => {
    const t = await sequelize.transaction();
    try {
        const { water_subscription_id, start_date } = req.body;

        const sub = await WaterSubscription.findOne({
            where: { id: water_subscription_id, user_id: req.user.id }
        });

        if (!sub) {
            await t.rollback();
            return res.status(404).json({ success: false, message: "Water subscription not found" });
        }
        if (sub.start_date) {
            await t.rollback();
            return res.status(400).json({ success: false, message: "Start date already confirmed" });
        }

        // Generate delivery dates based on Daily/Alternate days
        const gap_days = sub.frequency === 'daily' ? 1 : 2;
        const totalServices = sub.total_services;
        const dates = [];

        const startParts = start_date.split('-').map(Number);
        const baseTime = Date.UTC(startParts[0], startParts[1] - 1, startParts[2]);

        for (let i = 0; i < totalServices; i++) {
            const dateVal = new Date(baseTime + Math.round(i * gap_days) * 24 * 60 * 60 * 1000);

            if (dateVal.getUTCDay() === 0) { // Sunday rule: shift to Saturday
                dateVal.setUTCDate(dateVal.getUTCDate() - 1);
            }
            dates.push(dateVal.toISOString().split('T')[0]);
        }

        const end_date = dates[dates.length - 1];

        // Create schedules
        const scheduleRows = dates.map(date => ({
            water_subscription_id,
            scheduled_date: date,
            status: 'pending'
        }));

        await DeliverySchedule.bulkCreate(scheduleRows, { transaction: t });
        await sub.update({ start_date, end_date }, { transaction: t });

        await t.commit();
        res.status(200).json({ 
            success: true, 
            message: "Start date confirmed and delivery schedules generated",
            start_date,
            end_date,
            delivery_dates: dates
        });
    } catch (error) {
        await t.rollback();
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
    
    // Cancel pending deliveries from today onwards
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

// PATCH /api/water/:id/pause
export const pauseWaterSubscription = async (req, res) => {
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
            // single water subscription
            const sub = await WaterSubscription.findOne({ where: { id: subId, user_id }, transaction: t });
            if (!sub) {
                await t.rollback();
                return res.status(404).json({ success: false, message: "Water subscription not found" });
            }
            if (sub.status !== 'active') {
                await t.rollback();
                return res.status(400).json({ success: false, message: "Subscription is not active" });
            }

            try {
                await pauseWaterSubscriptionInternal(sub, days, type, today, t);
            } catch (e) {
                await t.rollback();
                return res.status(400).json({ success: false, message: e.message });
            }

            await t.commit();
            res.status(200).json({ success: true, message: "Water subscription paused successfully" });
        }
    } catch (error) {
        await t.rollback();
        res.status(500).json({ success: false, message: error.message });
    }
};

// PATCH /api/water/:id/restart
export const restartWaterSubscription = async (req, res) => {
    const t = await sequelize.transaction();
    try {
        const { restart_date } = req.body;
        if (!restart_date) {
            await t.rollback();
            return res.status(400).json({ success: false, message: "restart_date is required" });
        }

        // Validate restart_date with 8 PM rule
        const now = new Date();
        const currentHour = now.getHours();
        const daysToAdd = currentHour >= 20 ? 2 : 1;
        
        const minDate = new Date(now);
        minDate.setDate(minDate.getDate() + daysToAdd);
        const minDateStr = minDate.toISOString().split('T')[0];

        if (restart_date < minDateStr) {
            await t.rollback();
            return res.status(400).json({ success: false, message: `Invalid restart date. Based on the 8 PM cutoff rule, the earliest possible restart date is ${minDateStr}` });
        }

        const sub = await WaterSubscription.findOne({ where: { id: req.params.id, user_id: req.user.id } });
        if (!sub || sub.status !== 'paused') {
            await t.rollback();
            return res.status(400).json({ success: false, message: "Subscription is not paused" });
        }

        const pauseLog = await PauseLog.findOne({ where: { water_subscription_id: sub.id, status: 'active' } });
        if (pauseLog) {
            const today = new Date();
            const daysUsed = Math.ceil((today - new Date(pauseLog.pause_start)) / (1000 * 60 * 60 * 24));
            await pauseLog.update({ status: 'completed', actual_days_used: daysUsed, pause_end: today }, { transaction: t });
        }

        // Generate delivery dates for remaining services
        const remainingServices = sub.total_services - sub.services_completed;
        const newDates = [];

        if (remainingServices > 0) {
            const gap_days = sub.frequency === 'daily' ? 1 : 2;
            const startParts = restart_date.split('-').map(Number);
            const baseTime = Date.UTC(startParts[0], startParts[1] - 1, startParts[2]);

            for (let i = 0; i < remainingServices; i++) {
                const dateVal = new Date(baseTime + Math.round(i * gap_days) * 24 * 60 * 60 * 1000);

                if (dateVal.getUTCDay() === 0) { // Sunday rule
                    dateVal.setUTCDate(dateVal.getUTCDate() - 1);
                }
                newDates.push(dateVal.toISOString().split('T')[0]);
            }
        }

        const scheduleRows = newDates.map(date => ({
            water_subscription_id: sub.id,
            scheduled_date: date,
            status: 'pending'
        }));

        await DeliverySchedule.bulkCreate(scheduleRows, { transaction: t });

        const new_end_date = newDates.length > 0 ? newDates[newDates.length - 1] : sub.end_date;
        await sub.update({ status: 'active', end_date: new_end_date }, { transaction: t });

        await t.commit();
        res.status(200).json({ 
            success: true, 
            message: "Water subscription restarted successfully", 
            restart_date, 
            end_date: new_end_date, 
            new_delivery_dates: newDates 
        });
    } catch (error) {
        await t.rollback();
        res.status(500).json({ success: false, message: error.message });
    }
};

// PATCH /api/water/:id/cancel
export const cancelWaterSubscription = async (req, res) => {
    try {
        const sub = await WaterSubscription.findOne({ where: { id: req.params.id, user_id: req.user.id } });
        if (!sub) return res.status(404).json({ success: false, message: "Water subscription not found" });
        await sub.update({ status: 'cancelled' });
        res.status(200).json({ success: true, message: "Water subscription cancelled" });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
