import { sequelize } from "./confiq/db.js";
import { DataTypes } from 'sequelize';

async function run() {
    try {
        await sequelize.authenticate();
        console.log("Connected to DB");

        const queryInterface = sequelize.getQueryInterface();

        // 1. Modify User role ENUM
        try {
            await sequelize.query("ALTER TABLE users MODIFY COLUMN role ENUM('admin', 'user', 'delivery', 'salesman') DEFAULT 'user'");
            console.log("Modified role ENUM in users table");
        } catch (e) {
            console.log("Error modifying role ENUM:", e.message);
        }

        // 2. Add columns to users
        try {
            await queryInterface.addColumn('users', 'referral_code', {
                type: DataTypes.STRING(20),
                allowNull: true,
                unique: true
            });
            console.log("Added referral_code to users");
        } catch (e) {
            if (e.message.includes("Duplicate column name")) console.log("referral_code already exists");
            else console.log(e);
        }

        try {
            await queryInterface.addColumn('users', 'total_free_servings', {
                type: DataTypes.INTEGER,
                defaultValue: 0
            });
            console.log("Added total_free_servings to users");
        } catch (e) {
            if (e.message.includes("Duplicate column name")) console.log("total_free_servings already exists");
            else console.log(e);
        }

        // 3. Add column to subscriptions
        try {
            await queryInterface.addColumn('subscriptions', 'free_servings_awarded', {
                type: DataTypes.INTEGER,
                defaultValue: 0
            });
            console.log("Added free_servings_awarded to subscriptions");
        } catch (e) {
            if (e.message.includes("Duplicate column name")) console.log("free_servings_awarded already exists");
            else console.log(e);
        }

        // 4. Create ReferralLog table
        try {
            await queryInterface.createTable('referral_logs', {
                id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
                referrer_id: { type: DataTypes.INTEGER, allowNull: true },
                referred_user_id: { type: DataTypes.INTEGER, allowNull: false },
                is_salesman: { type: DataTypes.BOOLEAN, defaultValue: false },
                awarded_free_serving: { type: DataTypes.BOOLEAN, defaultValue: false },
                subscription_id: { type: DataTypes.INTEGER, allowNull: true },
                created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: sequelize.literal('CURRENT_TIMESTAMP') },
                updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP') }
            });
            console.log("Created referral_logs table");
        } catch (e) {
            if (e.message.includes("already exists")) console.log("referral_logs table already exists");
            else console.log("Error creating table", e);
        }

        console.log("Migration complete");
    } catch (error) {
        console.error("Migration failed:", error);
    }
    process.exit(0);
}

run();
