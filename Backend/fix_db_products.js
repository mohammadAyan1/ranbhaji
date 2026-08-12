import { connectDB, sequelize } from "./confiq/db.js";

const updateDB = async () => {
    try {
        await connectDB();
        
        console.log("Altering products table...");
        
        const queries = [
            "ALTER TABLE products ADD COLUMN weighing_time_seconds INT DEFAULT 0;",
            "ALTER TABLE products ADD COLUMN soaking_time_seconds INT DEFAULT 0;",
            "ALTER TABLE products ADD COLUMN cutting_mode ENUM('PER_PIECE', 'PER_25G') DEFAULT 'PER_25G';",
            "ALTER TABLE products ADD COLUMN pieces_per_25g DECIMAL(10,2);",
            "ALTER TABLE products ADD COLUMN time_per_piece_seconds INT;",
            "ALTER TABLE products ADD COLUMN time_per_25g_seconds INT;",
            "ALTER TABLE products ADD COLUMN drying_time_seconds INT DEFAULT 0;"
        ];

        for (let q of queries) {
            try {
                await sequelize.query(q);
                console.log(`Success: ${q}`);
            } catch (err) {
                console.log(`Skipped or Error (might already exist): ${err.message}`);
            }
        }
        
        // Also force sync to ensure new tables are created if not already
        await sequelize.sync();
        console.log("Database sync complete.");

        process.exit(0);
    } catch (error) {
        console.error("Error updating DB:", error);
        process.exit(1);
    }
};

updateDB();
