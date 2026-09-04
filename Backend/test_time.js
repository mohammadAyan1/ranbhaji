import dotenv from 'dotenv';
dotenv.config();
import { sequelize } from './confiq/db.js';
import { BatchProductTask } from './models/index.js';

async function test() {
    try {
        const tasks = await BatchProductTask.findAll({ where: { status: 'ALARM' }, order: [['updated_at', 'DESC']] });
        if (tasks.length > 0) {
            for (const task of tasks) {
                console.log('--- TASK ID:', task.id, '---');
                console.log('Task started_at (raw from DB):', task.getDataValue('started_at'));
                const now = new Date();
                const startedAt = new Date(task.started_at);
                console.log('Now:', now.toISOString());
                console.log('StartedAt:', startedAt.toISOString());
                console.log('Elapsed Seconds:', (now.getTime() - startedAt.getTime()) / 1000);
            }
        } else {
            console.log('No running task');
        }
    } catch(e) {
        console.error(e);
    }
    process.exit();
}
test();
