import { Op } from "sequelize";
import { sequelize } from "../confiq/db.js";
import {
    Subscription, Package, PackageFixedItem, PackageSeasonalPool, PackageSeasonalConfig,
    SubscriptionItem, DeliverySchedule, WalletTransaction, PaymentTransaction, PauseLog, User, Product, Address,
    ScheduleSeasonalSelection, DeliveryItem, MissedProductLog, ReturnedProductLog, WaterSubscription
} from "../models/index.js";
import { generateDeliveryDates, generateWaterDeliveryDates } from "../utils/scheduleEngine.js";
import { normalizeDateString, getEarliestCutoffDate, getDaysBetween, getDayAfterDate, getDayBeforeDate } from "../utils/helper.js";

// POST /api/subscribe
export const subscribe = async (req, res) => {
    const t = await sequelize.transaction();
    try {
        const { package_id, type, payment_method, address_id, batch_id } = req.body;
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

        // 🚫 Prevent duplicate: check if user already has active/paused subscription for this package
        const existingSubscription = await Subscription.findOne({
            where: {
                user_id,
                package_id,
                status: { [Op.in]: ['active', 'paused'] }
            }
        });
        if (existingSubscription) {
            await t.rollback();
            return res.status(409).json({
                success: false,
                message: `Aap pehle se is package ke subscriber hain. Aapka current subscription end hone ke baad aap ise renew kar sakte hain.`,
                existing_subscription_id: existingSubscription.id,
                existing_status: existingSubscription.status
            });
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

        // --- NEW LOGIC: Post-paid Debt Recovery ---
        if (parseFloat(user.postpaid_debt) > 0) {
            const debt = parseFloat(user.postpaid_debt);
            newBalance -= debt;
            await user.update({ postpaid_debt: 0 }, { transaction: t });
            await WalletTransaction.create({
                user_id, amount: debt, type: 'debit',
                reason: 'Recovery for previous post-paid serving'
            }, { transaction: t });
        }
        // ------------------------------------------

        // --- NEW LOGIC: Renewal Chain & Locked Price ---
        const oldSub = await Subscription.findOne({
            where: { user_id, package_id },
            order: [['created_at', 'DESC']],
            transaction: t
        });

        let renewal_count = 1;
        let locked_price = amount;

        if (oldSub) {
            let isEligible = false;
            if (oldSub.status === 'active' || oldSub.status === 'paused') {
                isEligible = true;
            } else if (oldSub.status === 'completed' && oldSub.end_date) {
                const endDate = new Date(oldSub.end_date);
                const sevenDaysAgo = new Date();
                sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
                if (endDate >= sevenDaysAgo) {
                    isEligible = true;
                }
            }
            if (isEligible) {
                renewal_count = oldSub.renewal_count + 1;
                locked_price = parseFloat(oldSub.locked_price || oldSub.Package?.price || pkg.price);
                if (renewal_count >= 3) {
                    if (type === 'yearly') {
                        amount = locked_price * 12 * 0.75;
                        yearly_amount_paid = amount;
                    } else {
                        amount = locked_price;
                    }
                }
            }
        }
        // ------------------------------------------

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
            address_id: finalAddressId,
            batch_id,
            renewal_count,
            locked_price
        }, { transaction: t });

        // Create subscription items (fixed)
        const activeFixedItems = pkg.FixedItems.filter(fi => fi.Product && fi.Product.status === 'active');
        const fixedItemRows = activeFixedItems.map(fi => ({
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

        const minAllowedDate = getEarliestCutoffDate(); // Enforce 8 PM cutoff rule

        // Find upcoming scheduled dates used by active subscriptions for same package
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
                    scheduled_date: { [Op.gte]: minAllowedDate },
                    status: 'pending'
                },
                attributes: ['scheduled_date'],
                order: [['scheduled_date', 'ASC']]
            });
            dates = [...new Set(schedules.map(s => s.scheduled_date))]
                .filter(d => d >= minAllowedDate && new Date(d).getUTCDay() !== 0)
                .slice(0, 14);
        }

        // If no existing dates, suggest next non-Sunday days starting from minAllowedDate
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
            status: 'pending',
            batch_id: subscription.batch_id
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
                            include: [{ model: Product, attributes: ['id', 'name', 'unit', 'category', 'selling_price_per_gm', 'purchase_price_per_gm'] }]
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
            batch_id: sub.batch_id
        }));
        await DeliverySchedule.bulkCreate(scheduleRows, { transaction: t });
        if (newDates.length > 0) {
            new_end_date = newDates[newDates.length - 1];
        }
    }

    await sub.update({ status: 'paused', end_date: new_end_date }, { transaction: t });
};

