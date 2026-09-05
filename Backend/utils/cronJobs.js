import cron from "node-cron";
import { Op } from "sequelize";
import { sequelize } from "../confiq/db.js";
import {
    DeliverySchedule, Subscription, SubscriptionItem, Notification, User, Package,
    WalletTransaction, CreditLog, Product, DeliveryItem, WaterSubscription,
    ScheduleSeasonalSelection, PackageSeasonalConfig, PauseLog, PackageSeasonalPool,
    RetailOrder, RetailOrderItem, BatchSplit, ProductionBatch
} from "../models/index.js";

let ioInstance = null;


/**
 * Daily 8 PM cron job:
 * 1. Auto-fill delivery items from subscription items for tomorrow's unlocked schedules
 * 2. Lock all schedules for tomorrow
 * 3. Send reminder notifications to users
 * 4. Generate admin daily summary
 * 5. Check credit/loyalty logic
 */

const runNightlyJob = async () => {
    console.log("[CRON] Starting nightly 8 PM job...");
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];

    const t = await sequelize.transaction();
    try {
        // Step 0.5: RetailOrder Cleanup
        const pendingRetailOrders = await RetailOrder.findAll({
            where: { delivery_status: 'pending', delivery_date: tomorrowStr },
            include: [{ model: RetailOrderItem, as: 'RetailOrderItems', include: [{ model: Product }] }],
            transaction: t
        });

        for (const order of pendingRetailOrders) {
            let orderChanged = false;
            let totalAmount = 0;

            for (const item of order.RetailOrderItems) {
                if (item.Product && item.Product.status !== 'active') {
                    await item.destroy({ transaction: t });
                    orderChanged = true;
                } else {
                    totalAmount += parseFloat(item.total_price);
                }
            }

            if (orderChanged) {
                if (totalAmount === 0) {
                    await order.update({ delivery_status: 'cancelled', payment_status: 'failed' }, { transaction: t });
                } else {
                    await order.update({ total_amount: totalAmount + parseFloat(order.delivery_charge || 0) }, { transaction: t });
                }
            }
        }
        // Step 0: Process auto-restarts for expired pauses
        const todayStr = new Date().toISOString().split('T')[0];
        const expiredPauses = await PauseLog.findAll({
            where: {
                status: 'active',
                pause_end: { [Op.lte]: todayStr }
            },
            transaction: t
        });

        for (const p of expiredPauses) {
            await p.update({ status: 'completed' }, { transaction: t });

            // Standard Subscription Restart
            if (p.subscription_id) {
                const subscription = await Subscription.findByPk(p.subscription_id, {
                    include: [{ model: Package }],
                    transaction: t
                });

                if (subscription && subscription.status === 'paused') {
                    const remainingServices = subscription.total_services - subscription.services_completed;
                    const newDates = [];

                    if (remainingServices > 0) {
                        const gap_days = 30 / subscription.Package.services_per_month;
                        const startParts = tomorrowStr.split('-').map(Number);
                        const baseTime = Date.UTC(startParts[0], startParts[1] - 1, startParts[2]);

                        for (let i = 0; i < remainingServices; i++) {
                            const dateVal = new Date(baseTime + Math.round(i * gap_days) * 24 * 60 * 60 * 1000);
                            if (dateVal.getUTCDay() === 0) {
                                dateVal.setUTCDate(dateVal.getUTCDate() - 1);
                            }
                            newDates.push(dateVal.toISOString().split('T')[0]);
                        }
                    }

                    const scheduleRows = newDates.map(date => ({ subscription_id: subscription.id, scheduled_date: date, status: 'pending', batch_id: subscription.batch_id }));
                    await DeliverySchedule.bulkCreate(scheduleRows, { transaction: t });

                    const new_end_date = newDates.length > 0 ? newDates[newDates.length - 1] : subscription.end_date;
                    await subscription.update({ status: 'active', end_date: new_end_date }, { transaction: t });
                    console.log(`[CRON] Auto-restarted subscription ${subscription.id} for tomorrow`);
                }
            }

            // Water Subscription Restart
            if (p.water_subscription_id) {
                const sub = await WaterSubscription.findByPk(p.water_subscription_id, { transaction: t });
                if (sub && sub.status === 'paused') {
                    const remainingServices = sub.total_services - sub.services_completed;
                    const newDates = [];

                    if (remainingServices > 0) {
                        const gap_days = sub.frequency === 'daily' ? 1 : 2;
                        const startParts = tomorrowStr.split('-').map(Number);
                        const baseTime = Date.UTC(startParts[0], startParts[1] - 1, startParts[2]);

                        for (let i = 0; i < remainingServices; i++) {
                            const dateVal = new Date(baseTime + Math.round(i * gap_days) * 24 * 60 * 60 * 1000);
                            if (dateVal.getUTCDay() === 0) {
                                dateVal.setUTCDate(dateVal.getUTCDate() - 1);
                            }
                            newDates.push(dateVal.toISOString().split('T')[0]);
                        }
                    }

                    const scheduleRows = newDates.map(date => ({
                        water_subscription_id: sub.id,
                        scheduled_date: date,
                        status: 'pending',
                        batch_id: sub.batch_id
                    }));
                    await DeliverySchedule.bulkCreate(scheduleRows, { transaction: t });

                    const new_end_date = newDates.length > 0 ? newDates[newDates.length - 1] : sub.end_date;
                    await sub.update({ status: 'active', end_date: new_end_date }, { transaction: t });
                    console.log(`[CRON] Auto-restarted water subscription ${sub.id} for tomorrow`);
                }
            }
        }

        // Step 1: Find all pending, unlocked schedules for tomorrow
        const schedules = await DeliverySchedule.findAll({
            where: { scheduled_date: tomorrowStr, status: 'pending', is_locked: false },
            include: [
                {
                    model: Subscription,
                    include: [
                        { model: Package },
                        { model: User },
                        { model: SubscriptionItem, as: 'Items', include: [{ model: Product }] }
                    ]
                },
                {
                    model: WaterSubscription,
                    include: [{ model: User }]
                }
            ],
            transaction: t
        });

        for (const schedule of schedules) {
            if (schedule.Subscription) {
                const sub = schedule.Subscription;
                const services_per_month = sub.Package.services_per_month;
                if (sub.services_completed >= services_per_month * 3 && parseFloat(sub.User.due_amount) > 0) {
                    console.log(`[CRON] Blocking delivery for subscription ${sub.id} (user ${sub.user_id}) entering 4th month with unpaid dues.`);
                    await schedule.update({ status: 'skipped' }, { transaction: t });
                    await Notification.create({
                        user_id: sub.user_id,
                        title: 'Subscription Suspended',
                        message: `Your deliveries for ${sub.Package.name} have been suspended due to unpaid dues. Please clear your outstanding dues of ₹${sub.User.due_amount} to resume.`,
                        type: 'alert',
                        scheduled_at: new Date(),
                        sent_at: new Date()
                    }, { transaction: t });
                    continue;
                }

                const items = sub.Items.filter(i => i.is_active);

                // Step 0: Auto-fill seasonal selections if the package has SeasonalConfig
                const seasonalConfig = sub.Package.SeasonalConfig;
                if (seasonalConfig) {
                    const userSelectionsCount = await ScheduleSeasonalSelection.count({
                        where: { schedule_id: schedule.id },
                        transaction: t
                    });

                    if (userSelectionsCount === 0) {
                        // Retrieve what other users have selected for tomorrow's deliveries
                        const allTomorrowSchedules = await DeliverySchedule.findAll({
                            where: { scheduled_date: tomorrowStr },
                            attributes: ['id'],
                            transaction: t
                        });
                        const tomorrowScheduleIds = allTomorrowSchedules.map(s => s.id);

                        const globalSelections = await ScheduleSeasonalSelection.findAll({
                            where: { schedule_id: { [Op.in]: tomorrowScheduleIds } },
                            attributes: ['product_id', 'qty_gm'],
                            transaction: t
                        });

                        // Calculate total weight (demand) globally
                        const demandMap = {};
                        globalSelections.forEach(sel => {
                            demandMap[sel.product_id] = (demandMap[sel.product_id] || 0) + parseFloat(sel.qty_gm || 0);
                        });

                        // Get allowed seasonal products for this specific package
                        const allowedPool = await PackageSeasonalPool.findAll({
                            where: { package_id: sub.package_id },
                            attributes: ['product_id'],
                            transaction: t
                        });
                        const allowedProductIds = allowedPool.map(p => p.product_id);

                        const dislikedProducts = sub.User?.disliked_products || [];
                        const fixedItemsForFilter = sub.Items ? sub.Items.filter(i => i.is_fixed).map(i => i.product_id) : [];
                        const sortedProducts = Object.keys(demandMap)
                            .map(id => parseInt(id))
                            .filter(id => allowedProductIds.includes(id) && !dislikedProducts.includes(id) && !fixedItemsForFilter.includes(id))
                            .map(id => ({
                                product_id: id,
                                demand: demandMap[id]
                            })).sort((a, b) => b.demand - a.demand);

                        const maxSelectCount = seasonalConfig.max_select_count || 3;
                        const topProducts = sortedProducts.slice(0, maxSelectCount);

                        // Calculate budget with margin deduction (same as manual selection)
                        const pkg = sub.Package;
                        const per_service_amount = (parseFloat(pkg.price) / pkg.services_per_month) * (1 - parseFloat(pkg.margin_percent || 0) / 200);

                        // Subscription fixed items
                        const fixedItems = sub.Items.filter(i => i.is_fixed);
                        let fixedCost = 0;
                        for (const fi of fixedItems) {
                            fixedCost += parseFloat(fi.qty_gm) * parseFloat(fi.Product.purchase_price_per_gm || fi.Product.selling_price_per_gm);
                        }
                        const seasonalBudget = per_service_amount - fixedCost;

                        if (topProducts.length > 0 && seasonalBudget > 0) {
                            // Distribute budget equally among topProducts
                            const budgetPerProduct = seasonalBudget / topProducts.length;
                            const rows = [];
                            for (const tp of topProducts) {
                                const prod = await Product.findByPk(tp.product_id, { transaction: t });
                                if (prod && parseFloat(prod.purchase_price_per_gm || prod.selling_price_per_gm) > 0) {
                                    const qty = budgetPerProduct / parseFloat(prod.purchase_price_per_gm || prod.selling_price_per_gm);
                                    rows.push({
                                        schedule_id: schedule.id,
                                        product_id: tp.product_id,
                                        qty_gm: parseFloat(qty.toFixed(2)),
                                        is_auto: true
                                    });
                                }
                            }
                            if (rows.length > 0) {
                                await ScheduleSeasonalSelection.bulkCreate(rows, { transaction: t });
                            }
                        } else {
                            // Fall back to Package Seasonal Pool
                            const pool = await PackageSeasonalPool.findAll({
                                where: { package_id: sub.package_id },
                                include: [{ model: Product }],
                                transaction: t
                            });

                            if (pool.length > 0 && seasonalBudget > 0) {
                                const maxSelectCount = seasonalConfig.max_select_count || 3;
                                const dislikedProducts = sub.User?.disliked_products || [];
                                const filteredPool = pool.filter(item => !dislikedProducts.includes(item.product_id));
                                const selectedPoolItems = filteredPool.slice(0, maxSelectCount);
                                const budgetPerProduct = seasonalBudget / (selectedPoolItems.length || 1);
                                const rows = [];

                                for (const item of selectedPoolItems) {
                                    if (item.Product && parseFloat(item.Product.purchase_price_per_gm || item.Product.selling_price_per_gm) > 0) {
                                        const qty = budgetPerProduct / parseFloat(item.Product.purchase_price_per_gm || item.Product.selling_price_per_gm);
                                        rows.push({
                                            schedule_id: schedule.id,
                                            product_id: item.product_id,
                                            qty_gm: parseFloat(qty.toFixed(2)),
                                            is_auto: true
                                        });
                                    }
                                }

                                if (rows.length > 0) {
                                    await ScheduleSeasonalSelection.bulkCreate(rows, { transaction: t });
                                }
                            } else {
                                // Final fallback: default subscription seasonal items
                                const defaultSeasonal = sub.Items.filter(i => i.is_seasonal);
                                if (defaultSeasonal.length > 0) {
                                    const rows = defaultSeasonal.map(i => ({
                                        schedule_id: schedule.id,
                                        product_id: i.product_id,
                                        qty_gm: i.qty_gm,
                                        is_auto: true
                                    }));
                                    await ScheduleSeasonalSelection.bulkCreate(rows, { transaction: t });
                                }
                            }
                        }
                    }
                }

                // Step 1: Auto-fill delivery items (if none exist for this schedule)
                const existingItems = await DeliveryItem.count({ where: { schedule_id: schedule.id }, transaction: t });
                if (existingItems === 0) {
                    let rawItems = [];

                    // 1. Gather Fixed items from subscription
                    const fixedItems = sub.Items.filter(i => i.is_fixed);
                    rawItems.push(...fixedItems.map(item => ({
                        product_id: item.product_id,
                        qty_gm: item.qty_gm,
                        is_seasonal: false
                    })));

                    // 2. Gather Seasonal items
                    if (sub.Package.SeasonalConfig) {
                        let selections = await ScheduleSeasonalSelection.findAll({
                            where: { schedule_id: schedule.id },
                            transaction: t
                        });

                        if (selections.length > 0) {
                            rawItems.push(...selections.map(sel => ({
                                product_id: sel.product_id,
                                qty_gm: sel.qty_gm,
                                is_seasonal: true,
                                selection_model: sel
                            })));
                        } else {
                            const defaultSeasonal = sub.Items.filter(i => i.is_seasonal);
                            rawItems.push(...defaultSeasonal.map(item => ({
                                product_id: item.product_id,
                                qty_gm: item.qty_gm,
                                is_seasonal: true
                            })));
                        }
                    } else {
                        const seasonalItems = sub.Items.filter(i => i.is_seasonal);
                        rawItems.push(...seasonalItems.map(item => ({
                            product_id: item.product_id,
                            qty_gm: item.qty_gm,
                            is_seasonal: true
                        })));
                    }

                    // 3. Unified disabled product redistribution
                    const activeItems = [];
                    const disabledItems = [];

                    for (const item of rawItems) {
                        const product = await Product.findByPk(item.product_id, { transaction: t });
                        if (product && product.status === 'active') {
                            activeItems.push({ ...item, product });
                        } else {
                            disabledItems.push({ ...item, product });
                            if (item.selection_model) {
                                await item.selection_model.destroy({ transaction: t });
                            }
                        }
                    }

                    if (disabledItems.length > 0 && activeItems.length > 0) {
                        let redistributedBudget = 0;
                        for (const ds of disabledItems) {
                            const prod = ds.product;
                            if (prod) {
                                redistributedBudget += parseFloat(ds.qty_gm) * parseFloat(prod.purchase_price_per_gm || prod.selling_price_per_gm || 0);
                            }
                        }

                        const budgetPerActive = redistributedBudget / activeItems.length;
                        for (const as of activeItems) {
                            const prod = as.product;
                            const extraQty = budgetPerActive / parseFloat(prod.purchase_price_per_gm || prod.selling_price_per_gm || 1);
                            as.qty_gm = parseFloat(as.qty_gm) + parseFloat(extraQty.toFixed(2));

                            if (as.selection_model) {
                                as.selection_model.qty_gm = as.qty_gm;
                                await as.selection_model.save({ transaction: t });
                            }
                        }
                    }

                    let deliveryItems = activeItems.map(item => ({
                        schedule_id: schedule.id,
                        product_id: item.product_id,
                        qty_gm: item.qty_gm
                    }));

                    if (deliveryItems.length > 0) {
                        await DeliveryItem.bulkCreate(deliveryItems, { transaction: t });
                    }
                }

                // Load created delivery items to generate exact summary for notification
                const createdDeliveryItems = await DeliveryItem.findAll({
                    where: { schedule_id: schedule.id },
                    include: [{ model: Product }],
                    transaction: t
                });
                const itemSummary = createdDeliveryItems.map(i => `${i.Product?.name}: ${i.qty_gm}${i.Product?.unit}`).join(', ');

                // Create reminder notification
                await Notification.create({
                    user_id: sub.user_id,
                    title: 'Delivery Tomorrow!',
                    message: `Your ${sub.Package.name} delivery is scheduled for tomorrow (${tomorrowStr}). Items: ${itemSummary}. No changes possible after 8 PM tonight.`,
                    type: 'reminder',
                    scheduled_at: new Date(),
                    sent_at: new Date()
                }, { transaction: t });
            } else if (schedule.WaterSubscription) {
                const sub = schedule.WaterSubscription;
                const services_per_month = sub.frequency === 'daily' ? 30 : 15;
                if (sub.services_completed >= services_per_month * 3 && parseFloat(sub.User.due_amount) > 0) {
                    console.log(`[CRON] Blocking water delivery for subscription ${sub.id} (user ${sub.user_id}) entering 4th month with unpaid dues.`);
                    await schedule.update({ status: 'skipped' }, { transaction: t });
                    await Notification.create({
                        user_id: sub.user_id,
                        title: 'Water Subscription Suspended',
                        message: `Your water deliveries have been suspended due to unpaid dues. Please clear your outstanding dues of ₹${sub.User.due_amount} to resume.`,
                        type: 'alert',
                        scheduled_at: new Date(),
                        sent_at: new Date()
                    }, { transaction: t });
                    continue;
                }

                // Find matched water product from active catalog
                const products = await Product.findAll({ where: { category: 'water', status: 'active' }, transaction: t });
                const matchedProduct = products.find(p => {
                    const nameLower = p.name.toLowerCase();
                    return nameLower.includes(sub.water_type.toLowerCase()) && nameLower.includes(sub.container.toLowerCase());
                });

                if (matchedProduct) {
                    const existingItems = await DeliveryItem.count({ where: { schedule_id: schedule.id }, transaction: t });
                    if (existingItems === 0) {
                        const qty = matchedProduct.unit === 'ml' ? 2000 : 1; // 2 Liters if ml, or 1 piece bottle
                        await DeliveryItem.create({
                            schedule_id: schedule.id,
                            product_id: matchedProduct.id,
                            qty_gm: qty
                        }, { transaction: t });
                    }

                    // Create reminder notification
                    await Notification.create({
                        user_id: sub.user_id,
                        title: 'Water Delivery Tomorrow!',
                        message: `Your Alkaline Water (${sub.water_type} - ${sub.container}) delivery is scheduled for tomorrow (${tomorrowStr}).`,
                        type: 'reminder',
                        scheduled_at: new Date(),
                        sent_at: new Date()
                    }, { transaction: t });
                }
            }
        }

        // Step 2: Lock all tomorrow's schedules
        await DeliverySchedule.update(
            { is_locked: true },
            { where: { scheduled_date: tomorrowStr, status: 'pending' }, transaction: t }
        );

        console.log(`[CRON] Locked ${schedules.length} schedules for ${tomorrowStr}`);

        // Step 3: Recharge reminders for users with low wallets (standard subscriptions)
        const activeSubscriptions = await Subscription.findAll({
            where: { status: 'active' },
            include: [{ model: Package }, { model: User }],
            transaction: t
        });

        for (const sub of activeSubscriptions) {
            const perService = parseFloat(sub.Package.price) / sub.Package.services_per_month;
            if (parseFloat(sub.User.wallet_balance) < perService * 2) {
                await Notification.create({
                    user_id: sub.user_id,
                    title: 'Low Wallet Balance',
                    message: `Your wallet balance (₹${sub.User.wallet_balance}) is low. Please recharge to ensure uninterrupted deliveries.`,
                    type: 'recharge',
                    scheduled_at: new Date(),
                    sent_at: new Date()
                }, { transaction: t });
            }
        }

        // Recharge reminders for users with low wallets (water subscriptions)
        const activeWaterSubscriptions = await WaterSubscription.findAll({
            where: { status: 'active' },
            include: [{ model: User }],
            transaction: t
        });

        for (const sub of activeWaterSubscriptions) {
            const perService = parseFloat(sub.price_per_bottle);
            if (parseFloat(sub.User.wallet_balance) < perService * 2) {
                await Notification.create({
                    user_id: sub.user_id,
                    title: 'Low Wallet Balance (Water)',
                    message: `Your wallet balance (₹${sub.User.wallet_balance}) is low. Please recharge to ensure uninterrupted Alkaline Water deliveries.`,
                    type: 'recharge',
                    scheduled_at: new Date(),
                    sent_at: new Date()
                }, { transaction: t });
            }
        }

        // Step 4: Credit/Loyalty check — after 2 consecutive paid months
        for (const sub of activeSubscriptions) {
            if (sub.services_completed >= sub.Package.services_per_month * 2) {
                const perService = parseFloat(sub.Package.price) / sub.Package.services_per_month;
                if (parseFloat(sub.User.wallet_balance) < perService) {
                    const currentMonth = new Date().toISOString().slice(0, 7);
                    const existingLog = await CreditLog.findOne({
                        where: { user_id: sub.user_id, month: currentMonth },
                        transaction: t
                    });
                    if (!existingLog) {
                        await CreditLog.create({
                            user_id: sub.user_id,
                            month: currentMonth,
                            due_amount: perService,
                            status: 'pending',
                            admin_override: false
                        }, { transaction: t });
                        console.log(`[CRON] Credit log created for user ${sub.user_id}`);
                    }
                }
            }
        }

        // Credit/Loyalty check for Water subscriptions
        for (const sub of activeWaterSubscriptions) {
            const services_per_month = sub.frequency === 'daily' ? 30 : 15;
            if (sub.services_completed >= services_per_month * 2) {
                const perService = parseFloat(sub.price_per_bottle);
                if (parseFloat(sub.User.wallet_balance) < perService) {
                    const currentMonth = new Date().toISOString().slice(0, 7);
                    const existingLog = await CreditLog.findOne({
                        where: { user_id: sub.user_id, month: currentMonth },
                        transaction: t
                    });
                    if (!existingLog) {
                        await CreditLog.create({
                            user_id: sub.user_id,
                            month: currentMonth,
                            due_amount: perService,
                            status: 'pending',
                            admin_override: false
                        }, { transaction: t });
                        console.log(`[CRON] Water Credit log created for user ${sub.user_id}`);
                    }
                }
            }
        }

        await t.commit();
        console.log("[CRON] Nightly job completed successfully.");
    } catch (error) {
        await t.rollback();
        console.error("[CRON] Nightly job failed:", error.message);
    }
};

