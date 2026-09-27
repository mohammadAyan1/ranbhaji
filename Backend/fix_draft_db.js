import { sequelize } from './models/index.js';

async function fixDraftDB() {
    try {
        await sequelize.authenticate();
        console.log('Connected to DB. Altering calculator_drafts table...');
        
        await sequelize.query("ALTER TABLE calculator_drafts ADD COLUMN calculation_mode VARCHAR(50) DEFAULT 'highest';");
        await sequelize.query("ALTER TABLE calculator_drafts ADD COLUMN custom_price DECIMAL(10,2) DEFAULT NULL;");
        
        console.log('Altered table successfully.');
    } catch (e) {
        console.error('Error altering table (maybe columns already exist):', e.message);
    } finally {
        await sequelize.close();
    }
}

fixDraftDB();
