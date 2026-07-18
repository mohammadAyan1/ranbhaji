import { sequelize } from './confiq/db.js';
import { DataTypes } from 'sequelize';

async function alterTable() {
    try {
        const queryInterface = sequelize.getQueryInterface();
        await queryInterface.addColumn('delivery_items', 'returned_by', {
            type: DataTypes.ENUM('user', 'admin', 'delivery_boy'),
            allowNull: true,
            defaultValue: 'user'
        });
        console.log("Successfully added returned_by to delivery_items table.");
    } catch (error) {
        console.error("Error altering table:", error);
    } finally {
        await sequelize.close();
    }
}

alterTable();
