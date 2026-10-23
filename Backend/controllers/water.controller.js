import { sequelize } from "../confiq/db.js";
import { WaterSubscription, User, WalletTransaction, PaymentTransaction, DeliverySchedule, PauseLog, Product, Address, Subscription, Package } from "../models/index.js";
import { Op } from "sequelize";
import { normalizeDateString, getEarliestCutoffDate, getDaysBetween, getDayAfterDate, getDayBeforeDate } from "../utils/helper.js";
import { generateWaterDeliveryDates, generateDeliveryDates } from "../utils/scheduleEngine.js";

// POST /api/water/subscribe
export const subscribeWater = async (req, res) => {
    const t = await sequelize.transaction();
    try {
        const { water_type, container, frequency, type, payment_method, address_id, batch_id, capacity_liters, bottles_per_delivery, product_id, delivery_time_slot } = req.body;

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
            where: {
                [Op.and]: [
                    sequelize.where(sequelize.fn('LOWER', sequelize.col('category')), 'water'),
                    { status: 'active' }
                ]
            }
        });

        let matchedProduct = null;
        if (product_id) {
            matchedProduct = products.find(p => p.id === parseInt(product_id));
            if (!matchedProduct) {
                const byId = await Product.findByPk(product_id);
                if (byId && byId.status === 'active') matchedProduct = byId;
            }
        }
        if (!matchedProduct) {
            matchedProduct = products.find(p => {
                const nameLower = (p.name || '').toLowerCase();
                const subCategoryLower = (p.sub_category || '').toLowerCase().trim();
                const containerLower = (container || '').trim().toLowerCase();
                const waterTypeLower = (water_type || '').trim().toLowerCase();
                const matchType = nameLower.includes(waterTypeLower);
                const matchContainer = subCategoryLower.includes(containerLower) || containerLower.includes(subCategoryLower) || nameLower.includes(containerLower);
                return matchType && matchContainer;
            });
        }

        if (!matchedProduct) {
            await t.rollback();
            return res.status(404).json({ success: false, message: `No active water product found for ${water_type} in ${container} container. Please add it in Admin Products first.` });
        }

        const price_per_bottle = parseFloat(matchedProduct.selling_price_per_gm); // price per bottle
        const product_capacity = parseFloat(matchedProduct.water_capacity_liters) || parseFloat(capacity_liters) || 1;
        const bottles_count = parseInt(bottles_per_delivery) > 0 ? parseInt(bottles_per_delivery) : 1;

        // Calculate total services and total amount
        // Daily: 30 services per month. Alternate: 15 services per month.
        const services_per_month = frequency === 'daily' ? 30 : 15;
        let total_services = services_per_month;
        let total_bottles = total_services * bottles_count;
        let amount = price_per_bottle * total_bottles;
        let yearly_amount_paid = null;

        if (subType === 'yearly') {
            total_services = services_per_month * 12; // 360 or 180
            total_bottles = total_services * bottles_count;
            const annual_total = price_per_bottle * total_bottles;
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
        const parsedContainer = container.toLowerCase().includes('plastic') ? 'plastic' : 'glass';

        const water = await WaterSubscription.create({
            user_id: req.user.id,
            water_type,
            container: parsedContainer,
            frequency,
            price_per_bottle,
            status: 'active',
            type: subType,
            yearly_amount_paid,
            total_services,
            services_completed: 0,
            address_id: finalAddressId,
            delivery_time_slot: delivery_time_slot || null,
            batch_id: batch_id || null,
            capacity_liters: product_capacity,
            bottles_per_delivery: bottles_count
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
        const minAllowedDate = getEarliestCutoffDate(); // Enforce 8 PM cutoff rule

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
                    scheduled_date: { [Op.gte]: minAllowedDate },
                    status: 'pending'
                },
                attributes: ['scheduled_date'],
                order: [['scheduled_date', 'ASC']]
            });
            // Filter non-Sundays and ensure strictly >= minAllowedDate
            dates = [...new Set(schedules.map(s => s.scheduled_date))]
                .filter(d => d >= minAllowedDate && new Date(d).getUTCDay() !== 0)
                .slice(0, 14);
        }

        // Fallback to next non-Sunday days starting from minAllowedDate
        if (dates.length < 7) {
            const parts = minAllowedDate.split('-').map(Number);
            const baseTime = Date.UTC(parts[0], parts[1] - 1, parts[2]);
            for (let i = 0; i < 20; i++) {
                const d = new Date(baseTime + i * 24 * 60 * 60 * 1000);
                if (d.getUTCDay() !== 0) { // Skip Sundays
                    const dStr = d.toISOString().split('T')[0];
                    if (!dates.includes(dStr)) {
                        dates.push(dStr);
                    }
                }
                if (dates.length >= 10) break;
            }
            dates.sort();
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

        if (!start_date) {
            await t.rollback();
            return res.status(400).json({ success: false, message: "start_date is required" });
        }

        const normalizedStartDate = normalizeDateString(start_date);
        if (!normalizedStartDate) {
            await t.rollback();
            return res.status(400).json({ success: false, message: "Invalid date format. Please provide YYYY-MM-DD." });
        }

        const minAllowedDate = getEarliestCutoffDate();
        if (normalizedStartDate < minAllowedDate) {
            await t.rollback();
            return res.status(400).json({
                success: false,
                message: `Invalid start date. Based on the 8 PM cutoff rule, the earliest possible start date is ${minAllowedDate}`
            });
        }

        // Sunday check
        const dateObj = new Date(normalizedStartDate);
        if (dateObj.getUTCDay() === 0) {
            await t.rollback();
            return res.status(400).json({
                success: false,
                message: "Deliveries cannot start on a Sunday. Please select Monday to Saturday."
            });
        }

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

        // Generate delivery dates based on Daily/Alternate days (Sunday skipped, dates extended)
        const dates = generateWaterDeliveryDates(normalizedStartDate, sub.total_services, sub.frequency);
        const end_date = dates[dates.length - 1];

        // Create schedules
        const scheduleRows = dates.map(date => ({
            water_subscription_id,
            scheduled_date: date,
            status: 'pending',
            batch_id: sub.batch_id || null,
            delivery_time_slot: sub.delivery_time_slot || null
        }));

        await DeliverySchedule.bulkCreate(scheduleRows, { transaction: t });
        await sub.update({ start_date: normalizedStartDate, end_date }, { transaction: t });

        await t.commit();
        res.status(200).json({
            success: true,
            message: "Start date confirmed and delivery schedules generated",
            start_date: normalizedStartDate,
            end_date,
            delivery_dates: dates
        });
    } catch (error) {
        await t.rollback();
        res.status(500).json({ success: false, message: error.message });
    }
};

