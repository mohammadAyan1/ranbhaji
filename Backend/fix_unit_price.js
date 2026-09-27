import { sequelize, Product, Unit } from './models/index.js';

async function fixUnitPrice() {
    try {
        await sequelize.authenticate();
        console.log('Connected to DB. Fixing unit and selling prices...');
        
        const products = await Product.findAll();

        for (let p of products) {
            let changes = {};

            // 1. Fix unit string
            if (p.unit && p.unit.toLowerCase() === 'grams') {
                changes.unit = 'gm';
            } else if (p.unit && p.unit.toLowerCase() === 'box') {
                changes.unit = 'box'; // Frontend might prefer lowercase box
            }

            // 2. Fix selling_price_per_gm
            // According to frontend calculation: Margin% = (selling / purchase) * 100
            // So selling = purchase * (margin / 100)
            const margin = parseFloat(p.default_margin_percentage) || 100; // default 100 if null
            const purchase = parseFloat(p.purchase_price_per_gm) || 0;

            const selling = purchase * (margin / 100);
            
            changes.selling_price_per_gm = selling;
            changes.default_margin_percentage = margin;

            await p.update(changes);
            console.log(`Updated ${p.name}: unit=${changes.unit || p.unit}, purchase=${purchase}, selling=${selling}, margin=${margin}%`);
        }
        
        console.log('All products updated successfully.');
    } catch (err) {
        console.error('Error fixing products:', err);
    } finally {
        await sequelize.close();
    }
}

fixUnitPrice();
