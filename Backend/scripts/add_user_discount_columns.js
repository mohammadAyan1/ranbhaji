import { sequelize } from '../models/index.js';

(async () => {
  try {
    // 1. Add discount_percentage to users table
    try {
      await sequelize.query('ALTER TABLE users ADD COLUMN discount_percentage DECIMAL(5,2) DEFAULT 0;');
      console.log("Successfully added discount_percentage to users table.");
    } catch (e) {
      if (e.original && (e.original.code === 'ER_DUP_FIELDNAME' || e.message?.includes('duplicate column'))) {
        console.log("discount_percentage already exists on users table.");
      } else {
        console.warn("Notice for users.discount_percentage:", e.message);
      }
    }

    // 2. Add discount_percent to retail_orders table
    try {
      await sequelize.query('ALTER TABLE retail_orders ADD COLUMN discount_percent DECIMAL(5,2) DEFAULT 0;');
      console.log("Successfully added discount_percent to retail_orders table.");
    } catch (e) {
      if (e.original && (e.original.code === 'ER_DUP_FIELDNAME' || e.message?.includes('duplicate column'))) {
        console.log("discount_percent already exists on retail_orders table.");
      } else {
        console.warn("Notice for retail_orders.discount_percent:", e.message);
      }
    }

    // 3. Add discount_amount to retail_orders table
    try {
      await sequelize.query('ALTER TABLE retail_orders ADD COLUMN discount_amount DECIMAL(10,2) DEFAULT 0;');
      console.log("Successfully added discount_amount to retail_orders table.");
    } catch (e) {
      if (e.original && (e.original.code === 'ER_DUP_FIELDNAME' || e.message?.includes('duplicate column'))) {
        console.log("discount_amount already exists on retail_orders table.");
      } else {
        console.warn("Notice for retail_orders.discount_amount:", e.message);
      }
    }

    // 4. Add subtotal to retail_orders table
    try {
      await sequelize.query('ALTER TABLE retail_orders ADD COLUMN subtotal DECIMAL(10,2) DEFAULT NULL;');
      console.log("Successfully added subtotal to retail_orders table.");
    } catch (e) {
      if (e.original && (e.original.code === 'ER_DUP_FIELDNAME' || e.message?.includes('duplicate column'))) {
        console.log("subtotal already exists on retail_orders table.");
      } else {
        console.warn("Notice for retail_orders.subtotal:", e.message);
      }
    }

    console.log("Migration complete!");
    process.exit(0);
  } catch (error) {
    console.error("Migration failed:", error);
    process.exit(1);
  }
})();