// Helper for pausing a standard subscription
const pauseStandardSubscription = async (subscription, from_date, to_date, days, pause_type, t) => {
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
        if (days > remaining) {
            throw new Error(`Only ${remaining} monthly pause days remaining. Requested: ${days} days (${from_date} to ${to_date})`);
        }
    } else {
        // yearly
        const existingPause = await PauseLog.findOne({
            where: { subscription_id: subscription.id, type: 'yearly', status: { [Op.ne]: 'cancelled' } },
            transaction: t
        });
        if (existingPause) {
            throw new Error("Yearly pause can only be taken once per subscription");
        }
        if (days > 45) {
            throw new Error(`Yearly pause limit is 45 days maximum. Requested: ${days} days`);
        }
    }

    await PauseLog.create({
        subscription_id: subscription.id,
        pause_start: from_date,
        pause_end: to_date,
        requested_days: days,
        actual_days_used: days,
        type: pause_type,
        status: 'active'
    }, { transaction: t });

    // 1. Mark pending schedules between from_date and to_date as skipped
    await DeliverySchedule.update(
        { status: 'skipped' },
        {
            where: {
                subscription_id: subscription.id,
                status: 'pending',
                scheduled_date: { [Op.between]: [from_date, to_date] }
            },
            transaction: t
        }
    );

    // 2. Remove pending schedules after to_date so we can reschedule remaining servings cleanly
    await DeliverySchedule.destroy({
        where: {
            subscription_id: subscription.id,
            status: 'pending',
            scheduled_date: { [Op.gt]: to_date }
        },
        transaction: t
    });

    // 3. Reschedule remaining servings starting on the day after to_date
    const resumeDate = getDayAfterDate(to_date);
    const remainingServices = subscription.total_services - subscription.services_completed;
    let new_end_date = subscription.end_date;

    if (remainingServices > 0) {
        const pkg = subscription.Package || await Package.findByPk(subscription.package_id, { transaction: t });
        const newDates = generateDeliveryDates(resumeDate, pkg.services_per_month, 1, remainingServices);
        const scheduleRows = newDates.map(date => ({
            subscription_id: subscription.id,
            scheduled_date: date,
            status: 'pending',
            batch_id: subscription.batch_id
        }));
        await DeliverySchedule.bulkCreate(scheduleRows, { transaction: t });
        if (newDates.length > 0) {
            new_end_date = newDates[newDates.length - 1];
        }
    }

    await subscription.update({ status: 'paused', end_date: new_end_date }, { transaction: t });
};

