import { connectDB, sequelize } from "./confiq/db.js";
import { DataTypes } from 'sequelize';

async function run() {
    await connectDB();
    try {
        await sequelize.getQueryInterface().addColumn('users', 'postpaid_debt', {
            type: DataTypes.DECIMAL(10, 2),
            defaultValue: 0
        });
        console.log("Added postpaid_debt to users");
    } catch (e) {
        if (!e.message.includes("Duplicate column name")) console.error(e);
    }
    try {
        await sequelize.getQueryInterface().addColumn('subscriptions', 'renewal_count', {
            type: DataTypes.INTEGER,
            defaultValue: 1
        });
        console.log("Added renewal_count to subscriptions");
    } catch (e) {
        if (!e.message.includes("Duplicate column name")) console.error(e);
    }
    try {
        await sequelize.getQueryInterface().addColumn('subscriptions', 'locked_price', {
            type: DataTypes.DECIMAL(10, 2),
            allowNull: true
        });
        console.log("Added locked_price to subscriptions");
    } catch (e) {
        if (!e.message.includes("Duplicate column name")) console.error(e);
    }
    try {
        await sequelize.getQueryInterface().addColumn('subscriptions', 'postpaid_serving_given', {
            type: DataTypes.BOOLEAN,
            defaultValue: false
        });
        console.log("Added postpaid_serving_given to subscriptions");
    } catch (e) {
        if (!e.message.includes("Duplicate column name")) console.error(e);
    }
    process.exit(0);
}
run();
