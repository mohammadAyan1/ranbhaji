import { sequelize } from './confiq/db.js';

async function addColumn() {
  try {
    await sequelize.authenticate();
    console.log('Connection has been established successfully.');
    
    // Check if column exists, if not add it
    await sequelize.query('ALTER TABLE `users` ADD COLUMN `delivery_profile` JSON NULL;');
    console.log('Column delivery_profile added to users table');
  } catch (error) {
    if (error.original && error.original.code === 'ER_DUP_FIELDNAME') {
       console.log('Column already exists');
    } else {
       console.error('Unable to connect to the database or add column:', error);
    }
  } finally {
    process.exit(0);
  }
}

addColumn();
