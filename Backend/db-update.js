const { Sequelize, DataTypes } = require('sequelize');
require('dotenv').config();

const sequelize = new Sequelize(
    process.env.DB_NAME,
    process.env.DB_USER,
    process.env.DB_PASSWORD,
    {
        host: process.env.DB_HOST,
        dialect: 'mysql',
        port: process.env.DB_PORT || 3306,
        logging: console.log
    }
);

async function runUpdates() {
    try {
        await sequelize.authenticate();
        console.log('Connected to DB. Running updates...');
        
        // 1. Create ReturnedProductLog table
        await sequelize.query(\
            CREATE TABLE IF NOT EXISTS returned_product_logs (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL,
                product_id INT NOT NULL,
                returned_date DATE NOT NULL,
                returned_qty DECIMAL(10,2) NOT NULL,
                next_schedule_date DATE NOT NULL,
                createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            );
        \);
        console.log('? returned_product_logs table ensured.');

        // 2. Add is_returned_serving column safely
        try {
            await sequelize.query('ALTER TABLE delivery_schedule ADD COLUMN is_returned_serving BOOLEAN DEFAULT false;');
            console.log('? Added is_returned_serving to delivery_schedule.');
        } catch (err) {
            if (err.message.includes('Duplicate column name')) {
                console.log('? is_returned_serving already exists in delivery_schedule.');
            } else {
                throw err;
            }
        }

        console.log('\\n?? All live DB updates applied successfully!');
    } catch (error) {
        console.error('? Error updating DB:', error.message);
    } finally {
        await sequelize.close();
    }
}

runUpdates();

