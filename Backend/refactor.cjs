const fs = require('fs');

const content = fs.readFileSync('controllers/batch.controller.js', 'utf8');
const original = fs.readFileSync('batch_demands.txt', 'utf8');

const helperCode = `export const computeBatchDemandHelper = async (batch_id, date) => {
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

    let defaultHealthWater, defaultMiracleWater;
    const waterProducts = await Product.findAll({ where: { category: 'water', status: 'active' } });
    if (waterProducts.length > 0) {
        defaultHealthWater = waterProducts.find(p => p.name.toLowerCase().includes('health'));
        defaultMiracleWater = waterProducts.find(p => p.name.toLowerCase().includes('miracle'));
        if (!defaultHealthWater) defaultHealthWater = waterProducts[0];
        if (!defaultMiracleWater) defaultMiracleWater = waterProducts[0];
    }

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
        } else {
            const sub = schedule.Subscription;
            if (sub && !schedule.is_returned_serving) {
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
                    sub.Items.forEach(item => {
                        if (item.is_seasonal && item.is_active && item.Product) {
                            addDemand(item.Product, item.qty_gm);
                        }
                    });
                }
            }

            if (schedule.WaterSubscription) {
                const ws = schedule.WaterSubscription;
                const qty = ws.container === 'glass' ? 20 : 20;
                const p = ws.water_type === 'health' ? defaultHealthWater : defaultMiracleWater;
                if (p) {
                    addDemand(p, qty);
                }
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

    return demandMap;
};

export const getBatchDemands = async (req, res) => {
    try {
        const { id: batch_id } = req.params;
        const { date } = req.query;

        if (!date) {
            return res.status(400).json({ success: false, message: "Date is required (YYYY-MM-DD)" });
        }

        const demandMap = await computeBatchDemandHelper(batch_id, date);

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
`;

const newContent = content.replace(original, helperCode);
fs.writeFileSync('controllers/batch.controller.js', newContent);
console.log('Successfully refactored batch.controller.js');
