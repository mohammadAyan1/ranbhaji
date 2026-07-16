import { Op } from "sequelize";
import {
    RetailOrder, DeliverySchedule, DeliveryItem, MissedProductLog,
    Product, Subscription, SubscriptionItem, WaterSubscription,
    ScheduleSeasonalSelection, RetailOrderItem
} from "../models/index.js";

// Helper to calculate demands (simplified from delivery.controller)
const calculatePendingDemands = async (dateStr) => {
    const schedules = await DeliverySchedule.findAll({
        where: { scheduled_date: dateStr, status: 'pending' },
        include: [
            {
                model: Subscription, required: false,
                include: [{ model: SubscriptionItem, as: 'Items' }]
            },
            { model: ScheduleSeasonalSelection, as: 'SeasonalSelections', required: false }
        ]
    });

    const retailOrders = await RetailOrder.findAll({
        where: { delivery_date: dateStr, delivery_status: 'pending' },
        include: [{ model: RetailOrderItem, as: 'Items' }]
    });

    const demandMap = {};
    const addDemand = (pId, qty) => {
        if (!demandMap[pId]) demandMap[pId] = 0;
        demandMap[pId] += qty;
    };

    // Calculate demands
    for (const schedule of schedules) {
        if (schedule.Subscription) {
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
            }
        }
    }

    for (const order of retailOrders) {
        const items = order.Items || [];
        for (const item of items) {
            addDemand(item.product_id, parseFloat(item.quantity || 0));
        }
    }

    // Now check against current stock to see if it's pending
    const productIds = Object.keys(demandMap);
    if (productIds.length === 0) return 0;

    const products = await Product.findAll({
        where: { id: productIds },
        attributes: ['id', 'current_stock']
    });

    let pendingCount = 0;
    products.forEach(p => {
        const demand = demandMap[p.id];
        const stock = parseFloat(p.current_stock || 0);
        if (demand > stock) {
            pendingCount++;
        }
    });

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
