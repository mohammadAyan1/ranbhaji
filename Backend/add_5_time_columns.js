import { sequelize } from './confiq/db.js';

async function run() {
    try {
        console.log("Adding new time columns to products table...");
        const queryInterface = sequelize.getQueryInterface();
        
        await queryInterface.addColumn('products', 'soaking_time', {
            type: sequelize.Sequelize.DECIMAL(10, 2),
            allowNull: true,
            defaultValue: 0
        });
        
        await queryInterface.addColumn('products', 'cleaning_time', {
            type: sequelize.Sequelize.DECIMAL(10, 2),
            allowNull: true,
            defaultValue: 0
        });

        await queryInterface.addColumn('products', 'cutting_time', {
            type: sequelize.Sequelize.DECIMAL(10, 2),
            allowNull: true,
            defaultValue: 0
        });

        await queryInterface.addColumn('products', 'drying_time', {
            type: sequelize.Sequelize.DECIMAL(10, 2),
            allowNull: true,
            defaultValue: 0
        });

        await queryInterface.addColumn('products', 'weighting_time', {
            type: sequelize.Sequelize.DECIMAL(10, 2),
            allowNull: true,
            defaultValue: 0
        });

        console.log("Successfully added soaking, cleaning, cutting, drying, weighting times.");
    } catch (err) {
        console.error("Error adding columns:", err);
    } finally {
        process.exit();
    }
}

run();
