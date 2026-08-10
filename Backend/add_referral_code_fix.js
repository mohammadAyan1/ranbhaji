import { sequelize } from "./confiq/db.js";
import { DataTypes } from 'sequelize';

async function run() {
    try {
        await sequelize.authenticate();
        console.log("Connected to DB");
        const queryInterface = sequelize.getQueryInterface();

        try {
            await queryInterface.addColumn('users', 'referral_code', {
                type: DataTypes.STRING(20),
                allowNull: true
                // No unique constraint to avoid 64 keys limit
            });
            console.log("Added referral_code to users without unique constraint");
        } catch (e) {
            if (e.message.includes("Duplicate column name")) console.log("referral_code already exists");
            else console.log(e);
        }
        
    } catch (error) {
        console.error("Migration failed:", error);
    }
    process.exit(0);
}

run();
