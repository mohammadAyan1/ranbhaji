import { 
    Batch, DeliverySchedule, Subscription, SubscriptionItem, 
    Product, Package, PackageSeasonalConfig, WaterSubscription, 
    DeliveryItem, ScheduleSeasonalSelection, RetailOrder, RetailOrderItem 
} from "../models/index.js";

// POST /api/admin/batches
export const createBatch = async (req, res) => {
    try {
        const { name, status } = req.body;
        if (!name) return res.status(400).json({ success: false, message: "Batch name is required" });

        const batch = await Batch.create({ name, status: status || 'active' });
        res.status(201).json({ success: true, message: "Batch created successfully", batch });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// GET /api/admin/batches
export const getBatches = async (req, res) => {
    try {
        const batches = await Batch.findAll({
            where: { is_deleted: false },
            order: [['created_at', 'DESC']]
        });
        res.status(200).json({ success: true, batches });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// GET /api/user/batches
export const getActiveBatches = async (req, res) => {
    try {
        const batches = await Batch.findAll({
            where: { is_deleted: false, status: 'active' },
            order: [['created_at', 'ASC']]
        });
        res.status(200).json({ success: true, batches });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// PUT /api/admin/batches/:id
export const updateBatch = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, status } = req.body;
        
        const batch = await Batch.findByPk(id);
        if (!batch || batch.is_deleted) return res.status(404).json({ success: false, message: "Batch not found" });

        await batch.update({ name, status });
        res.status(200).json({ success: true, message: "Batch updated successfully", batch });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// DELETE /api/admin/batches/:id (Soft Delete)
export const deleteBatch = async (req, res) => {
    try {
        const { id } = req.params;
        const batch = await Batch.findByPk(id);
        
        if (!batch || batch.is_deleted) return res.status(404).json({ success: false, message: "Batch not found" });

        await batch.update({ is_deleted: true });
        res.status(200).json({ success: true, message: "Batch deleted successfully" });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// GET /api/admin/batches/:id/demands
export const getBatchDemands = async (req, res) => {
    try {
        const { id: batch_id } = req.params;
        const { date } = req.query;

        if (!date) {
            return res.status(400).json({ success: false, message: "Date is required (YYYY-MM-DD)" });
        }

        const demandMap = {};

        const addDemand = (p, qty) => {
            if (!p) return;
            const quantity = parseFloat(qty) || 0;
            if (quantity <= 0) return;

            if (!demandMap[p.id]) {
                demandMap[p.id] = {
                    product_name: p.name,
                    total_quantity: 0,
                    unit: p.unit || 'gm'
                };
            }
            demandMap[p.id].total_quantity += quantity;
        };

        // 1. Fetch Subscription & Water Deliveries
        const schedules = await DeliverySchedule.findAll({
            where: { batch_id, scheduled_date: date, status: ['pending', 'ready_for_delivery'] },
            include: [
                {
                    model: Subscription,
                    required: false,
                    include: [
                        { model: SubscriptionItem, as: 'Items', include: [{ model: Product }] },
                        { model: Package, include: [{ model: PackageSeasonalConfig, as: 'SeasonalConfig' }] }
                    ]
                },
                {
                    model: WaterSubscription,
                    required: false
                },
                { model: DeliveryItem, as: 'DeliveryItems', required: false, include: [{ model: Product }] },
                { model: ScheduleSeasonalSelection, as: 'SeasonalSelections', required: false, include: [{ model: Product }] }
            ]
        });

        // Water Products (For water subscriptions)
        let defaultHealthWater, defaultMiracleWater;
        const waterProducts = await Product.findAll({ where: { category: 'water', status: 'active' } });
        if (waterProducts.length > 0) {
            defaultHealthWater = waterProducts.find(p => p.name.toLowerCase().includes('health'));
            defaultMiracleWater = waterProducts.find(p => p.name.toLowerCase().includes('miracle'));
            if (!defaultHealthWater) defaultHealthWater = waterProducts[0];
            if (!defaultMiracleWater) defaultMiracleWater = waterProducts[0];
        }

        schedules.forEach(schedule => {
            // Package Subscription
            if (schedule.Subscription) {
                const sub = schedule.Subscription;
                
                // Fixed items
                if (sub.Items) {
                    sub.Items.forEach(item => {
                        if (item.is_fixed && item.is_active && item.Product) {
                            addDemand(item.Product, item.qty_gm);
                        }
                    });
                }
                
                // Seasonal items
                if (schedule.SeasonalSelections && schedule.SeasonalSelections.length > 0) {
                    schedule.SeasonalSelections.forEach(sel => {
                        if (sel.Product) {
                            addDemand(sel.Product, sel.qty_gm);
                        }
                    });
                } else if (sub.Items) {
                    // Fallback to active seasonal items from sub if no selections for this schedule yet
                    sub.Items.forEach(item => {
                        if (item.is_seasonal && item.is_active && item.Product) {
                            addDemand(item.Product, item.qty_gm);
                        }
                    });
                }
            }
            
            // Water Subscription
            if (schedule.WaterSubscription) {
                const ws = schedule.WaterSubscription;
                const qty = ws.container === 'glass' ? 20 : 20; 
                const p = ws.water_type === 'health' ? defaultHealthWater : defaultMiracleWater;
                if (p) {
                    addDemand(p, qty);
                }
            }
        });

        // 2. Fetch Retail Orders
        const retailOrders = await RetailOrder.findAll({
            where: { batch_id, delivery_date: date, delivery_status: ['pending', 'ready_for_delivery'] },
            include: [
                { model: RetailOrderItem, as: 'Items', include: [{ model: Product }] }
            ]
        });

        retailOrders.forEach(order => {
            if (order.Items) {
                order.Items.forEach(item => {
                    if (item.Product) {
                        addDemand(item.Product, item.quantity);
                    }
                });
            }
        });

        const demandsArray = Object.values(demandMap).sort((a, b) => b.total_quantity - a.total_quantity);

        res.status(200).json({
            success: true,
            date,
            batch_id: parseInt(batch_id),
            demands: demandsArray
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
