import { sequelize, Product } from './models/index.js';

async function fixPieceBased() {
    try {
        await sequelize.authenticate();
        console.log('Connected to DB. Fixing is_piece_based and cutting_mode...');
        
        const products = await Product.findAll();

        for (let p of products) {
            let isPiece = true;
            let cutMode = 'PER_PIECE';

            // Check the time fields to determine mode
            // If there's a time per 25g, it means it's measured in grams (25g batches)
            if (p.time_per_25g_seconds > 0) {
                isPiece = false;
                cutMode = 'PER_25G';
            } else if (p.time_per_piece_seconds > 0) {
                isPiece = true;
                cutMode = 'PER_PIECE';
            } else {
                // If both are 0, infer from pieces_per_25g
                // If pieces_per_25g is 0, it's likely a bulk/gram item like Garlic/Arbi
                if (parseFloat(p.pieces_per_25g) === 0) {
                    isPiece = false;
                    cutMode = 'PER_25G';
                } else {
                    isPiece = true;
                    cutMode = 'PER_PIECE';
                }
            }

            await p.update({
                is_piece_based: isPiece,
                cutting_mode: cutMode
            });
            console.log(`Updated ${p.name}: is_piece_based=${isPiece}, cutting_mode=${cutMode}`);
        }
        
        console.log('All products updated successfully.');
    } catch (err) {
        console.error('Error fixing products:', err);
    } finally {
        await sequelize.close();
    }
}

fixPieceBased();
