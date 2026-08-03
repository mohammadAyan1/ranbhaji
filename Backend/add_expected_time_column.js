import { sequelize } from './confiq/db.js';

const addExpectedTimeColumn = async () => {
    try {
        await sequelize.query('ALTER TABLE batch_processing_logs ADD COLUMN expected_time_taken_minutes DECIMAL(10, 2) NULL DEFAULT 0;');
        console.log('Column expected_time_taken_minutes added successfully.');
    } catch (error) {
        console.error('Error adding column:', error);
    } finally {
        process.exit();
    }
};

addExpectedTimeColumn();
