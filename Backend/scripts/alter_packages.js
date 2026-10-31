import { sequelize } from '../confiq/db.js';

async function main() {
  try {
    await sequelize.authenticate();
    console.log('DB connected');

    const sql = "ALTER TABLE packages MODIFY COLUMN type ENUM('standard', 'custom', 'yearly', 'sample') DEFAULT NULL";
    await sequelize.query(sql);
    console.log('ALTER TABLE packages executed successfully!');

    const [cols] = await sequelize.query("SHOW COLUMNS FROM packages LIKE 'type'");
    console.log('Current column definition:', cols);

    process.exit(0);
  } catch (err) {
    console.error('Error altering table:', err);
    process.exit(1);
  }
}

main();