// Helper for pausing a water subscription
const pauseWaterSubscriptionInternal = async (sub, from_date, to_date, days, pause_type, t) => {
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
        if (days > remaining) {
            throw new Error(`Only ${remaining} monthly pause days remaining. Requested: ${days} days (${from_date} to ${to_date})`);
        }
    } else {
        // yearly
        const existingPause = await PauseLog.findOne({
            where: { water_subscription_id: sub.id, type: 'yearly', status: { [Op.ne]: 'cancelled' } },
            transaction: t
        });
        if (existingPause) {
            throw new Error("Yearly pause can only be taken once per subscription");
        }
        if (days > 45) {
            throw new Error(`Yearly pause limit is 45 days maximum. Requested: ${days} days`);
        }
    }

    await PauseLog.create({
        water_subscription_id: sub.id,
        pause_start: from_date,
        pause_end: to_date,
        requested_days: days,
        actual_days_used: days,
        type: pause_type,
        status: 'active'
    }, { transaction: t });

    // 1. Mark pending schedules between from_date and to_date as skipped
    await DeliverySchedule.update(
        { status: 'skipped' },
        {
            where: {
                water_subscription_id: sub.id,
                status: 'pending',
                scheduled_date: { [Op.between]: [from_date, to_date] }
            },
            transaction: t
        }
    );

    // 2. Remove pending schedules after to_date so we can reschedule remaining servings cleanly
    await DeliverySchedule.destroy({
        where: {
            water_subscription_id: sub.id,
            status: 'pending',
            scheduled_date: { [Op.gt]: to_date }
        },
        transaction: t
    });

    // 3. Reschedule remaining servings starting on the day after to_date (skipping Sundays!)
    const resumeDate = getDayAfterDate(to_date);
    const remainingServices = sub.total_services - sub.services_completed;
    let new_end_date = sub.end_date;

    if (remainingServices > 0) {
        const newDates = generateWaterDeliveryDates(resumeDate, remainingServices, sub.frequency);
        const scheduleRows = newDates.map(date => ({
            water_subscription_id: sub.id,
            scheduled_date: date,
            status: 'pending',
            batch_id: sub.batch_id || null,
            delivery_time_slot: sub.delivery_time_slot || null
        }));
        await DeliverySchedule.bulkCreate(scheduleRows, { transaction: t });
        if (newDates.length > 0) {
            new_end_date = newDates[newDates.length - 1];
        }
    }

    await sub.update({ status: 'paused', end_date: new_end_date }, { transaction: t });
};

