import { RetailOrder, Subscription, WaterSubscription, User, Package, Batch, DeliverySchedule, MissedProductLog, Product } from "../models/index.js";
import { Op } from "sequelize";

// GET /api/admin/today-work/orders-for-batch
export const getOrdersForBatch = async (req, res) => {
    try {
        const { batch_id, fromDate, toDate } = req.query; // 'unassigned', or a specific batch ID, or 'all'

        // Date logic
        const todayStr = new Date().toISOString().split('T')[0];
        const startStr = fromDate || todayStr;
        const endStr = toDate || todayStr;

        const start = new Date(startStr);
        const end = new Date(new Date(endStr).setHours(23, 59, 59, 999));

        // 1. Fetch Retail Orders that are pending or assigned to this batch
        const retailWhere = {
            delivery_status: { [Op.notIn]: ['delivered', 'cancelled'] },
            delivery_date: { [Op.between]: [startStr, endStr] }
        };
        if (batch_id === 'unassigned') retailWhere.batch_id = null;
        else if (batch_id && batch_id !== 'all') retailWhere.batch_id = batch_id;

        const retailOrders = await RetailOrder.findAll({
            where: retailWhere,
            include: [
                { model: User, attributes: ['id', 'name', 'phone'] },
                { model: Batch, attributes: ['id', 'name'] }
            ],
            order: [['created_at', 'DESC']]
        });

        // 2. Fetch Active Subscriptions that need delivery from DeliverySchedule
        const subWhere = {
            status: ['pending', 'ready_for_delivery'],
            scheduled_date: { [Op.between]: [startStr, endStr] }
        };
        if (batch_id === 'unassigned') subWhere.batch_id = null;
        else if (batch_id && batch_id !== 'all') subWhere.batch_id = batch_id;

        const schedules = await DeliverySchedule.findAll({
            where: subWhere,
            include: [
                {
                    model: Subscription,
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
                { model: Batch, attributes: ['id', 'name'] }
            ],
            order: [['scheduled_date', 'DESC']]
        });

        // Map them into a unified array
        const unifiedOrders = [];
        retailOrders.forEach(o => {
            unifiedOrders.push({
                id: o.id,
                type: 'retail',
                order_id: o.id,
                user: o.User,
                batch: o.Batch,
                batch_id: o.batch_id,
                status: o.delivery_status,
                description: `Retail Order - ₹${o.total_amount}`,
                date: o.created_at
            });
        });

        schedules.forEach(s => {
            if (s.Subscription) {
                unifiedOrders.push({
                    id: `sub-${s.id}`,
                    type: 'subscription',
                    order_id: s.id, // ID of DeliverySchedule
                    user: s.Subscription.User,
                    batch: s.Batch,
                    batch_id: s.batch_id,
                    status: s.status,
                    description: s.is_returned_serving ? `Return Order (${s.Subscription.Package?.name || 'Unknown'})` : `Package: ${s.Subscription.Package?.name || 'Unknown'}`,
                    date: s.scheduled_date
                });
            }
            
            if (s.WaterSubscription) {
                unifiedOrders.push({
                    id: `water-${s.id}`,
                    type: 'water',
                    order_id: s.id,
                    user: s.WaterSubscription.User,
                    batch: s.Batch,
                    batch_id: s.batch_id,
                    status: s.status,
                    description: `Water: ${s.WaterSubscription.water_type} (${s.WaterSubscription.container}) - ${parseFloat(s.WaterSubscription.capacity_liters || 2)}L`,
                    date: s.scheduled_date
                });
            }
        });

        // Fetch batches for filter dropdown
        const batches = await Batch.findAll({ where: { status: 'active' } });

        res.status(200).json({ success: true, orders: unifiedOrders, batches });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// POST /api/admin/today-work/assign-batch
export const assignBatchToOrders = async (req, res) => {
    try {
        const { batch_id, orders } = req.body;
        // orders = [{ type: 'retail', id: 1 }, { type: 'subscription', id: 2 }]

        if (!orders || !Array.isArray(orders)) {
            return res.status(400).json({ success: false, message: "Invalid orders data" });
        }

        const newBatchId = batch_id === 'unassigned' ? null : batch_id;

        for (const order of orders) {
            if (order.type === 'retail') {
                await RetailOrder.update({ batch_id: newBatchId }, { where: { id: order.id } });
            } else if (order.type === 'subscription' || order.type === 'water') {
                await DeliverySchedule.update({ batch_id: newBatchId }, { where: { id: order.order_id } });
            }
        }

        res.status(200).json({ success: true, message: "Batches assigned successfully" });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// GET /api/admin/today-work/missing-items
export const getMissingItems = async (req, res) => {
    try {
        const { fromDate, toDate } = req.query;

        // Date logic
        const todayStr = new Date().toISOString().split('T')[0];
        const startStr = fromDate || todayStr;
        const endStr = toDate || todayStr;

        const missingLogs = await MissedProductLog.findAll({
            where: {
                missed_date: { [Op.between]: [startStr, endStr] }
            },
            include: [
                { model: User, attributes: ['id', 'name', 'phone'] },
                { model: Product, attributes: ['id', 'name', 'hindi_name', 'unit'] }
            ],
            order: [['missed_date', 'DESC']]
        });

        // Format for frontend
        const formattedLogs = await Promise.all(missingLogs.map(async (log) => {
            let serviceInfo = null;
            if (log.source_type === 'subscription' && log.source_id) {
                const schedule = await DeliverySchedule.findByPk(log.source_id, {
                    include: [{ model: Subscription, include: [{ model: Package }] }]
                });
                if (schedule && schedule.Subscription) {
                    // Estimate current service number by finding all past schedules
                    // But simpler: just pass the numbers we have
                    serviceInfo = {
                        scheduleDate: schedule.scheduled_date,
                        servicesCompleted: schedule.Subscription.services_completed,
                        totalServices: schedule.Subscription.total_services,
                        packageName: schedule.Subscription.Package?.name
                    };
                }
            }

            return {
                id: log.id,
                missed_date: log.missed_date,
                next_schedule_date: log.next_schedule_date,
                user: log.User,
                product: log.Product,
                missed_qty: log.missed_qty,
                is_full_order: log.is_full_order,
                source_type: log.source_type,
                source_id: log.source_id,
                service_info: serviceInfo
            };
        }));

        res.status(200).json({ success: true, missing_logs: formattedLogs });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
