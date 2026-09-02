import { sequelize } from './confiq/db.js';

async function addCol() {
    try {
        await sequelize.query(`ALTER TABLE package_seasonal_config ADD COLUMN default_qty_gm DECIMAL(10,2) NULL`);
        console.log("Column added successfully");
    } catch (e) {
        console.log("Error or already exists:", e.message);
    }
    process.exit(0);
}

addCol();