// 2-Hourly Notification Job
const notifyDisabledProductsJob = async () => {
    console.log("[CRON] Starting 2-hourly disabled products check...");
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];

    try {
        const affectedUsers = new Set();

        // Check Retail Orders
        const retailOrders = await RetailOrder.findAll({
            where: { delivery_status: 'pending', delivery_date: tomorrowStr },
            include: [{ model: RetailOrderItem, as: 'RetailOrderItems', include: [{ model: Product }] }]
        });

        for (const order of retailOrders) {
            const hasDisabled = order.RetailOrderItems.some(item => item.Product && item.Product.status !== 'active');
            if (hasDisabled) affectedUsers.add(order.user_id);
        }

        // Check Package Selections
        const schedules = await DeliverySchedule.findAll({
            where: { scheduled_date: tomorrowStr, status: 'pending' },
            include: [
                { model: Subscription, as: 'Subscription' }
            ]
        });

        const scheduleIds = schedules.map(s => s.id);
        const selections = await ScheduleSeasonalSelection.findAll({
            where: { schedule_id: { [Op.in]: scheduleIds } },
            include: [{ model: Product }]
        });

        for (const sel of selections) {
            if (sel.Product && sel.Product.status !== 'active') {
                const schedule = schedules.find(s => s.id === sel.schedule_id);
                if (schedule && schedule.Subscription) {
                    affectedUsers.add(schedule.Subscription.user_id);
                }
            }
        }

        // Send notifications
        for (const userId of affectedUsers) {
            await Notification.create({
                user_id: userId,
                title: 'Action Required: Product Unavailable',
                message: 'One or more products in your upcoming order or package selection have been disabled. Please update your selection before 8 PM tonight.',
                type: 'alert',
                scheduled_at: new Date(),
                sent_at: new Date()
            });
        }
        if (affectedUsers.size > 0) {
            console.log(`[CRON] Sent disabled product notifications to ${affectedUsers.size} users.`);
        }
    } catch (error) {
        console.error("[CRON] Disabled products check failed:", error.message);
    }
};

