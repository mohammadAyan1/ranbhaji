import { sequelize } from './confiq/db.js';

(async () => {
    try {
        console.log("Checking products table schema...");
        const [columns] = await sequelize.query("SHOW COLUMNS FROM products");
        const columnNames = columns.map(c => c.Field);

        if (!columnNames.includes('waste_percentage')) {
            console.log("Adding waste_percentage column...");
            await sequelize.query("ALTER TABLE products ADD COLUMN waste_percentage DECIMAL(5,2) DEFAULT 0");
            console.log("✅ Added waste_percentage successfully.");
        } else {
            console.log("ℹ️ waste_percentage already exists.");
        }

        if (!columnNames.includes('closing_stock_usable_percentage')) {
            console.log("Adding closing_stock_usable_percentage column...");
            await sequelize.query("ALTER TABLE products ADD COLUMN closing_stock_usable_percentage DECIMAL(5,2) DEFAULT 100");
            console.log("✅ Added closing_stock_usable_percentage successfully.");
        } else {
            console.log("ℹ️ closing_stock_usable_percentage already exists.");
        }

        console.log("\n🎉 Database migration complete! All columns verified.");
        process.exit(0);
    } catch (err) {
        console.error("❌ Migration error:", err.message);
        process.exit(1);
    }
})();