// PATCH /api/water/:id/pause
export const pauseWaterSubscription = async (req, res) => {
    const t = await sequelize.transaction();
    try {
        const { from_date, to_date, pause_days, pause_type, pause_scope } = req.body;
        const subId = req.params.id;
        const user_id = req.user.id;

        const type = pause_type || 'monthly'; // 'monthly' or 'yearly'
        const scope = pause_scope || 'single'; // 'single' or 'all'

        let validFrom = null;
        let validTo = null;
        let days = 0;

        const minAllowedFromDate = getEarliestCutoffDate();

        if (from_date && to_date) {
            validFrom = normalizeDateString(from_date);
            validTo = normalizeDateString(to_date);

            if (!validFrom || !validTo) {
                await t.rollback();
                return res.status(400).json({ success: false, message: "Invalid date format for from_date or to_date (YYYY-MM-DD)." });
            }

            if (validFrom < minAllowedFromDate) {
                await t.rollback();
                return res.status(400).json({
                    success: false,
                    message: `Invalid from_date. Based on the 8 PM cutoff rule, the earliest possible pause start date is ${minAllowedFromDate}`
                });
            }

            if (validTo < validFrom) {
                await t.rollback();
                return res.status(400).json({ success: false, message: "to_date cannot be earlier than from_date" });
            }

            days = getDaysBetween(validFrom, validTo);
        } else if (pause_days) {
            days = parseInt(pause_days);
            if (isNaN(days) || days <= 0) {
                await t.rollback();
                return res.status(400).json({ success: false, message: "Valid pause_days is required" });
            }
            validFrom = minAllowedFromDate;
            const endParts = validFrom.split('-').map(Number);
            const endD = new Date(Date.UTC(endParts[0], endParts[1] - 1, endParts[2] + days - 1));
            validTo = endD.toISOString().split('T')[0];
        } else {
            await t.rollback();
            return res.status(400).json({ success: false, message: "from_date and to_date are required to pause." });
        }

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
                    await pauseStandardSubscription(sub, validFrom, validTo, days, type, t);
                    pausedCount++;
                } catch (e) {
                    errors.push(`${sub.Package?.name || 'Standard Package'}: ${e.message}`);
                }
            }

            for (const sub of waterSubs) {
                try {
                    await pauseWaterSubscriptionInternal(sub, validFrom, validTo, days, type, t);
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
                message: `Successfully paused ${pausedCount} package(s) from ${validFrom} to ${validTo} (${days} days). Deliveries will resume on ${getDayAfterDate(validTo)}.${errors.length > 0 ? ' Skipped: ' + errors.join(', ') : ''}`,
                from_date: validFrom,
                to_date: validTo,
                days,
                resume_date: getDayAfterDate(validTo)
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
                await pauseWaterSubscriptionInternal(sub, validFrom, validTo, days, type, t);
            } catch (e) {
                await t.rollback();
                return res.status(400).json({ success: false, message: e.message });
            }

            await t.commit();
            res.status(200).json({
                success: true,
                message: `Water subscription paused successfully from ${validFrom} to ${validTo} (${days} days). Deliveries will resume on ${getDayAfterDate(validTo)}.`,
                from_date: validFrom,
                to_date: validTo,
                days,
                resume_date: getDayAfterDate(validTo)
            });
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
        const minDateStr = getEarliestCutoffDate();
        let normalizedRestartDate = null;

        if (restart_date) {
            normalizedRestartDate = normalizeDateString(restart_date);
            if (!normalizedRestartDate) {
                await t.rollback();
                return res.status(400).json({ success: false, message: "Invalid date format. Please provide a valid date (YYYY-MM-DD)." });
            }

            if (normalizedRestartDate < minDateStr) {
                await t.rollback();
                return res.status(400).json({ success: false, message: `Invalid restart date. Based on the 8 PM cutoff rule, the earliest possible restart date is ${minDateStr}` });
            }
        } else {
            // Auto-select earliest allowable restart date
            normalizedRestartDate = minDateStr;
        }

        const sub = await WaterSubscription.findOne({ where: { id: req.params.id, user_id: req.user.id } });
        if (!sub || sub.status !== 'paused') {
            await t.rollback();
            return res.status(400).json({ success: false, message: "Subscription is not paused" });
        }

        const pauseLog = await PauseLog.findOne({ where: { water_subscription_id: sub.id, status: 'active' } });
        if (pauseLog) {
            const actualEnd = getDayBeforeDate(normalizedRestartDate);
            const daysUsed = Math.max(0, getDaysBetween(pauseLog.pause_start, actualEnd));
            await pauseLog.update({ status: 'completed', actual_days_used: daysUsed, pause_end: actualEnd }, { transaction: t });
        }

        // Clean up any pending or skipped deliveries on or after normalizedRestartDate
        await DeliverySchedule.destroy({
            where: {
                water_subscription_id: sub.id,
                scheduled_date: { [Op.gte]: normalizedRestartDate }
            },
            transaction: t
        });

        // Generate delivery dates for remaining services (Sunday skipped, dates extended)
        const remainingServices = sub.total_services - sub.services_completed;
        const newDates = remainingServices > 0
            ? generateWaterDeliveryDates(normalizedRestartDate, remainingServices, sub.frequency)
            : [];

        const scheduleRows = newDates.map(date => ({
            water_subscription_id: sub.id,
            scheduled_date: date,
            status: 'pending',
            batch_id: sub.batch_id || null,
            delivery_time_slot: sub.delivery_time_slot || null
        }));

        await DeliverySchedule.bulkCreate(scheduleRows, { transaction: t });

        const new_end_date = newDates.length > 0 ? newDates[newDates.length - 1] : sub.end_date;
        await sub.update({ status: 'active', end_date: new_end_date }, { transaction: t });

        await t.commit();
        res.status(200).json({
            success: true,
            message: "Water subscription restarted successfully",
            restart_date: normalizedRestartDate,
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

// PATCH /api/admin/water/:id/batch
export const updateWaterSubscriptionBatch = async (req, res) => {
    const t = await sequelize.transaction();
    try {
        const { batch_id } = req.body;
        if (!batch_id) {
            await t.rollback();
            return res.status(400).json({ success: false, message: "batch_id is required" });
        }

        const sub = await WaterSubscription.findByPk(req.params.id, { transaction: t });
        if (!sub) {
            await t.rollback();
            return res.status(404).json({ success: false, message: "Water subscription not found" });
        }

        await sub.update({ batch_id }, { transaction: t });

        // Update all pending delivery schedules
        await DeliverySchedule.update(
            { batch_id },
            { where: { water_subscription_id: sub.id, status: 'pending' }, transaction: t }
        );

        await t.commit();
        res.status(200).json({ success: true, message: "Water subscription batch updated successfully" });
    } catch (error) {
        await t.rollback();
        res.status(500).json({ success: false, message: error.message });
    }
};
