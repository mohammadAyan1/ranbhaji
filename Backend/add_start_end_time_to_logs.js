import { sequelize } from './confiq/db.js';

const addColumns = async () => {
    try {
        await sequelize.query('ALTER TABLE batch_processing_logs ADD COLUMN start_time DATETIME NULL;');
        await sequelize.query('ALTER TABLE batch_processing_logs ADD COLUMN end_time DATETIME NULL;');
        console.log('Columns start_time and end_time added successfully.');
    } catch (error) {
        console.error('Error adding columns:', error);
    } finally {
        process.exit();
    }
};

addColumns();
