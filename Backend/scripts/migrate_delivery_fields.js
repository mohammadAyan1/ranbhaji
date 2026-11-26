import { sequelize } from '../confiq/db.js';

async function migrate() {
    try {
        console.log("Starting migration for delivery fields...");

        // 1. delivery_schedule.status ENUM
        try {
            await sequelize.query("ALTER TABLE delivery_schedule MODIFY COLUMN status ENUM('pending', 'ready_for_delivery', 'delivered', 'skipped', 'returned') DEFAULT 'pending'");
            console.log("✓ delivery_schedule.status modified to include 'returned'");
        } catch (e) {
            console.log("! delivery_schedule.status error:", e.message);
        }

        // 2. delivery_schedule lat / lng
        const [schedCols] = await sequelize.query("SHOW COLUMNS FROM delivery_schedule");
        const schedColNames = schedCols.map(c => c.Field);
        if (!schedColNames.includes('delivery_latitude')) {
            await sequelize.query("ALTER TABLE delivery_schedule ADD COLUMN delivery_latitude DECIMAL(10, 7) NULL");
            console.log("✓ delivery_schedule.delivery_latitude added");
        }
        if (!schedColNames.includes('delivery_longitude')) {
            await sequelize.query("ALTER TABLE delivery_schedule ADD COLUMN delivery_longitude DECIMAL(10, 7) NULL");
            console.log("✓ delivery_schedule.delivery_longitude added");
        }

        // 3. retail_orders.delivery_status ENUM
        try {
            await sequelize.query("ALTER TABLE retail_orders MODIFY COLUMN delivery_status ENUM('pending', 'ready_for_delivery', 'delivered', 'cancelled', 'returned') DEFAULT 'pending'");
            console.log("✓ retail_orders.delivery_status modified to include 'returned'");
        } catch (e) {
            console.log("! retail_orders.delivery_status error:", e.message);
        }

        // 4. retail_orders fields
        const [retailCols] = await sequelize.query("SHOW COLUMNS FROM retail_orders");
        const retailColNames = retailCols.map(c => c.Field);
        if (!retailColNames.includes('delivery_photo_url')) {
            await sequelize.query("ALTER TABLE retail_orders ADD COLUMN delivery_photo_url VARCHAR(255) NULL");
            console.log("✓ retail_orders.delivery_photo_url added");
        }
        if (!retailColNames.includes('delivery_remark')) {
            await sequelize.query("ALTER TABLE retail_orders ADD COLUMN delivery_remark VARCHAR(255) NULL");
            console.log("✓ retail_orders.delivery_remark added");
        }
        if (!retailColNames.includes('actual_delivery_date')) {
            await sequelize.query("ALTER TABLE retail_orders ADD COLUMN actual_delivery_date DATE NULL");
            console.log("✓ retail_orders.actual_delivery_date added");
        }
        if (!retailColNames.includes('delivery_latitude')) {
            await sequelize.query("ALTER TABLE retail_orders ADD COLUMN delivery_latitude DECIMAL(10, 7) NULL");
            console.log("✓ retail_orders.delivery_latitude added");
        }
        if (!retailColNames.includes('delivery_longitude')) {
            await sequelize.query("ALTER TABLE retail_orders ADD COLUMN delivery_longitude DECIMAL(10, 7) NULL");
            console.log("✓ retail_orders.delivery_longitude added");
        }

        console.log("Migration completed successfully!");
        process.exit(0);
    } catch (err) {
        console.error("Migration failed:", err);
        process.exit(1);
    }
}

migrate();
