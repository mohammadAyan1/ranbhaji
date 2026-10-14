import { sequelize } from '../confiq/db.js';

async function addColumns() {
    try {
        console.log("Checking and adding columns if not exist...");

        // 1. package_fixed_items -> purchase_price_per_gm
        const [fixedCols] = await sequelize.query("SHOW COLUMNS FROM package_fixed_items LIKE 'purchase_price_per_gm'");
        if (fixedCols.length === 0) {
            await sequelize.query("ALTER TABLE package_fixed_items ADD COLUMN purchase_price_per_gm DECIMAL(10, 4) NULL DEFAULT NULL;");
            console.log("✅ Added purchase_price_per_gm to package_fixed_items");
        } else {
            console.log("ℹ️ purchase_price_per_gm already exists in package_fixed_items");
        }

        // 2. package_seasonal_pool -> purchase_price_per_gm
        const [poolCols] = await sequelize.query("SHOW COLUMNS FROM package_seasonal_pool LIKE 'purchase_price_per_gm'");
        if (poolCols.length === 0) {
            await sequelize.query("ALTER TABLE package_seasonal_pool ADD COLUMN purchase_price_per_gm DECIMAL(10, 4) NULL DEFAULT NULL;");
            console.log("✅ Added purchase_price_per_gm to package_seasonal_pool");
        } else {
            console.log("ℹ️ purchase_price_per_gm already exists in package_seasonal_pool");
        }

        // 3. calculator_draft_items -> purchase_price_per_gm
        const [draftCols] = await sequelize.query("SHOW COLUMNS FROM calculator_draft_items LIKE 'purchase_price_per_gm'");
        if (draftCols.length === 0) {
            await sequelize.query("ALTER TABLE calculator_draft_items ADD COLUMN purchase_price_per_gm DECIMAL(10, 4) NULL DEFAULT NULL;");
            console.log("✅ Added purchase_price_per_gm to calculator_draft_items");
        } else {
            console.log("ℹ️ purchase_price_per_gm already exists in calculator_draft_items");
        }

        console.log("🚀 All columns checked/added successfully!");
        process.exit(0);
    } catch (error) {
        console.error("❌ Migration failed:", error);
        process.exit(1);
    }
}

addColumns();
