import { sequelize } from './confiq/db.js';
import { BatchProcessingLog } from './models/index.js';

async function createTable() {
    try {
        await BatchProcessingLog.sync({ force: true });
        console.log("Successfully created BatchProcessingLog table!");
        process.exit(0);
    } catch (error) {
        console.error("Error creating table:", error);
        process.exit(1);
    }
}

createTable();