// PATCH /api/subscriptions/:id/pause
export const pauseSubscription = async (req, res) => {
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
                await pauseStandardSubscription(subscription, validFrom, validTo, days, type, t);
            } catch (e) {
                await t.rollback();
                return res.status(400).json({ success: false, message: e.message });
            }

            await t.commit();
            res.status(200).json({
                success: true,
                message: `Subscription paused successfully from ${validFrom} to ${validTo} (${days} days). Deliveries will resume on ${getDayAfterDate(validTo)}.`,
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

// PATCH /api/subscriptions/:id/restart
export const restartSubscription = async (req, res) => {
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
            const actualEnd = getDayBeforeDate(normalizedRestartDate);
            const daysUsed = Math.max(0, getDaysBetween(pauseLog.pause_start, actualEnd));
            await pauseLog.update({ status: 'completed', actual_days_used: daysUsed, pause_end: actualEnd }, { transaction: t });
        }

        // Clean up any pending or skipped deliveries on or after normalizedRestartDate
        await DeliverySchedule.destroy({
            where: {
                subscription_id: subscription.id,
                scheduled_date: { [Op.gte]: normalizedRestartDate }
            },
            transaction: t
        });

        // Generate new delivery dates from normalizedRestartDate for remaining services only
        const pkg = subscription.Package;
        const remainingServices = subscription.total_services - subscription.services_completed;
        const newDates = remainingServices > 0
            ? generateDeliveryDates(normalizedRestartDate, pkg.services_per_month, 1, remainingServices)
            : [];

        const scheduleRows = newDates.map(date => ({
            subscription_id: subscription.id,
            scheduled_date: date,
            status: 'pending',
            batch_id: subscription.batch_id
        }));
        await DeliverySchedule.bulkCreate(scheduleRows, { transaction: t });

        const new_end_date = newDates.length > 0 ? newDates[newDates.length - 1] : subscription.end_date;
        await subscription.update({ status: 'active', end_date: new_end_date }, { transaction: t });

        await t.commit();
        res.status(200).json({
            success: true,
            message: "Subscription restarted successfully",
            restart_date: normalizedRestartDate,
            end_date: new_end_date,
            new_delivery_dates: newDates
        });
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
                    include: [{ model: Product, attributes: ['id', 'name', 'unit', 'category', 'selling_price_per_gm', 'purchase_price_per_gm'] }]
                },
                {
                    model: Package, include: [
                        { model: PackageSeasonalPool, as: 'SeasonalPool', include: [{ model: Product, attributes: ['id', 'name', 'unit', 'category', 'selling_price_per_gm', 'purchase_price_per_gm', 'status'] }] },
                        { model: PackageSeasonalConfig, as: 'SeasonalConfig' },
                        { model: PackageFixedItem, as: 'FixedItems', include: [{ model: Product, attributes: ['id', 'name', 'unit', 'category', 'selling_price_per_gm', 'purchase_price_per_gm', 'status'] }] }
                    ]
                }
            ]
        });
        if (!subscription) return res.status(404).json({ success: false, message: "Subscription not found" });

        const pkg = subscription.Package;
        const pool = pkg.SeasonalPool.filter(sp => sp.Product && sp.Product.status === 'active').map(sp => {
            const spData = sp.toJSON ? sp.toJSON() : { ...sp };
            const effectivePrice = sp.purchase_price_per_gm != null
                ? parseFloat(sp.purchase_price_per_gm)
                : parseFloat(sp.Product?.purchase_price_per_gm || 0);
            if (spData.Product) {
                spData.Product.purchase_price_per_gm = effectivePrice;
            }
            spData.purchase_price_per_gm = effectivePrice;
            return spData;
        });
        const maxCount = pkg.SeasonalConfig?.max_select_count;

        // Calculate package price details
        // Formula consistent with package.controller.js: divide by (1 + margin/100)
        const per_service_amount = (parseFloat(pkg.price) / pkg.services_per_month) / (1 + parseFloat(pkg.margin_percent || 0) / 100);

        // Extract fixed items from subscription (if present) or fallback to package fixed items
        const subFixedItems = subscription.Items.filter(i => i.is_fixed && i.Product && i.Product.status === 'active');
        const activePkgFixedItems = pkg.FixedItems.filter(fi => fi.Product && fi.Product.status === 'active');

        const fixed_items = subFixedItems.length > 0
            ? subFixedItems.map(i => {
                const pkgFi = pkg.FixedItems.find(pfi => pfi.product_id === i.product_id);
                return {
                    product_id: i.product_id,
                    qty_gm: i.qty_gm,
                    Product: i.Product,
                    purchase_price_per_gm: pkgFi?.purchase_price_per_gm != null ? pkgFi.purchase_price_per_gm : i.Product.purchase_price_per_gm
                };
            })
            : activePkgFixedItems.map(fi => ({
                product_id: fi.product_id,
                qty_gm: fi.default_qty_gm,
                Product: fi.Product,
                purchase_price_per_gm: fi.purchase_price_per_gm != null ? fi.purchase_price_per_gm : fi.Product.purchase_price_per_gm
            }));

        // Calculate default fixed cost
        let fixed_cost = 0;
        for (const fi of fixed_items) {
            const price = fi.purchase_price_per_gm != null ? parseFloat(fi.purchase_price_per_gm) : parseFloat(fi.Product.purchase_price_per_gm || 0);
            fixed_cost += parseFloat(fi.qty_gm) * price;
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
                    { model: PackageFixedItem, as: 'FixedItems', include: [{ model: Product }] },
                    { model: PackageSeasonalPool, as: 'SeasonalPool', include: [{ model: Product }] }
                ]
            }]
        });
        if (!subscription) { await t.rollback(); return res.status(404).json({ success: false, message: "Subscription not found" }); }

        const pkg = subscription.Package;
        // Formula consistent with package.controller.js: divide by (1 + margin/100)
        const per_service_amount = (parseFloat(pkg.price) / pkg.services_per_month) / (1 + parseFloat(pkg.margin_percent || 0) / 100);

        // 1. Validate fixed items (cannot completely delete or leave empty)
        const pkgFixedItemIds = pkg.FixedItems.filter(fi => fi.Product && fi.Product.status === 'active').map(fi => fi.product_id);
        const inputFixedItems = fixed_items || [];

        for (const fiId of pkgFixedItemIds) {
            const found = inputFixedItems.find(i => parseInt(i.product_id) === fiId);
            if (!found || parseFloat(found.qty_gm) < 0) {
                await t.rollback();
                return res.status(400).json({
                    success: false,
                    message: "Fixed product quantity cannot be negative."
                });
            }
        }

        // Calculate combined total cost of fixed and seasonal items
        let total_cost = 0;

        for (const item of inputFixedItems) {
            const product = await Product.findByPk(item.product_id);
            if (!product) { await t.rollback(); return res.status(404).json({ success: false, message: `Product ${item.product_id} not found` }); }
            const pkgFi = pkg.FixedItems?.find(fi => fi.product_id === parseInt(item.product_id));
            const price = pkgFi?.purchase_price_per_gm != null ? parseFloat(pkgFi.purchase_price_per_gm) : parseFloat(product.purchase_price_per_gm || 0);
            total_cost += parseFloat(item.qty_gm) * price;
        }

        const inputSeasonalItems = items || [];
        for (const item of inputSeasonalItems) {
            const product = await Product.findByPk(item.product_id);
            if (!product) { await t.rollback(); return res.status(404).json({ success: false, message: `Product ${item.product_id} not found` }); }
            const pkgSp = pkg.SeasonalPool?.find(sp => sp.product_id === parseInt(item.product_id));
            const price = pkgSp?.purchase_price_per_gm != null ? parseFloat(pkgSp.purchase_price_per_gm) : parseFloat(product.purchase_price_per_gm || 0);
            total_cost += parseFloat(item.qty_gm) * price;
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
                .filter(item => parseFloat(item.qty_gm) >= 0)
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
                    include: [{ model: Product, attributes: ['id', 'name', 'unit', 'category', 'selling_price_per_gm', 'purchase_price_per_gm', 'hindi_name', 'min_retail_qty', 'is_qty_double'] }]
                },
                {
                    model: Package, include: [
                        { model: PackageSeasonalPool, as: 'SeasonalPool', include: [{ model: Product, attributes: ['id', 'name', 'unit', 'category', 'selling_price_per_gm', 'purchase_price_per_gm', 'hindi_name', 'status', 'min_retail_qty', 'is_qty_double'] }] },
                        { model: PackageSeasonalConfig, as: 'SeasonalConfig' },
                        { model: PackageFixedItem, as: 'FixedItems', include: [{ model: Product, attributes: ['id', 'name', 'unit', 'category', 'selling_price_per_gm', 'purchase_price_per_gm', 'hindi_name', 'status', 'min_retail_qty', 'is_qty_double'] }] }
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

        const pool = pkg.SeasonalPool.filter(sp => sp.Product && sp.Product.status === 'active').map(sp => {
            const spData = sp.toJSON ? sp.toJSON() : { ...sp };
            const effectivePrice = sp.purchase_price_per_gm != null
                ? parseFloat(sp.purchase_price_per_gm)
                : parseFloat(sp.Product?.purchase_price_per_gm || 0);
            if (spData.Product) {
                spData.Product.purchase_price_per_gm = effectivePrice;
            }
            spData.purchase_price_per_gm = effectivePrice;
            return spData;
        });
        const maxCount = pkg.SeasonalConfig?.max_select_count;
        // Formula consistent with package.controller.js: divide by (1 + margin/100)
        const per_service_amount = (parseFloat(pkg.price) / pkg.services_per_month) / (1 + parseFloat(pkg.margin_percent || 0) / 100);

        // Extract fixed items from subscription (if present) or fallback to package fixed items
        const subFixedItems = subscription.Items.filter(i => i.is_fixed && i.Product && i.Product.status === 'active');
        const fixed_items = subFixedItems.length > 0
            ? subFixedItems.map(i => {
                const pkgFi = pkg.FixedItems.find(pfi => pfi.product_id === i.product_id);
                return {
                    product_id: i.product_id,
                    qty_gm: i.qty_gm,
                    Product: i.Product,
                    purchase_price_per_gm: pkgFi?.purchase_price_per_gm != null ? pkgFi.purchase_price_per_gm : i.Product.purchase_price_per_gm
                };
            })
            : pkg.FixedItems.filter(fi => fi.Product && fi.Product.status === 'active').map(fi => ({
                product_id: fi.product_id,
                qty_gm: fi.default_qty_gm,
                Product: fi.Product,
                purchase_price_per_gm: fi.purchase_price_per_gm != null ? fi.purchase_price_per_gm : fi.Product.purchase_price_per_gm
            }));

        let fixed_cost = 0;
        for (const fi of fixed_items) {
            const price = fi.purchase_price_per_gm != null ? parseFloat(fi.purchase_price_per_gm) : parseFloat(fi.Product.purchase_price_per_gm || 0);
            fixed_cost += parseFloat(fi.qty_gm) * price;
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
                    include: [{ model: Product, attributes: ['id', 'name', 'unit', 'category', 'selling_price_per_gm', 'purchase_price_per_gm', 'hindi_name', 'min_retail_qty', 'is_qty_double'] }]
                },
                {
                    model: DeliveryItem,
                    as: 'DeliveryItems',
                    include: [{ model: Product, attributes: ['id', 'name', 'unit', 'category', 'selling_price_per_gm', 'purchase_price_per_gm', 'hindi_name', 'min_retail_qty', 'is_qty_double'] }]
                }
            ]
        });

        // Also fetch missed logs to know exactly how much was carried over
        const scheduleDates = schedules.map(s => s.scheduled_date);
        const missedLogs = await MissedProductLog.findAll({
            where: {
                user_id: req.user.id,
                next_schedule_date: { [Op.in]: scheduleDates }
            }
        });

        const returnedLogs = await ReturnedProductLog.findAll({
            where: {
                user_id: req.user.id,
                next_schedule_date: { [Op.in]: scheduleDates }
            }
        });

        const now = new Date();
        const formattedSchedules = schedules.map(s => {
            const scheduledDateStr = s.scheduled_date; // YYYY-MM-DD
            // Cutoff is 8:00 PM IST on the scheduled_date
            // const cutoffTime = new Date(`${scheduledDateStr}T20:00:00+05:30`);
            const cutoffTime = new Date(`${scheduledDateStr}T00:00:00`);
            cutoffTime.setDate(cutoffTime.getDate() - 1);
            cutoffTime.setHours(20, 0, 0, 0); // 8:00 PM the day before

            const isWindowOpen = now < cutoffTime;

            // Merge selections and delivery items (carry overs)
            let finalSelections = (s.SeasonalSelections || []).map(sel => sel.toJSON());

            // Add or update from MissedLogs (carry overs)
            const myLogs = missedLogs.filter(l => l.next_schedule_date === s.scheduled_date);
            myLogs.forEach(log => {
                const existing = finalSelections.find(sel => sel.product_id === log.product_id);
                if (existing) {
                    existing.carried_over_qty = (parseFloat(existing.carried_over_qty || 0) + parseFloat(log.missed_qty)).toFixed(2);
                    existing.qty_gm = (parseFloat(existing.qty_gm) + parseFloat(log.missed_qty)).toFixed(2);
                } else {
                    // Try to find the product info from DeliveryItems
                    const dItem = (s.DeliveryItems || []).find(di => di.product_id === log.product_id);
                    if (dItem) {
                        finalSelections.push({
                            id: 'carry_' + log.id,
                            schedule_id: s.id,
                            product_id: log.product_id,
                            qty_gm: log.missed_qty,
                            carried_over_qty: log.missed_qty,
                            Product: dItem.Product
                        });
                    }
                }
            });

            // Add or update from ReturnedLogs (carry overs)
            const myReturnedLogs = returnedLogs.filter(l => l.next_schedule_date === s.scheduled_date);
            myReturnedLogs.forEach(log => {
                const existing = finalSelections.find(sel => sel.product_id === log.product_id);
                if (existing) {
                    existing.returned_qty = (parseFloat(existing.returned_qty || 0) + parseFloat(log.returned_qty)).toFixed(2);
                    existing.qty_gm = (parseFloat(existing.qty_gm) + parseFloat(log.returned_qty)).toFixed(2);
                } else {
                    const dItem = (s.DeliveryItems || []).find(di => di.product_id === log.product_id);
                    if (dItem) {
                        finalSelections.push({
                            id: 'return_' + log.id,
                            schedule_id: s.id,
                            product_id: log.product_id,
                            qty_gm: log.returned_qty,
                            returned_qty: log.returned_qty,
                            Product: dItem.Product
                        });
                    }
                }
            });

            return {
                id: s.id,
                scheduled_date: s.scheduled_date,
                is_locked: s.is_locked,
                is_window_open: isWindowOpen,
                cutoff_time: cutoffTime,
                selections: finalSelections
            };
        });

        // Default seasonal selections from subscription
        const default_seasonal = subscription.Items.filter(i => i.is_seasonal).map(i => ({
            product_id: i.product_id,
            qty_gm: i.qty_gm,
            Product: i.Product
        }));

        const user = await User.findByPk(req.user.id);

        res.status(200).json({
            success: true,
            seasonal_pool: pool,
            max_select_count: maxCount,
            seasonal_budget,
            per_service_amount,
            fixed_cost_per_service: fixed_cost,
            fixed_items,
            default_seasonal,
            wallet_balance: parseFloat(user.wallet_balance || 0),
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
                    { model: PackageFixedItem, as: 'FixedItems', include: [{ model: Product }] },
                    { model: PackageSeasonalPool, as: 'SeasonalPool', include: [{ model: Product }] }
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
        // const cutoffTime = new Date(`${scheduledDateStr}T20:00:00+05:30`);
        const cutoffTime = new Date(`${scheduledDateStr}T00:00:00`);
        cutoffTime.setDate(cutoffTime.getDate() - 1);
        cutoffTime.setHours(20, 0, 0, 0); // 8:00 PM the day before


        const now = new Date();
        if (now >= cutoffTime) {
            await t.rollback();
            return res.status(400).json({ success: false, message: "Selection window closed for this delivery date (cutoff was 8 PM of the day before)" });
        }

        const pkg = subscription.Package;
        // Formula consistent with package.controller.js: divide by (1 + margin/100)
        const per_service_amount = (parseFloat(pkg.price) / pkg.services_per_month) / (1 + parseFloat(pkg.margin_percent || 0) / 100);


        // 1. Validate fixed items (cannot completely delete or leave empty)
        const pkgFixedItemIds = pkg.FixedItems.filter(fi => fi.Product && fi.Product.status === 'active').map(fi => fi.product_id);
        const inputFixedItems = fixed_items || [];

        for (const fiId of pkgFixedItemIds) {
            const found = inputFixedItems.find(i => parseInt(i.product_id) === fiId);
            if (!found || parseFloat(found.qty_gm) < 0) {
                await t.rollback();
                return res.status(400).json({
                    success: false,
                    message: "Fixed product quantity cannot be negative."
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
            const pkgFi = pkg.FixedItems?.find(fi => fi.product_id === parseInt(item.product_id));
            const price = pkgFi?.purchase_price_per_gm != null ? parseFloat(pkgFi.purchase_price_per_gm) : parseFloat(product.purchase_price_per_gm || 0);
            total_cost += parseFloat(item.qty_gm) * price;
        }

        const inputSeasonalItems = items || [];

        // Max item count check for seasonal items
        const maxCount = pkg.SeasonalConfig?.max_select_count;
        const activeSelectionsCount = inputSeasonalItems.filter(item => parseFloat(item.qty_gm) > 0).length;
        const removedFixedCount = inputFixedItems.filter(item => parseFloat(item.qty_gm) === 0).length;
        const effectiveMaxCount = maxCount ? maxCount + removedFixedCount : undefined;

        if (effectiveMaxCount && activeSelectionsCount > effectiveMaxCount) {
            await t.rollback();
            return res.status(400).json({ success: false, message: `You can select a maximum of ${effectiveMaxCount} seasonal items.` });
        }

        for (const item of inputSeasonalItems) {
            const product = await Product.findByPk(item.product_id);
            if (!product) {
                await t.rollback();
                return res.status(404).json({ success: false, message: `Product ${item.product_id} not found` });
            }
            const pkgSp = pkg.SeasonalPool?.find(sp => sp.product_id === parseInt(item.product_id));
            const price = pkgSp?.purchase_price_per_gm != null ? parseFloat(pkgSp.purchase_price_per_gm) : parseFloat(product.purchase_price_per_gm || 0);
            total_cost += parseFloat(item.qty_gm) * price;
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
        rows.push(...inputFixedItems
            .filter(i => parseFloat(i.qty_gm) > 0)
            .map(i => ({
                schedule_id,
                product_id: i.product_id,
                qty_gm: i.qty_gm,
                is_auto: false
            }))
        );

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

// POST /api/subscriptions/admin/assign
export const assignPackageByAdmin = async (req, res) => {
    const t = await sequelize.transaction();
    try {
        const { user_id, package_id, type, start_date, address_id } = req.body;

        if (!user_id || !package_id || !start_date || !address_id) {
            await t.rollback();
            return res.status(400).json({ success: false, message: "user_id, package_id, start_date, and address_id are required" });
        }

        const pkg = await Package.findByPk(package_id, {
            include: [{ model: PackageFixedItem, as: 'FixedItems', include: [{ model: Product }] }]
        });
        if (!pkg) {
            await t.rollback();
            return res.status(404).json({ success: false, message: "Package not found" });
        }

        const existingSubscription = await Subscription.findOne({
            where: { user_id, package_id, status: { [Op.in]: ['active', 'paused'] } }
        });
        if (existingSubscription) {
            await t.rollback();
            return res.status(409).json({ success: false, message: "User already has an active or paused subscription for this package." });
        }

        let amount = parseFloat(pkg.price);
        let yearly_amount_paid = null;
        let total_services = pkg.services_per_month;

        if (type === 'yearly') {
            const annual_total = parseFloat(pkg.price) * 12;
            amount = annual_total * 0.75; // 25% discount
            yearly_amount_paid = amount;
            total_services = pkg.services_per_month * 12;
        }

        const daysInCycle = type === 'yearly' ? 360 : 30;
        const end_date = new Date(start_date);
        end_date.setDate(end_date.getDate() + daysInCycle - 1);

        const subscription = await Subscription.create({
            user_id, package_id, type: type || 'monthly',
            status: 'active',
            yearly_amount_paid,
            total_services,
            address_id,
            start_date,
            end_date,
            renewal_count: 1,
            locked_price: amount
        }, { transaction: t });

        // Generate delivery schedule
        const deliveryDates = generateDeliveryDates(start_date, pkg.services_per_month, type === 'yearly' ? 12 : 1);
        const scheduleRows = deliveryDates.map(date => ({
            subscription_id: subscription.id,
            scheduled_date: date,
            status: 'pending'
        }));
        await DeliverySchedule.bulkCreate(scheduleRows, { transaction: t });

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

        await PaymentTransaction.create({
            user_id, amount,
            payment_method: 'admin_assigned',
            status: 'success',
            type: type === 'yearly' ? 'yearly_booking' : 'package_purchase'
        }, { transaction: t });

        await t.commit();
        res.status(201).json({ success: true, message: "Package assigned successfully", subscription });
    } catch (error) {
        await t.rollback();
        res.status(500).json({ success: false, message: error.message });
    }
};

// POST /api/subscriptions/admin/renew
export const renewPackageByAdmin = async (req, res) => {
    const t = await sequelize.transaction();
    try {
        const { user_id, package_id, type, start_date, address_id } = req.body;

        if (!user_id || !package_id || !start_date || !address_id) {
            await t.rollback();
            return res.status(400).json({ success: false, message: "user_id, package_id, start_date, and address_id are required" });
        }

        const oldSub = await Subscription.findOne({
            where: { user_id, package_id },
            order: [['created_at', 'DESC']],
            transaction: t
        });

        if (!oldSub) {
            await t.rollback();
            return res.status(404).json({ success: false, message: "No previous subscription found to renew." });
        }

        if (oldSub.status === 'active') {
            await oldSub.update({ status: 'completed' }, { transaction: t });
        }

        const pkg = await Package.findByPk(package_id, {
            include: [{ model: PackageFixedItem, as: 'FixedItems', include: [{ model: Product }] }]
        });

        let amount = parseFloat(pkg.price);
        let yearly_amount_paid = null;
        let total_services = pkg.services_per_month;
        const renewal_count = (oldSub.renewal_count || 1) + 1;
        let locked_price = parseFloat(oldSub.locked_price || pkg.price);

        if (renewal_count >= 3) {
            if (type === 'yearly') {
                amount = locked_price * 12 * 0.75;
            } else {
                amount = locked_price;
            }
        } else {
            if (type === 'yearly') {
                amount = parseFloat(pkg.price) * 12 * 0.75;
            } else {
                amount = parseFloat(pkg.price);
            }
        }

        if (type === 'yearly') {
            yearly_amount_paid = amount;
            total_services = pkg.services_per_month * 12;
        }

        const daysInCycle = type === 'yearly' ? 360 : 30;
        const end_date = new Date(start_date);
        end_date.setDate(end_date.getDate() + daysInCycle - 1);

        const subscription = await Subscription.create({
            user_id, package_id, type: type || 'monthly',
            status: 'active',
            yearly_amount_paid,
            total_services,
            address_id,
            start_date,
            end_date,
            renewal_count,
            locked_price: (renewal_count >= 3) ? locked_price : amount
        }, { transaction: t });

        const deliveryDates = generateDeliveryDates(start_date, pkg.services_per_month, type === 'yearly' ? 12 : 1);
        const scheduleRows = deliveryDates.map(date => ({
            subscription_id: subscription.id,
            scheduled_date: date,
            status: 'pending'
        }));
        await DeliverySchedule.bulkCreate(scheduleRows, { transaction: t });

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

        await PaymentTransaction.create({
            user_id, amount,
            payment_method: 'admin_renewed',
            status: 'success',
            type: type === 'yearly' ? 'yearly_booking' : 'package_purchase'
        }, { transaction: t });

        await t.commit();
        res.status(201).json({ success: true, message: "Package renewed successfully", subscription });
    } catch (error) {
        await t.rollback();
        res.status(500).json({ success: false, message: error.message });
    }
};

// PATCH /api/admin/subscriptions/:id/batch
export const updateSubscriptionBatch = async (req, res) => {
    try {
        const { id } = req.params;
        const { batch_id } = req.body;

        if (!batch_id) {
            return res.status(400).json({ success: false, message: "batch_id is required" });
        }

        const subscription = await Subscription.findByPk(id);
        if (!subscription) {
            return res.status(404).json({ success: false, message: "Subscription not found" });
        }

        await subscription.update({ batch_id });

        // Update all pending delivery schedules for this subscription
        await DeliverySchedule.update(
            { batch_id },
            { where: { subscription_id: id, status: 'pending' } }
        );

        res.status(200).json({ success: true, message: "Batch updated successfully", subscription });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
