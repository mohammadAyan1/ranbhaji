import { sequelize } from './models/index.js';

async function fixDB() {
    try {
        await sequelize.authenticate();
        console.log('Connected. Altering table...');
        await sequelize.query("ALTER TABLE products MODIFY category VARCHAR(255);");
        await sequelize.query("ALTER TABLE products MODIFY sub_category VARCHAR(255);");
        console.log('Altered table successfully.');
    } catch (e) {
        console.error(e);
    } finally {
        await sequelize.close();
    }
}

fixDB();
