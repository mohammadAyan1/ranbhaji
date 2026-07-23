import dotenv from 'dotenv';
dotenv.config();

import { sequelize, Product, Unit, User } from './models/index.js';

async function migrate() {
    try {
        console.log("Syncing database models...");
        // Alter tables to add new columns if they don't exist
        await sequelize.sync({ alter: true });
        console.log("Database models synced.");

        console.log("Migrating units...");
        const products = await Product.findAll();

        for (const product of products) {
            if (product.unit && !product.unit_id) {
                // Find or create the unit
                let unitName = product.unit.toLowerCase();
                let abbreviation = unitName;
                if (unitName === 'gm') { unitName = 'Gram'; abbreviation = 'gm'; }
                if (unitName === 'ml') { unitName = 'Milliliter'; abbreviation = 'ml'; }
                if (unitName === 'piece') { unitName = 'Piece'; abbreviation = 'pc'; }

                let [unitRecord] = await Unit.findOrCreate({
                    where: { abbreviation },
                    defaults: { name: unitName, abbreviation }
                });

                // Update product with unit_id
                await product.update({ unit_id: unitRecord.id });
                console.log(`Migrated product ${product.id} to unit_id ${unitRecord.id} (${unitRecord.abbreviation})`);
            }
        }
        console.log("Migration completed successfully.");
    } catch (error) {
        console.error("Migration failed:", error);
    } finally {
        process.exit(0);
    }
}

migrate();