const checkUnattendedStages = async () => {
    try {
        const now = new Date();
        const splits = await BatchSplit.findAll({
            where: { status: 'in_progress' },
            include: [{ model: ProductionBatch, as: 'batch', include: [{ model: Product, as: 'product' }] }]
        });

        for (const split of splits) {
            if (!split.batch || !split.batch.product) continue;
            const product = split.batch.product;
            const startedAt = new Date(split.stage_started_at || new Date());

            let expectedTimeMin = 0;

            if (split.stage === 'soaking') {
                expectedTimeMin = parseFloat(product.soak_time_min || 0);
            } else if (split.stage === 'drying') {
                const dryCycleTime = parseFloat(product.dry_cycle_time_min || 0);
                const dryCapacityKg = parseFloat(product.dry_capacity_kg_per_load || 1);
                const dryMachineCount = parseInt(product.dry_machine_count || 1);
                const loadsNeeded = Math.ceil(parseFloat(split.qty_kg) / dryCapacityKg);
                expectedTimeMin = (dryMachineCount > 1) ? Math.ceil(loadsNeeded / dryMachineCount) * dryCycleTime : loadsNeeded * dryCycleTime;
            } else if (split.stage === 'weighing_start' || split.stage === 'weighing_end') {
                expectedTimeMin = parseFloat(product.weigh_time_min || 0);
            } else if (split.stage === 'cleaning_cutting') {
                // Approximate time
                if (split.remaining_work_minutes !== null && split.active_worker_count > 0) {
                    expectedTimeMin = parseFloat(split.remaining_work_minutes) / split.active_worker_count;
                } else {
                    expectedTimeMin = parseFloat(split.remaining_work_minutes || 0);
                }
            } else {
                continue;
            }

            const expectedEndTime = new Date(startedAt.getTime() + expectedTimeMin * 60000);

            if (expectedEndTime <= now) {
                // Find all workers who are/were assigned to this split
                const assignments = await sequelize.models.SplitWorkerAssignment.findAll({
                    where: { split_id: split.id },
                    attributes: ['worker_id']
                });
                const workerIds = assignments.map(a => a.worker_id);

                // If it's soaking or drying, we emit an alarm and set status to 'waiting' so they can acknowledge it
                if (split.stage === 'soaking' || split.stage === 'drying') {
                    if (split.status === 'in_progress') {
                        split.status = 'waiting';
                        await split.save();
                        if (ioInstance) {
                            ioInstance.emit('production:alarm', { split_id: split.id, stage: split.stage, worker_ids: workerIds, message: `${split.stage} complete for Batch ${split.batch_id}!` });
                        }
                    }
                } else {
                    // For manual tasks, just emit the alarm (don't change status)
                    if (ioInstance) {
                        ioInstance.emit('production:alarm', { split_id: split.id, stage: split.stage, worker_ids: workerIds, message: `Target time for ${split.stage} (Batch ${split.batch_id}) has exceeded!` });
                    }
                }
            }
        }
    } catch (error) {
        console.error('[CRON] checkUnattendedStages failed:', error);
    }
};

