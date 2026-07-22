import cron from "node-cron";
import { Op } from "sequelize";
import { sequelize } from "../confiq/db.js";
import {
    DeliverySchedule, Subscription, SubscriptionItem, Notification, User, Package,
    WalletTransaction, CreditLog, Product, DeliveryItem, WaterSubscription,
    ScheduleSeasonalSelection, PackageSeasonalConfig, PauseLog, PackageSeasonalPool
} from "../models/index.js";

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

                    const scheduleRows = newDates.map(date => ({ subscription_id: subscription.id, scheduled_date: date, status: 'pending' }));
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
                        status: 'pending'
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
                            attributes: ['product_id'],
                            transaction: t
                        });

                        // Count frequencies globally
                        const frequencyMap = {};
                        globalSelections.forEach(sel => {
                            frequencyMap[sel.product_id] = (frequencyMap[sel.product_id] || 0) + 1;
                        });

                        // Get allowed seasonal products for this specific package
                        const allowedPool = await PackageSeasonalPool.findAll({
                            where: { package_id: sub.package_id },
                            attributes: ['product_id'],
                            transaction: t
                        });
                        const allowedProductIds = allowedPool.map(p => p.product_id);

                        // Filter popular products to only those allowed in this package
                        const sortedProducts = Object.keys(frequencyMap)
                            .map(id => parseInt(id))
                            .filter(id => allowedProductIds.includes(id))
                            .map(id => ({
                                product_id: id,
                                frequency: frequencyMap[id]
                            })).sort((a, b) => b.frequency - a.frequency);

                        const maxSelectCount = seasonalConfig.max_select_count || 3;
                        const topProducts = sortedProducts.slice(0, maxSelectCount);

                        // Calculate budget
                        const per_service_amount = parseFloat(sub.Package.price) / sub.Package.services_per_month;

                        // Subscription fixed items
                        const fixedItems = sub.Items.filter(i => i.is_fixed);
                        let fixedCost = 0;
                        for (const fi of fixedItems) {
                            fixedCost += parseFloat(fi.qty_gm) * parseFloat(fi.Product.selling_price_per_gm);
                        }
                        const seasonalBudget = per_service_amount - fixedCost;

                        if (topProducts.length > 0 && seasonalBudget > 0) {
                            // Distribute budget equally among topProducts
                            const budgetPerProduct = seasonalBudget / topProducts.length;
                            const rows = [];
                            for (const tp of topProducts) {
                                const prod = await Product.findByPk(tp.product_id, { transaction: t });
                                if (prod && parseFloat(prod.selling_price_per_gm) > 0) {
                                    const qty = budgetPerProduct / parseFloat(prod.selling_price_per_gm);
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
                                const selectedPoolItems = pool.slice(0, maxSelectCount);
                                const budgetPerProduct = seasonalBudget / selectedPoolItems.length;
                                const rows = [];

                                for (const item of selectedPoolItems) {
                                    if (item.Product && parseFloat(item.Product.selling_price_per_gm) > 0) {
                                        const qty = budgetPerProduct / parseFloat(item.Product.selling_price_per_gm);
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
                    let deliveryItems = [];

                    // Fixed items from subscription
                    const fixedItems = sub.Items.filter(i => i.is_fixed);
                    deliveryItems.push(...fixedItems.map(item => ({
                        schedule_id: schedule.id,
                        product_id: item.product_id,
                        qty_gm: item.qty_gm
                    })));

                    // Seasonal items
                    if (sub.Package.SeasonalConfig) {
                        const selections = await ScheduleSeasonalSelection.findAll({
                            where: { schedule_id: schedule.id },
                            transaction: t
                        });

                        if (selections.length > 0) {
                            deliveryItems.push(...selections.map(sel => ({
                                schedule_id: schedule.id,
                                product_id: sel.product_id,
                                qty_gm: sel.qty_gm
                            })));
                        } else {
                            // Fallback to subscription default seasonal items
                            const defaultSeasonal = sub.Items.filter(i => i.is_seasonal);
                            deliveryItems.push(...defaultSeasonal.map(item => ({
                                schedule_id: schedule.id,
                                product_id: item.product_id,
                                qty_gm: item.qty_gm
                            })));
                        }
                    } else {
                        // For packages without seasonal configuration, use all active subscription items
                        const seasonalItems = sub.Items.filter(i => i.is_seasonal);
                        deliveryItems.push(...seasonalItems.map(item => ({
                            schedule_id: schedule.id,
                            product_id: item.product_id,
                            qty_gm: item.qty_gm
                        })));
                    }

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

// Schedule daily at 8 PM
export const startCronJobs = () => {
    cron.schedule("0 20 * * *", runNightlyJob, {
        scheduled: true,
        timezone: "Asia/Kolkata"
    });
    console.log("[CRON] Scheduled nightly job at 8 PM IST");
};

// Export for manual trigger (testing)
export { runNightlyJob };
