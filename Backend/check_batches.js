import { sequelize } from './confiq/db.js';
import { ProductionBatch, Product } from './models/index.js';

async function check() {
    try {
        const batches = await ProductionBatch.findAll({
            include: [{ model: Product, as: 'product' }]
        });
        console.log(JSON.stringify(batches, null, 2));
    } catch (e) {
        console.error(e);
    } finally {
        process.exit();
    }
}
check();
