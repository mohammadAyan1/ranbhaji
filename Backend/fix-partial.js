import { ReturnedProductLog, DeliverySchedule, DeliveryItem, Subscription } from './models/index.js';

const fixPartialReturns = async () => {
    try {
        console.log("Fixing partial returns...");

        // Find all logs that might have the wrong returned_date or next_schedule_date
        const logs = await ReturnedProductLog.findAll();

        for (const log of logs) {
            // First, find the schedule that corresponds to this user and product on the day before the next schedule
            // Wait, for partial returns, we can just find the DeliveryItem that was approved
            const item = await DeliveryItem.findOne({
                where: { product_id: log.product_id, return_status: 'approved' },
                include: [{
                    model: DeliverySchedule,
                    where: { subscription_id: (await Subscription.findOne({where: {user_id: log.user_id}}))?.id }
                }]
            });

            if (item && item.DeliverySchedule) {
                const correctReturnedDate = item.DeliverySchedule.scheduled_date;
                const correctNextDate = new Date(correctReturnedDate);
                correctNextDate.setDate(correctNextDate.getDate() + 1);
                const nextDateStr = correctNextDate.toISOString().split('T')[0];

                // If this log belongs to a partial return (not a full return logic)
                // Let's just fix the date to correctReturnedDate and nextDateStr if it's currently wrong
                // How to distinguish from FULL returns?
                // Full returns have next_schedule_date > correctReturnedDate + 1 day
                
                // For Order 462 Onion (product ID? maybe)
                // For Order 458 Lemon (product 32)
                
                // Let's just manually fix the logs for August 3 schedules which have wrong partial dates
                if (correctReturnedDate === '2026-08-03') {
                    // check if it was a partial return
                    const allItems = await DeliveryItem.findAll({ where: { schedule_id: item.schedule_id } });
                    const isFullReturn = allItems.every(i => i.return_status === 'approved');
                    
                    if (!isFullReturn) {
                        await log.update({ 
                            returned_date: correctReturnedDate,
                            next_schedule_date: nextDateStr 
                        });
                        console.log(`Fixed log for partial return product ${log.product_id}: returned_date=${correctReturnedDate}, next=${nextDateStr}`);
                    }
                }
            }
        }

        console.log("Done");
    } catch (e) {
        console.error(e);
    }
    process.exit(0);
};

fixPartialReturns();
