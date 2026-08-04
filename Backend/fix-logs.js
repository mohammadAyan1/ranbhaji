import { Sequelize } from 'sequelize';
import { DeliverySchedule, DeliveryItem, Subscription, Package, ReturnedProductLog } from './models/index.js';

const fixOldLogs = async () => {
    try {
        console.log("Starting fix...");
        const items = await DeliveryItem.findAll({
            where: { return_status: 'approved' },
            include: [{
                model: DeliverySchedule,
                include: [{ model: Subscription, include: [{ model: Package }] }]
            }]
        });

        for (const item of items) {
            const schedule = item.DeliverySchedule;
            if (!schedule || !schedule.Subscription || !schedule.Subscription.Package) continue;

            const existingLog = await ReturnedProductLog.findOne({
                where: { product_id: item.product_id, returned_date: schedule.scheduled_date, user_id: schedule.Subscription.user_id }
            });

            if (!existingLog) {
                // Determine next date based on whether it was a full return or partial.
                // Assuming it was a full return if all items are approved.
                const allItems = await DeliveryItem.findAll({ where: { schedule_id: schedule.id } });
                const isFullReturn = allItems.every(i => i.return_status === 'approved');

                let nextDate = new Date();
                if (isFullReturn) {
                    const lastSchedule = await DeliverySchedule.findOne({
                        where: { subscription_id: schedule.subscription_id },
                        order: [['scheduled_date', 'DESC']]
                    });
                    
                    if (lastSchedule) {
                        const gap_days = Math.round(30 / schedule.Subscription.Package.services_per_month);
                        let calculatedNext = new Date(lastSchedule.scheduled_date);
                        calculatedNext.setDate(calculatedNext.getDate() + gap_days);
                        if (calculatedNext.getUTCDay() === 0) calculatedNext.setUTCDate(calculatedNext.getUTCDate() - 1);
                        nextDate = calculatedNext;
                    }
                } else {
                    nextDate.setDate(nextDate.getDate() + 1);
                }

                await ReturnedProductLog.create({
                    user_id: schedule.Subscription.user_id,
                    product_id: item.product_id,
                    returned_date: schedule.scheduled_date,
                    returned_qty: item.qty_gm,
                    next_schedule_date: nextDate.toISOString().split('T')[0]
                });
                console.log(`Created log for schedule ${schedule.id}, product ${item.product_id}, next date ${nextDate.toISOString().split('T')[0]}`);
            }
        }
        console.log("Done");
    } catch (e) {
        console.error(e);
    }
    process.exit(0);
};

fixOldLogs();
