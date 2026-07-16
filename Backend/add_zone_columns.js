import { connectDB, sequelize } from "./confiq/db.js";
import { DataTypes } from 'sequelize';

async function run() {
    await connectDB();
    try {
        await sequelize.getQueryInterface().addColumn('users', 'delivery_zones', {
            type: DataTypes.JSON,
            allowNull: true
        });
        console.log("Added delivery_zones to users");
    } catch (e) {
        if (!e.message.includes("Duplicate column name")) console.error(e);
    }
    try {
        await sequelize.getQueryInterface().addColumn('users', 'last_assigned_at', {
            type: DataTypes.DATE,
            allowNull: true
        });
        console.log("Added last_assigned_at to users");
    } catch (e) {
        if (!e.message.includes("Duplicate column name")) console.error(e);
    }
    try {
        await sequelize.getQueryInterface().addColumn('addresses', 'zone', {
            type: DataTypes.STRING(100),
            allowNull: true
        });
        console.log("Added zone to addresses");
    } catch (e) {
        if (!e.message.includes("Duplicate column name")) console.error(e);
    }
    process.exit(0);
}
run();
