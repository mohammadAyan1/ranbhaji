import { sequelize } from './models/index.js';
(async () => {
  try {
    await sequelize.query('ALTER TABLE products ADD COLUMN discount_percentage DECIMAL(5,2) DEFAULT 0;');
    console.log("Successfully added discount_percentage to products table.");
  } catch (error) {
    if (error.original && error.original.code === 'ER_DUP_FIELDNAME') {
      console.log("Column already exists.");
    } else {
      console.error("Error adding column:", error);
    }
  }
  process.exit(0);
})();
