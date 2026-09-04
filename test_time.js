import dotenv from 'dotenv';
dotenv.config();
import { sequelize } from './Backend/confiq/db.js';
import { BatchProductTask } from './Backend/models/index.js';

async function test() {
    try {
        const task = await BatchProductTask.findOne({ where: { status: 'RUNNING' } });
        if (task) {
            console.log('Task started_at:', task.getDataValue('started_at'));
            const now = new Date();
            const startedAt = new Date(task.started_at);
            console.log('Now:', now, 'StartedAt:', startedAt, 'Elapsed:', (now.getTime() - startedAt.getTime()) / 1000);
        } else {
            console.log('No running task');
        }
    } catch(e) {
        console.error(e);
    }
    process.exit();
}
test();
