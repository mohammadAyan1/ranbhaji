import { sequelize } from './confiq/db.js';

async function run() {
    try {
        console.log("Adding photo_url column to wallet_transactions...");
        await sequelize.query("ALTER TABLE wallet_transactions ADD COLUMN photo_url VARCHAR(255) DEFAULT NULL;");
        console.log("Column added successfully!");
        process.exit(0);
    } catch (error) {
        console.error("Error adding column:", error.message);
        // If column exists, it will throw an error, which is fine to ignore.
        process.exit(0);
    }
}

run();
