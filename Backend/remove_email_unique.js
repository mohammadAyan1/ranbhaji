import { sequelize } from './models/index.js';

async function removeEmailUnique() {
    try {
        await sequelize.authenticate();
        console.log('Connected to DB. Removing unique constraint from users.email...');
        
        // Find index name
        const [results] = await sequelize.query(`
            SELECT INDEX_NAME 
            FROM INFORMATION_SCHEMA.STATISTICS 
            WHERE TABLE_SCHEMA = DATABASE() 
              AND TABLE_NAME = 'users' 
              AND COLUMN_NAME = 'email' 
              AND NON_UNIQUE = 0;
        `);

        if (results.length > 0) {
            for (let row of results) {
                if (row.INDEX_NAME !== 'PRIMARY') {
                    console.log(`Dropping index: ${row.INDEX_NAME}`);
                    await sequelize.query(`ALTER TABLE users DROP INDEX \`${row.INDEX_NAME}\`;`);
                }
            }
            console.log('Successfully removed unique constraint(s).');
        } else {
            console.log('No unique constraint found for email column in users table.');
        }

    } catch (e) {
        console.error('Error:', e.message);
    } finally {
        await sequelize.close();
    }
}

removeEmailUnique();
