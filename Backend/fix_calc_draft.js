import { sequelize } from './confiq/db.js';

async function alterTable() {
    try {
        await sequelize.query(`ALTER TABLE calculator_drafts ADD COLUMN seasonal_quantities JSON`);
        console.log("Added seasonal_quantities column");
    } catch (e) {
        console.log(e.message);
    }
    try {
        await sequelize.query(`ALTER TABLE calculator_drafts ADD COLUMN num_persons_max INTEGER`);
        console.log("Added num_persons_max column");
    } catch (e) {
        console.log(e.message);
    }
    process.exit(0);
}

alterTable();
