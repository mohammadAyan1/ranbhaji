import { sequelize } from './confiq/db.js';
import { DataTypes } from 'sequelize';

async function updateBatchProcessingLog() {
    try {
        await sequelize.authenticate();
        console.log('Connection has been established successfully.');

        const queryInterface = sequelize.getQueryInterface();

        // Check if columns already exist to avoid errors
        const tableDescription = await queryInterface.describeTable('batch_processing_logs');

        if (!tableDescription.process_type) {
            await queryInterface.addColumn('batch_processing_logs', 'process_type', {
                type: DataTypes.STRING(50),
                allowNull: true,
                defaultValue: 'soaking' // default to something if it was old data
            });
            console.log('Added process_type column.');
        } else {
            console.log('process_type column already exists.');
        }

        if (!tableDescription.time_taken_minutes) {
            await queryInterface.addColumn('batch_processing_logs', 'time_taken_minutes', {
                type: DataTypes.DECIMAL(10, 2),
                allowNull: true,
                defaultValue: 0
            });
            console.log('Added time_taken_minutes column.');
        } else {
            console.log('time_taken_minutes column already exists.');
        }

        console.log('Migration completed successfully.');
    } catch (error) {
        console.error('Unable to update the database:', error);
    } finally {
        await sequelize.close();
    }
}

updateBatchProcessingLog();
