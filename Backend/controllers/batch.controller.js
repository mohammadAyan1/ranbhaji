import {
    Batch, DeliverySchedule, Subscription, SubscriptionItem,
    Product, Package, PackageSeasonalConfig, WaterSubscription,
    DeliveryItem, ScheduleSeasonalSelection, RetailOrder, RetailOrderItem,
    BatchProcessingLog, User, PackageSeasonalPool
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

// ... skipped down to getProcessingLogs ... (WAIT! I cannot replace a huge block like this. I will do it in two separate calls.)

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
                        { model: Package, include: [{ model: PackageSeasonalConfig, as: 'SeasonalConfig' }, { model: PackageSeasonalPool, as: 'SeasonalPool', include: [{ model: Product }] }] },
                        { model: User, attributes: ['id', 'disliked_products'] }
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

        // Pre-calculate global demand map from all existing seasonal selections
        const globalDemandMap = {};
        schedules.forEach(schedule => {
            if (schedule.SeasonalSelections && schedule.SeasonalSelections.length > 0) {
                schedule.SeasonalSelections.forEach(sel => {
                    globalDemandMap[sel.product_id] = (globalDemandMap[sel.product_id] || 0) + parseFloat(sel.qty_gm || 0);
                });
            }
        });

        schedules.forEach(schedule => {
            const dbItems = schedule.DeliveryItems || [];
            if (dbItems.length > 0) {
                for (const item of dbItems) {
                    if (!item.Product) continue;
                    if (schedule.is_returned_serving) {
                        if (item.will_purchase) {
                            addDemand(item.Product, parseFloat(item.qty_gm || 0));
                        }
                    } else {
                        addDemand(item.Product, parseFloat(item.qty_gm || 0));
                    }
                }
            } else if (schedule.Subscription) {
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
                } else if (sub.Package?.SeasonalConfig) {
                    const seasonalConfig = sub.Package.SeasonalConfig;
                    const maxSelectCount = seasonalConfig.max_select_count || 3;
                    const pool = sub.Package.SeasonalPool || [];
                    const allowedProductIds = pool.map(p => p.product_id);
                    const dislikedProducts = sub.User?.disliked_products || [];

                    const fixedItemsForFilter = sub.Items ? sub.Items.filter(i => i.is_fixed).map(i => i.product_id) : [];
                    const sortedProducts = Object.keys(globalDemandMap)
                        .map(id => parseInt(id))
                        .filter(id => allowedProductIds.includes(id) && !dislikedProducts.includes(id) && !fixedItemsForFilter.includes(id))
                        .map(id => ({
                            product_id: id,
                            demand: globalDemandMap[id]
                        })).sort((a, b) => b.demand - a.demand);

                    const topProducts = sortedProducts.slice(0, maxSelectCount);

                    const pkg = sub.Package;
                    const per_service_amount = (parseFloat(pkg.price) / pkg.services_per_month) * (1 - parseFloat(pkg.margin_percent || 0) / 200);
                    const fixedItems = sub.Items.filter(i => i.is_fixed);
                    let fixedCost = 0;
                    for (const fi of fixedItems) {
                        fixedCost += parseFloat(fi.qty_gm) * parseFloat(fi.Product?.purchase_price_per_gm || fi.Product?.selling_price_per_gm || 0);
                    }
                    const seasonalBudget = per_service_amount - fixedCost;

                    if (topProducts.length > 0 && seasonalBudget > 0) {
                        const budgetPerProduct = seasonalBudget / topProducts.length;
                        for (const tp of topProducts) {
                            const poolItem = pool.find(p => p.product_id === tp.product_id);
                            if (poolItem && poolItem.Product) {
                                const prod = poolItem.Product;
                                const price = parseFloat(prod.purchase_price_per_gm || prod.selling_price_per_gm || 1);
                                const qty = budgetPerProduct / price;
                                addDemand(prod, parseFloat(qty.toFixed(2)));
                            }
                        }
                    } else if (pool.length > 0 && seasonalBudget > 0) {
                        const fixedItemsForFilter = sub.Items ? sub.Items.filter(i => i.is_fixed).map(i => i.product_id) : [];
                        const filteredPool = pool.filter(item => !dislikedProducts.includes(item.product_id) && !fixedItemsForFilter.includes(item.product_id));
                        const selectedPoolItems = filteredPool.slice(0, maxSelectCount);
                        const budgetPerProduct = seasonalBudget / (selectedPoolItems.length || 1);
                        for (const item of selectedPoolItems) {
                            if (item.Product) {
                                const prod = item.Product;
                                const price = parseFloat(prod.purchase_price_per_gm || prod.selling_price_per_gm || 1);
                                const qty = budgetPerProduct / price;
                                addDemand(prod, parseFloat(qty.toFixed(2)));
                            }
                        }
                    } else if (sub.Items) {
                        sub.Items.forEach(item => {
                            if (item.is_seasonal && item.is_active && item.Product) {
                                addDemand(item.Product, item.qty_gm);
                            }
                        });
                    }
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
                const factor = remaining_quantity / 100;

                const soakingTime = parseFloat(pData.product.soaking_time || 0) * factor;
                const cleaningTime = parseFloat(pData.product.cleaning_time || 0) * factor;
                const cuttingTime = parseFloat(pData.product.cutting_time || 0) * factor;
                const dryingTime = parseFloat(pData.product.drying_time || 0) * factor;
                const weightingTime = parseFloat(pData.product.weighting_time || 0) * factor;

                const total_time_minutes = soakingTime + cleaningTime + cuttingTime + dryingTime + weightingTime;

                demandsArray.push({
                    product_id: parseInt(productId),
                    product_name: pData.product_name,
                    product_image: pData.product.image_url,
                    hindi_name: pData.product.hindi_name,
                    total_demand: pData.total_quantity,
                    processed_qty: processed,
                    remaining_quantity: remaining_quantity,
                    unit: pData.unit,
                    total_soaking_time: parseFloat(soakingTime.toFixed(2)),
                    total_cleaning_time: parseFloat(cleaningTime.toFixed(2)),
                    total_cutting_time: parseFloat(cuttingTime.toFixed(2)),
                    total_drying_time: parseFloat(dryingTime.toFixed(2)),
                    total_weighting_time: parseFloat(weightingTime.toFixed(2)),
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
        const { date, product_id, processed_qty, process_type, type } = req.body;

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

        if (type === 'start') {
            let timePer100gm = 0;
            if (process_type === 'soaking') timePer100gm = parseFloat(product.soaking_time || 0);
            else if (process_type === 'cleaning') timePer100gm = parseFloat(product.cleaning_time || 0);
            else if (process_type === 'cutting') timePer100gm = parseFloat(product.cutting_time || 0);
            else if (process_type === 'drying') timePer100gm = parseFloat(product.drying_time || 0);
            else if (process_type === 'weighting') timePer100gm = parseFloat(product.weighting_time || 0);

            const expected_time_taken_minutes = (qty / 100) * timePer100gm;

            const log = await BatchProcessingLog.create({
                batch_id,
                date,
                product_id,
                process_type,
                processed_qty_gm: qty,
                expected_time_taken_minutes: parseFloat(expected_time_taken_minutes.toFixed(2)),
                time_taken_minutes: 0,
                start_time: new Date()
            });
            return res.status(200).json({
                success: true,
                message: "Process started",
                product_image: product.image_url,
                hindi_name: product.hindi_name,
                expected_time_taken_minutes: parseFloat(expected_time_taken_minutes.toFixed(2)),
                start_time: log.start_time,
                is_ended: false,
                log
            });
        } else if (type === 'end') {
            const log = await BatchProcessingLog.findOne({
                where: {
                    batch_id,
                    date,
                    product_id,
                    process_type,
                    end_time: null
                },
                order: [['created_at', 'DESC']]
            });

            if (!log) {
                return res.status(404).json({ success: false, message: "No active process found to end" });
            }

            const endTime = new Date();
            const timeDiffMs = endTime - new Date(log.start_time);
            const timeTakenMinutes = timeDiffMs / 60000;
            const timeTakenSeconds = timeDiffMs / 1000;

            await log.update({
                end_time: endTime,
                time_taken_minutes: parseFloat(timeTakenMinutes.toFixed(2)),
                completed_by_id: req.user ? req.user.id : null
            });

            return res.status(200).json({
                success: true,
                message: "Process ended",
                product_image: product.image_url,
                hindi_name: product.hindi_name,
                expected_time_taken_minutes: log.expected_time_taken_minutes,
                start_time: log.start_time,
                end_time: log.end_time,
                time_taken_seconds: parseFloat(timeTakenSeconds.toFixed(2)),
                is_ended: true,
                log
            });
        }

        // Fallback for auto/manual calculation if type is not start or end
        let timePer100gm = 0;
        if (process_type === 'soaking') timePer100gm = parseFloat(product.soaking_time || 0);
        else if (process_type === 'cleaning') timePer100gm = parseFloat(product.cleaning_time || 0);
        else if (process_type === 'cutting') timePer100gm = parseFloat(product.cutting_time || 0);
        else if (process_type === 'drying') timePer100gm = parseFloat(product.drying_time || 0);
        else if (process_type === 'weighting') timePer100gm = parseFloat(product.weighting_time || 0);

        const time_taken_minutes = (qty / 100) * timePer100gm;

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
                { model: Product },
                { model: Batch },
                { model: User, as: 'CompletedBy', attributes: ['name'] }
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
                    hindi_name: log.Product ? log.Product.hindi_name : null,
                    image_url: log.Product ? log.Product.image_url : null,
                    unit: log.Product ? log.Product.unit : 'gm',
                    product_details: log.Product, // full joined product
                    processes: {}
                };
            }

            const ptype = log.process_type || 'unknown';
            if (!productMap[pid].processes[ptype]) {
                productMap[pid].processes[ptype] = [];
            }

            const logData = log.toJSON();
            productMap[pid].processes[ptype].push({
                ...logData,
                batch_name: log.Batch ? log.Batch.name : 'Unknown',
                batch_details: log.Batch // full joined batch
            });
        });

        const formattedLogs = Object.values(productMap);

        res.status(200).json({ success: true, date, data: formattedLogs });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
