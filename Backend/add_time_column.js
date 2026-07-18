import { sequelize } from './confiq/db.js';
import { DataTypes } from 'sequelize';

async function alterTable() {
    try {
        const queryInterface = sequelize.getQueryInterface();
        await queryInterface.addColumn('products', 'preparation_time', {
            type: DataTypes.DECIMAL(10, 2),
            allowNull: true
        });
        console.log("Successfully added preparation_time to products table.");
    } catch (error) {
        console.error("Error altering table:", error);
    } finally {
        await sequelize.close();
    }
}

alterTable();
