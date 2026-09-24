import { sequelize } from './confiq/db.js';

async function alterTable() {
    try {
        await sequelize.query(`ALTER TABLE calculator_drafts ADD COLUMN target_user_id INT NULL`);
        console.log('Added target_user_id');
    } catch(e) {
        console.log('Column target_user_id might exist', e.message);
    }
    try {
        await sequelize.query(`ALTER TABLE calculator_drafts ADD COLUMN target_mobile_number VARCHAR(15) NULL`);
        console.log('Added target_mobile_number');
    } catch(e) {
        console.log('Column target_mobile_number might exist', e.message);
    }
    process.exit(0);
}
alterTable();
