import { connectDB, sequelize } from "./confiq/db.js";
import { DataTypes } from 'sequelize';

async function run() {
    await connectDB();
    try {
        await sequelize.getQueryInterface().addColumn('packages', 'target_mobile_number', {
            type: DataTypes.STRING(15),
            allowNull: true
        });
        console.log("Column added successfully");
    } catch (e) {
        if (e.message.includes("Duplicate column name")) {
            console.log("Column already exists");
        } else {
            console.error(e);
        }
    }
    process.exit(0);
}
run();
