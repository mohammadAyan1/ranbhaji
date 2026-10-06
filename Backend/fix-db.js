import { sequelize } from './confiq/db.js';

async function fixDatabase() {
    try {
        await sequelize.authenticate();
        console.log('Database connected...');
        
        // Altering the payment_method enum in retail_orders table
        await sequelize.query("ALTER TABLE retail_orders MODIFY COLUMN payment_method ENUM('cod', 'phonepe', 'wallet') NOT NULL;");
        console.log('Successfully added "wallet" to payment_method ENUM in retail_orders table.');
        
        process.exit(0);
    } catch (error) {
        console.error('Error fixing database:', error);
        process.exit(1);
    }
}

fixDatabase();
