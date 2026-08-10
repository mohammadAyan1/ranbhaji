import { sequelize } from './confiq/db.js';

const fixDB = async () => {
    try {
        await sequelize.authenticate();
        console.log("Connected to DB.");

        const alterQueries = [
            "ALTER TABLE products ADD COLUMN plan_weight_g DECIMAL(10, 2) DEFAULT 500;",
            "ALTER TABLE products ADD COLUMN soak_time_min DECIMAL(10, 2) DEFAULT 0;",
            "ALTER TABLE products ADD COLUMN weigh_time_min DECIMAL(10, 2) DEFAULT 0;",
            "ALTER TABLE products ADD COLUMN is_piece_based BOOLEAN DEFAULT 1;",
            "ALTER TABLE products ADD COLUMN pieces_per_25g DECIMAL(10, 2) DEFAULT 0;",
            "ALTER TABLE products ADD COLUMN clean_cut_time_per_piece_min DECIMAL(10, 2) DEFAULT 0;",
            "ALTER TABLE products ADD COLUMN clean_cut_time_per_25g_min DECIMAL(10, 2) DEFAULT 0;",
            "ALTER TABLE products ADD COLUMN dry_cycle_time_min DECIMAL(10, 2) DEFAULT 0;",
            "ALTER TABLE products ADD COLUMN dry_capacity_kg_per_load DECIMAL(10, 2) DEFAULT 5;",
            "ALTER TABLE products ADD COLUMN dry_machine_count INT DEFAULT 1;",
            "ALTER TABLE products ADD COLUMN wrap_time_per_plan_min DECIMAL(10, 2) DEFAULT 0;",
            "ALTER TABLE products ADD COLUMN pack_time_per_plan_min DECIMAL(10, 2) DEFAULT 0;"
        ];

        for (const query of alterQueries) {
            try {
                await sequelize.query(query);
                console.log(`Executed: ${query}`);
            } catch (err) {
                console.log(`Skipped or failed (might already exist): ${query} - ${err.message}`);
            }
        }

        // Also we need to sync the other new tables if they failed
        // Since we removed { alter: true } from index.js, new tables will still be created by sync() safely
        // But let's just make sure
        const { ProductionBatch, BatchSplit, SplitWorkerAssignment, WorkerAttendance } = await import('./models/index.js');
        await ProductionBatch.sync();
        await BatchSplit.sync();
        await SplitWorkerAssignment.sync();
        await WorkerAttendance.sync();
        console.log("New tables synced manually.");

        console.log("Done fixing DB.");
        process.exit(0);
    } catch (err) {
        console.error("Error:", err);
        process.exit(1);
    }
};

fixDB();
