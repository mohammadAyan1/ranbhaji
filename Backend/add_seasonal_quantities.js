import { sequelize } from './confiq/db.js';

async function addCol() {
    try {
        await sequelize.query(`ALTER TABLE package_seasonal_config ADD COLUMN seasonal_quantities JSON NULL`);
        console.log("Column seasonal_quantities added to package_seasonal_config");
    } catch (e) {
        console.log("Error or already exists config:", e.message);
    }
    
    try {
        await sequelize.query(`ALTER TABLE calculator_drafts ADD COLUMN seasonal_quantities JSON NULL`);
        console.log("Column seasonal_quantities added to calculator_drafts");
    } catch (e) {
        console.log("Error or already exists drafts:", e.message);
    }
    process.exit(0);
}

addCol();
