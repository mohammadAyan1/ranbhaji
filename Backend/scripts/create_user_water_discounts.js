import { sequelize } from '../confiq/db.js';

(async () => {
  try {
    await sequelize.authenticate();
    console.log("Connected to DB.");

    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS user_water_discounts (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        bottles_count INT NOT NULL,
        discount_percentage DECIMAL(5, 2) NOT NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY uq_user_bottles (user_id, bottles_count),
        CONSTRAINT fk_uwd_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
    console.log("Created user_water_discounts table successfully.");

    const columnsToAdd = [
      { name: 'discount_percentage', type: 'DECIMAL(5, 2) DEFAULT 0' },
      { name: 'discount_amount', type: 'DECIMAL(10, 2) DEFAULT 0' },
      { name: 'final_amount', type: 'DECIMAL(10, 2) NULL' },
      { name: 'per_delivery_amount', type: 'DECIMAL(10, 2) NULL' }
    ];

    for (const col of columnsToAdd) {
      try {
        await sequelize.query(`ALTER TABLE water_subscriptions ADD COLUMN ${col.name} ${col.type};`);
        console.log(`Added column ${col.name} to water_subscriptions.`);
      } catch (err) {
        if (err.original && (err.original.code === 'ER_DUP_FIELDNAME' || err.original.errno === 1060)) {
          console.log(`Column ${col.name} already exists.`);
        } else {
          console.error(`Error adding column ${col.name}:`, err.message);
        }
      }
    }

    console.log("Migration complete!");
    process.exit(0);
  } catch (error) {
    console.error("Migration failed:", error);
    process.exit(1);
  }
})();