const checkBatchProductTaskAlarms = async () => {
    try {
        const now = new Date();
        const activeTasks = await sequelize.models.BatchProductTask.findAll({
            where: { status: 'RUNNING' },
            raw: true // Get plain objects to access the raw DB string value
        });

        for (const task of activeTasks) {
            // Guard: tasks with 0 duration should not trigger alarm via cron
            if (!task.remaining_seconds || task.remaining_seconds <= 0) continue;
            if (!task.started_at) continue;

            // Force UTC parse: if started_at string lacks timezone info, append Z to treat as UTC
            let startedAtStr = task.started_at;
            if (typeof startedAtStr === 'string' && !startedAtStr.includes('+') && !startedAtStr.endsWith('Z')) {
                startedAtStr = startedAtStr.replace(' ', 'T') + 'Z';
            }
            const startedAt = new Date(startedAtStr);
            let elapsed = Math.floor((now.getTime() - startedAt.getTime()) / 1000);

            // Timezone Drift Fix: If DB timezone and Sequelize timezone mismatch by exactly 5.5 hours (IST),
            // elapsed will be off by ~19800 seconds. We correct this automatically.
            if (elapsed > 18000) {
                elapsed -= 19800; // Subtract 5.5 hours
            } else if (elapsed < -18000) {
                elapsed += 19800; // Add 5.5 hours
            }

            console.log(`[CRON ALARM] Task ${task.id} (${task.stage}): started_at raw=${task.started_at}, parsed=${startedAt.toISOString()}, now=${now.toISOString()}, elapsed=${elapsed}s, remaining_seconds=${task.remaining_seconds}`);

            // If somehow elapsed is still negative (e.g. minor clock drift), treat as 0
            const safeElapsed = elapsed > 0 ? elapsed : 0;
            const remaining = task.remaining_seconds - safeElapsed;

            if (remaining <= 0) {
                await sequelize.models.BatchProductTask.update(
                    { status: 'ALARM', remaining_seconds: 0, alarm_fired_at: now },
                    { where: { id: task.id, status: 'RUNNING' } } // Only update if still RUNNING (prevent double-fire)
                );
                console.log(`[CRON ALARM] Task ${task.id} marked as ALARM`);

                if (ioInstance) {
                    ioInstance.emit('worker:alarm', { task_id: task.id, stage: task.stage, batch_id: task.batch_id });
                }
            }
        }
    } catch (error) {
        console.error('[CRON] checkBatchProductTaskAlarms failed:', error);
    }
};

// Schedule daily at 8 PM
export const startCronJobs = (io) => {
    ioInstance = io;
    setInterval(checkUnattendedStages, 30000); // run every 30s
    console.log("[CRON] Scheduled Unattended Stages Check every 30s");

    setInterval(checkBatchProductTaskAlarms, 5000); // run every 5s
    console.log("[CRON] Scheduled BatchProductTask Alarms Check every 5s");

    cron.schedule("0 20 * * *", runNightlyJob, {
        scheduled: true,
        timezone: "Asia/Kolkata"
    });
    console.log("[CRON] Scheduled nightly job at 8 PM IST");

    cron.schedule("0 */2 * * *", notifyDisabledProductsJob, {
        scheduled: true,
        timezone: "Asia/Kolkata"
    });
    console.log("[CRON] Scheduled 2-hourly disabled product check");
};

// Export for manual trigger (testing)
export { runNightlyJob, notifyDisabledProductsJob, checkUnattendedStages };
