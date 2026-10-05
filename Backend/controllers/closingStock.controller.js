import { DailyStockLog, WasteLog, Product, DeliveryItem, DeliverySchedule, PurchaseLog, sequelize } from "../models/index.js";
import { Op } from "sequelize";

// GET /api/admin/closing-stock
export const getClosingStockReport = async (req, res) => {
    try {
        const { date, start_date, end_date } = req.query;
        
        let targetDate = new Date().toLocaleString("sv-SE", { timeZone: "Asia/Kolkata" }).split(" ")[0]; // Today IST
        let startDate = date || start_date || targetDate;
        let endDate = date || end_date || targetDate;

        // Fetch all active products
        const products = await Product.findAll({
            where: { status: 'active', category: { [Op.ne]: 'water' } }, // Exclude water if needed, or keep all
            attributes: ['id', 'name', 'unit', 'purchase_price_per_gm']
        });

        // Fetch saved logs for the date range
        const stockLogs = await DailyStockLog.findAll({
            where: { date: { [Op.between]: [startDate, endDate] } }
        });

        // Group saved logs by product (sum if range, or just take first if single date)
        const logMap = {};
        for (const log of stockLogs) {
            if (!logMap[log.product_id]) {
                logMap[log.product_id] = { opening: 0, purchase: 0, demand: 0, closing: 0, waste: 0, entries: 0 };
            }
            logMap[log.product_id].opening += parseFloat(log.opening_stock);
            logMap[log.product_id].purchase += parseFloat(log.purchase_qty);
            logMap[log.product_id].demand += parseFloat(log.demand_qty);
            logMap[log.product_id].closing += parseFloat(log.closing_stock);
            logMap[log.product_id].waste += parseFloat(log.waste_qty);
            logMap[log.product_id].entries += 1;
        }

        // If it's a single day and we want real-time demand & purchase calculation for products that don't have a log yet
        const isSingleDay = startDate === endDate;
        let realTimeDemandMap = {};
        let realTimePurchaseMap = {};
        let yesterdayClosingMap = {};

        if (isSingleDay) {
            // Calculate real-time demand from deliveries
            const schedules = await DeliverySchedule.findAll({
                where: { scheduled_date: startDate }, // includes completed/pending, maybe filter by status if needed
                attributes: ['id']
            });
            const scheduleIds = schedules.map(s => s.id);
            if (scheduleIds.length > 0) {
                const items = await DeliveryItem.findAll({
                    where: { schedule_id: { [Op.in]: scheduleIds } },
                    attributes: ['product_id', [sequelize.fn('SUM', sequelize.col('qty_gm')), 'total_demand']],
                    group: ['product_id']
                });
                items.forEach(i => {
                    realTimeDemandMap[i.product_id] = parseFloat(i.get('total_demand') || 0);
                });
            }

            // Calculate real-time purchase
            const purchases = await PurchaseLog.findAll({
                where: { purchase_date: startDate },
                attributes: ['product_id', [sequelize.fn('SUM', sequelize.col('quantity')), 'total_purchase']],
                group: ['product_id']
            });
            purchases.forEach(p => {
                realTimePurchaseMap[p.product_id] = parseFloat(p.get('total_purchase') || 0);
            });

            // Get yesterday's closing stock
            const prevDateObj = new Date(startDate);
            prevDateObj.setDate(prevDateObj.getDate() - 1);
            const prevDateStr = prevDateObj.toISOString().split('T')[0];
            const yesterdayLogs = await DailyStockLog.findAll({
                where: { date: prevDateStr },
                attributes: ['product_id', 'closing_stock']
            });
            yesterdayLogs.forEach(yl => {
                yesterdayClosingMap[yl.product_id] = parseFloat(yl.closing_stock || 0);
            });
        }

        const report = products.map(prod => {
            const saved = logMap[prod.id];
            
            if (saved) {
                // Return saved values
                return {
                    product_id: prod.id,
                    product_name: prod.name,
                    unit: prod.unit,
                    opening_stock: saved.opening,
                    purchase_qty: saved.purchase,
                    demand_qty: saved.demand,
                    closing_stock: saved.closing,
                    waste_qty: saved.waste,
                    is_saved: true
                };
            } else if (isSingleDay) {
                // Compute real-time values for today
                let demand = realTimeDemandMap[prod.id] || 0;
                let purchase = realTimePurchaseMap[prod.id] || 0;
                let opening = yesterdayClosingMap[prod.id] || 0;
                
                // Convert demand from GM to KG if product unit is gm/ml
                if (prod.unit === 'gm' || prod.unit === 'ml') {
                    demand = demand / 1000;
                }

                // Without closing stock, we can't calculate exact waste yet, but we can show expected closing
                const expected_closing = opening + purchase - demand;

                return {
                    product_id: prod.id,
                    product_name: prod.name,
                    unit: prod.unit,
                    opening_stock: opening,
                    purchase_qty: purchase,
                    demand_qty: demand,
                    closing_stock: 0, // Need admin input
                    expected_closing: expected_closing > 0 ? expected_closing : 0,
                    waste_qty: 0,
                    is_saved: false
                };
            } else {
                return null;
            }
        }).filter(Boolean);

        res.status(200).json({ success: true, date: startDate, is_range: !isSingleDay, report });

    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// POST /api/admin/closing-stock
export const saveClosingStock = async (req, res) => {
    const t = await sequelize.transaction();
    try {
        const { date, items } = req.body;
        // items is array of { product_id, closing_stock, opening_stock, purchase_qty, demand_qty, waste_qty }

        if (!date || !items || !Array.isArray(items)) {
            await t.rollback();
            return res.status(400).json({ success: false, message: "Date and items array are required" });
        }

        for (const item of items) {
            const waste = parseFloat(item.waste_qty || 0);
            
            // Upsert DailyStockLog
            const existingLog = await DailyStockLog.findOne({
                where: { date, product_id: item.product_id },
                transaction: t
            });

            if (existingLog) {
                await existingLog.update({
                    opening_stock: item.opening_stock,
                    purchase_qty: item.purchase_qty,
                    demand_qty: item.demand_qty,
                    closing_stock: item.closing_stock,
                    waste_qty: waste
                }, { transaction: t });
            } else {
                await DailyStockLog.create({
                    date,
                    product_id: item.product_id,
                    opening_stock: item.opening_stock,
                    purchase_qty: item.purchase_qty,
                    demand_qty: item.demand_qty,
                    closing_stock: item.closing_stock,
                    waste_qty: waste
                }, { transaction: t });
            }

            // Save to WasteLog if there is waste
            if (waste > 0) {
                await WasteLog.create({
                    waste_date: date,
                    product_id: item.product_id,
                    quantity: waste,
                    remark: 'Auto-calculated from Closing Stock'
                }, { transaction: t });
            }
        }

        await t.commit();
        res.status(200).json({ success: true, message: "Closing stock and waste saved successfully" });
    } catch (error) {
        await t.rollback();
        console.error(error);
        res.status(500).json({ success: false, message: error.message });
    }
};
