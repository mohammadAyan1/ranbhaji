import { sequelize } from '../confiq/db.js';

async function main() {
  try {
    await sequelize.authenticate();
    const [cols] = await sequelize.query("SHOW COLUMNS FROM retail_orders LIKE 'delivery_time_slot'");
    if (cols.length === 0) {
      await sequelize.query("ALTER TABLE retail_orders ADD COLUMN delivery_time_slot VARCHAR(100) DEFAULT NULL");
      console.log('Added delivery_time_slot to retail_orders');
    } else {
      console.log('delivery_time_slot already exists on retail_orders');
    }
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

main();
