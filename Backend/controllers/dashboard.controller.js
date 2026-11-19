import { Op } from "sequelize";
import {
    RetailOrder, DeliverySchedule, DeliveryItem, MissedProductLog,
    Product, Subscription, SubscriptionItem, WaterSubscription,
    ScheduleSeasonalSelection, RetailOrderItem, PurchaseLog, User
} from "../models/index.js";

// Helper to calculate pending purchases (matches /admin/demands and Log Purchase tab)
const calculatePendingDemands = async (dateStr) => {
    const schedules = await DeliverySchedule.findAll({
        where: { scheduled_date: dateStr, status: { [Op.ne]: 'skipped' } },
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
        where: { delivery_date: dateStr, delivery_status: { [Op.ne]: 'cancelled' } },
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
            const dbProductIds = new Set();
            for (const item of dbItems) {
                dbProductIds.add(item.product_id);
                if (schedule.is_returned_serving) {
                    if (item.will_purchase) {
                        addDemand(item.product_id, parseFloat(item.qty_gm || 0));
                    }
                } else {
                    addDemand(item.product_id, parseFloat(item.qty_gm || 0));
                }
            }
            const selections = schedule.SeasonalSelections || [];
            for (const sel of selections) {
                if (!dbProductIds.has(sel.product_id)) {
                    addDemand(sel.product_id, parseFloat(sel.qty_gm || 0));
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

        // Fetch today's schedules and retail orders with User status to exclude deactivated users
        const todaySchedules = await DeliverySchedule.findAll({
            where: { scheduled_date: today },
            attributes: ['id', 'status', 'delivery_boy_id'],
            include: [
                {
                    model: Subscription,
                    attributes: ['id'],
                    include: [{ model: User, attributes: ['id', 'status'] }]
                },
                {
                    model: WaterSubscription,
                    attributes: ['id'],
                    include: [{ model: User, attributes: ['id', 'status'] }]
                }
            ]
        });

        const todayRetailOrders = await RetailOrder.findAll({
            where: { delivery_date: today },
            attributes: ['id', 'delivery_status', 'delivery_boy_id'],
            include: [
                { model: User, attributes: ['id', 'status'] }
            ]
        });

        // Filter only active users (matching /admin/all-orders and dispatch logic)
        const activeSchedules = todaySchedules.filter(s => {
            const user = s.Subscription?.User || s.WaterSubscription?.User;
            return user && user.status === 'active';
        });

        const activeRetailOrders = todayRetailOrders.filter(r => {
            return r.User && r.User.status === 'active';
        });

        // 1. Orders Today (Active Retail + Active Schedules scheduled for today)
        const ordersToday = activeRetailOrders.length + activeSchedules.length;

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
        const deliveredCount =
            activeSchedules.filter(s => s.status === 'delivered').length +
            activeRetailOrders.filter(r => r.delivery_status === 'delivered').length;

        // 6. Deliveries - Not Ready (pending or packing)
        const notReadyCount =
            activeSchedules.filter(s => ['pending', 'packing'].includes(s.status)).length +
            activeRetailOrders.filter(r => ['pending', 'packing'].includes(r.delivery_status)).length;

        // 7. Deliveries - Ready (Unassigned)
        const readyUnacceptedCount =
            activeSchedules.filter(s => ['ready', 'ready_for_delivery'].includes(s.status) && !s.delivery_boy_id).length +
            activeRetailOrders.filter(r => ['ready', 'ready_for_delivery'].includes(r.delivery_status) && !r.delivery_boy_id).length;

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
