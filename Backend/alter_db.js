import { sequelize } from './models/index.js';

async function alterTable() {
    try {
        await sequelize.query("ALTER TABLE batch_product_tasks MODIFY COLUMN stage ENUM('WEIGHING', 'SOAKING', 'CUTTING', 'DRYING', 'BUCKET_ARRANGE') NOT NULL");
        console.log("Enum successfully updated.");
    } catch (e) {
        console.error("Error updating enum:", e);
    } finally {
        process.exit();
    }
}

alterTable();
