import { 
    Batch, DeliverySchedule, Subscription, SubscriptionItem, 
    Product, Package, PackageSeasonalConfig, WaterSubscription, 
    DeliveryItem, ScheduleSeasonalSelection, RetailOrder, RetailOrderItem,
    BatchProcessingLog
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
                    unit: p.unit || 'gm',
                    product: p
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

        const processingLogs = await BatchProcessingLog.findAll({
            where: { batch_id, date }
        });

        const processMap = {};
        processingLogs.forEach(log => {
            processMap[log.product_id] = (processMap[log.product_id] || 0) + parseFloat(log.processed_qty_gm);
        });

        const demandsArray = [];
        
        Object.keys(demandMap).forEach(productId => {
            const pData = demandMap[productId];
            const processed = processMap[productId] || 0;
            const remaining_quantity = Math.max(0, pData.total_quantity - processed);
            
            if (remaining_quantity > 0) {
                // Calculate time
                const timePer100 = parseFloat(pData.product.soaking_time || 0) +
                                   parseFloat(pData.product.cleaning_time || 0) +
                                   parseFloat(pData.product.cutting_time || 0) +
                                   parseFloat(pData.product.drying_time || 0) +
                                   parseFloat(pData.product.weighting_time || 0);
                                   
                const total_time_minutes = (remaining_quantity / 100) * timePer100;

                demandsArray.push({
                    product_id: parseInt(productId),
                    product_name: pData.product_name,
                    total_demand: pData.total_quantity,
                    processed_qty: processed,
                    remaining_quantity: remaining_quantity,
                    unit: pData.unit,
                    total_time_minutes: parseFloat(total_time_minutes.toFixed(2))
                });
            }
        });

        demandsArray.sort((a, b) => b.remaining_quantity - a.remaining_quantity);

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

// POST /api/admin/batches/:id/demands/process
export const processBatchDemand = async (req, res) => {
    try {
        const { id: batch_id } = req.params;
        const { date, product_id, processed_qty, process_type } = req.body;

        if (!date || !product_id || processed_qty === undefined || !process_type) {
            return res.status(400).json({ success: false, message: "date, product_id, process_type, and processed_qty are required" });
        }

        const qty = parseFloat(processed_qty);
        if (qty <= 0) {
            return res.status(400).json({ success: false, message: "processed_qty must be greater than 0" });
        }

        const product = await Product.findByPk(product_id);
        if (!product) {
            return res.status(404).json({ success: false, message: "Product not found" });
        }

        // Calculate time based on process_type
        let timePer100gm = 0;
        if (process_type === 'soaking') timePer100gm = parseFloat(product.soaking_time || 0);
        else if (process_type === 'cleaning') timePer100gm = parseFloat(product.cleaning_time || 0);
        else if (process_type === 'cutting') timePer100gm = parseFloat(product.cutting_time || 0);
        else if (process_type === 'drying') timePer100gm = parseFloat(product.drying_time || 0);
        else if (process_type === 'weighting') timePer100gm = parseFloat(product.weighting_time || 0);

        const time_taken_minutes = (qty / 100) * timePer100gm;

        // Create a new log for every session to maintain history
        const log = await BatchProcessingLog.create({
            batch_id,
            date,
            product_id,
            process_type,
            processed_qty_gm: qty,
            time_taken_minutes: parseFloat(time_taken_minutes.toFixed(2))
        });

        res.status(200).json({ success: true, message: "Processed quantity logged", log });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// GET /api/admin/processing-logs
export const getProcessingLogs = async (req, res) => {
    try {
        const { date } = req.query;
        if (!date) {
            return res.status(400).json({ success: false, message: "Date is required" });
        }

        const logs = await BatchProcessingLog.findAll({
            where: { date },
            include: [
                { model: Product, attributes: ['id', 'name', 'hindi_name', 'unit'] },
                { model: Batch, attributes: ['id', 'name'] }
            ],
            order: [['created_at', 'ASC']]
        });

        const productMap = {};

        logs.forEach(log => {
            const pid = log.product_id;
            if (!productMap[pid]) {
                productMap[pid] = {
                    product_id: pid,
                    product_name: log.Product ? log.Product.name : 'Unknown',
                    unit: log.Product ? log.Product.unit : 'gm',
                    processes: {}
                };
            }

            const ptype = log.process_type || 'unknown';
            if (!productMap[pid].processes[ptype]) {
                productMap[pid].processes[ptype] = [];
            }

            productMap[pid].processes[ptype].push({
                id: log.id,
                batch_name: log.Batch ? log.Batch.name : 'Unknown',
                qty_gm: log.processed_qty_gm,
                time_taken_minutes: log.time_taken_minutes,
                created_at: log.created_at
            });
        });

        const formattedLogs = Object.values(productMap);

        res.status(200).json({ success: true, date, data: formattedLogs });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
