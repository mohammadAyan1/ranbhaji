import { sequelize } from './models/index.js';
import { DataTypes } from 'sequelize';

async function addImageColumn() {
    try {
        await sequelize.authenticate();
        console.log('Connection has been established successfully.');

        await sequelize.getQueryInterface().addColumn('packages', 'image_url', {
            type: DataTypes.STRING(255),
            allowNull: true
        });

        console.log('Added image_url column to packages table successfully.');
        process.exit(0);
    } catch (error) {
        console.error('Unable to connect to the database or add column:', error);
        process.exit(1);
    }
}

addImageColumn();
