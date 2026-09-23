import { Op } from 'sequelize';
import { BatchProductTask, TaskWorkerAssignment, Product } from './models/index.js';

async function test() {
    try {
        const startOfToday = new Date();
        startOfToday.setUTCHours(0, 0, 0, 0);
        
        const assignments = await TaskWorkerAssignment.findAll({
            where: {
                joined_at: { [Op.gte]: startOfToday }
            },
            include: [{
                model: BatchProductTask,
                as: 'task',
                include: [{ model: Product }]
            }],
            order: [['joined_at', 'ASC']]
        });
        console.log("Success! Found", assignments.length);
    } catch (e) {
        console.error("Error:", e.message);
    }
}
test();
