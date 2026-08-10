import { sequelize } from './confiq/db.js';
import { DeliverySchedule, WaterSubscription, User } from './models/index.js';

const check = async () => {
    try {
        await sequelize.authenticate();
        
        const sub = await WaterSubscription.findOne({ where: { id: 2 } });
        
        const schedules = await DeliverySchedule.findAll({
            where: { water_subscription_id: sub.id, scheduled_date: '2026-08-08' }
        });

        schedules.forEach(s => {
            console.log(`Date: ${s.scheduled_date}, Created At: ${s.created_at}, Status: ${s.status}, Locked: ${s.is_locked}`);
        });
        
        process.exit(0);
    } catch(e) {
        console.error(e);
        process.exit(1);
    }
}
check();
