import { Op } from "sequelize";
import {
    RetailOrder, DeliverySchedule, DeliveryItem, MissedProductLog,
    Product, Subscription, SubscriptionItem, WaterSubscription,
    ScheduleSeasonalSelection, RetailOrderItem, PurchaseLog
} from "../models/index.js";

// Helper to calculate pending purchases (matches /admin/demands and Log Purchase tab)
const calculatePendingDemands = async (dateStr) => {
    const schedules = await DeliverySchedule.findAll({
        where: { scheduled_date: dateStr, status: 'pending' },
        include: [
            {
                model: Subscription, required: false,
                include: [
                    { model: User, attributes: ['id', 'status'] },
                    { model: SubscriptionItem, as: 'Items' }
                ]
            },
            { model: ScheduleSeasonalSelection, as: 'SeasonalSelections', required: false },
            { model: DeliveryItem, as: 'DeliveryItems', required: false }
        ]
    });

    const retailOrders = await RetailOrder.findAll({
        where: { delivery_date: dateStr, delivery_status: 'pending' },
        include: [
            { model: User, attributes: ['id', 'status'] },
            { model: RetailOrderItem, as: 'Items' }
        ]
    });

    const demandMap = {};
    const addDemand = (pId, qty) => {
        if (!pId) return;
        const key = String(pId);
        if (!demandMap[key]) demandMap[key] = 0;
        demandMap[key] += qty;
    };

    // Calculate demands from delivery schedules
    for (const schedule of schedules) {
        if (schedule.Subscription && (!schedule.Subscription.User || schedule.Subscription.User.status !== 'active')) {
            continue;
        }
        const dbItems = schedule.DeliveryItems || [];
        if (dbItems.length > 0) {
            for (const item of dbItems) {
                if (schedule.is_returned_serving) {
                    if (item.will_purchase) {
                        addDemand(item.product_id, parseFloat(item.qty_gm || 0));
                    }
                } else {
                    addDemand(item.product_id, parseFloat(item.qty_gm || 0));
                }
            }
        } else if (schedule.Subscription) {
            const items = schedule.Subscription.Items || [];
            const fixedItems = items.filter(item => item.is_fixed && item.is_active);
            const selections = schedule.SeasonalSelections || [];

            if (selections.length > 0) {
                for (const sel of selections) {
                    addDemand(sel.product_id, parseFloat(sel.qty_gm || 0));
                }
                const selectionProductIds = selections.map(sel => sel.product_id);
                const missingFixed = fixedItems.filter(f => !selectionProductIds.includes(f.product_id));
                for (const item of missingFixed) {
                    addDemand(item.product_id, parseFloat(item.qty_gm || 0));
                }
            } else {
                for (const item of fixedItems) {
                    addDemand(item.product_id, parseFloat(item.qty_gm || 0));
                }
                const defaultSeasonal = items.filter(item => item.is_seasonal && item.is_active);
                for (const item of defaultSeasonal) {
                    addDemand(item.product_id, parseFloat(item.qty_gm || 0));
                }
            }
        }
    }

    for (const order of retailOrders) {
        if (!order.User || order.User.status !== 'active') continue;
        const items = order.Items || [];
        for (const item of items) {
            addDemand(item.product_id, parseFloat(item.quantity || 0));
        }
    }

    const productIds = Object.keys(demandMap);
    if (productIds.length === 0) return 0;

    // Check which products have already been logged in PurchaseLog today
    const startOfDay = new Date(dateStr);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(dateStr);
    endOfDay.setHours(23, 59, 59, 999);

    const todaysPurchases = await PurchaseLog.findAll({
        where: {
            purchase_date: {
                [Op.between]: [startOfDay, endOfDay]
            }
        },
        attributes: ['product_id']
    });

    const completedProductIds = new Set(todaysPurchases.map(p => String(p.product_id)));

    // Pending count = products with demand today that have NOT yet had purchase logged today
    const pendingCount = productIds.filter(pId => !completedProductIds.has(pId)).length;
    return pendingCount;
};

// GET /api/admin/dashboard-stats
export const getDashboardStats = async (req, res) => {
    try {
        const today = new Date().toISOString().split('T')[0];

        // 1. Orders Today (Retail + Schedules scheduled for today)
        const retailCount = await RetailOrder.count({ where: { delivery_date: today } });
        const scheduleCount = await DeliverySchedule.count({ where: { scheduled_date: today } });
        const ordersToday = retailCount + scheduleCount;

        // 2. Pending Returns
        const pendingReturns = await DeliveryItem.count({
            where: { return_status: 'requested' }
        });

        // 3. Missing Items Today (MissedProductLog)
        const missingItems = await MissedProductLog.count({
            where: { missed_date: today }
        });

        // 4. Pending Product Requests (Demands vs Stock)
        const pendingRequests = await calculatePendingDemands(today);

        // 5. Deliveries - Delivered
        const deliveredCount = await DeliverySchedule.count({
            where: { scheduled_date: today, status: 'delivered' }
        });

        // 6. Deliveries - Not Ready (pending or packing)
        const notReadyCount = await DeliverySchedule.count({
            where: { scheduled_date: today, status: { [Op.in]: ['pending', 'packing'] } }
        });

        // 7. Deliveries - Ready (Unassigned or assigned but ready)
        // User asked: "kitni deliver hai jo ready hai but kissi deliver wale ne accept nahi kiya hai"
        const readyUnacceptedCount = await DeliverySchedule.count({
            where: { scheduled_date: today, status: 'ready', delivery_boy_id: null }
        });

        res.status(200).json({
            success: true,
            stats: {
                ordersToday,
                pendingReturns,
                missingItems,
                pendingRequests,
                deliveredCount,
                notReadyCount,
                readyUnacceptedCount
            }
        });
    } catch (error) {
        console.error("Dashboard Stats Error:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};
