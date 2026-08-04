import { DeliverySchedule } from './models/index.js';

const check = async () => {
    try {
        const scheds = await DeliverySchedule.findAll({
            where: { subscription_id: (await DeliverySchedule.findByPk(466)).subscription_id },
            order: [['scheduled_date', 'ASC']]
        });
        scheds.forEach(s => console.log(s.id, s.scheduled_date));
    } catch (e) {
        console.error(e);
    }
    process.exit(0);
};

check();
