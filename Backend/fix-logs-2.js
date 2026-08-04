import { DeliverySchedule, DeliveryItem, Subscription, Package, ReturnedProductLog } from './models/index.js';

const fixOldLogs = async () => {
    try {
        console.log("Starting correction...");
        
        // Find all full returns
        const logs = await ReturnedProductLog.findAll({
            where: { next_schedule_date: '2026-09-11' } // the wrongly calculated ones
        });

        for (const log of logs) {
            // Find the schedule that this was returned from
            const returnedFromSchedule = await DeliverySchedule.findOne({
                where: { scheduled_date: log.returned_date, subscription_id: (await Subscription.findOne({where: {user_id: log.user_id}})).id }
            });

            if (returnedFromSchedule) {
                // The correct next schedule should be the one marked as `is_returned_serving: true` 
                // and is the first one after the original LAST schedule.
                // Or simply, we can just find the earliest schedule marked `is_returned_serving = true` 
                // for this subscription that is > the returned date.
                
                const nextServe = await DeliverySchedule.findOne({
                    where: { 
                        subscription_id: returnedFromSchedule.subscription_id,
                        is_returned_serving: true,
                        // scheduled_date: { [Op.gt]: log.returned_date } 
                    },
                    order: [['scheduled_date', 'ASC']]
                });

                if (nextServe) {
                    await log.update({ next_schedule_date: nextServe.scheduled_date });
                    console.log(`Fixed log for product ${log.product_id} to ${nextServe.scheduled_date}`);
                }
            }
        }
        console.log("Done");
    } catch (e) {
        console.error(e);
    }
    process.exit(0);
};

fixOldLogs();
