import fs from 'fs';
import { sequelize, Product } from './models/index.js';

// Function to parse a simple CSV
function parseCSV(filePath) {
    const data = fs.readFileSync(filePath, 'utf8');
    const lines = data.split('\n').filter(l => l.trim() !== '');
    
    // We assume the first line is the header
    const headers = lines[0].split(',').map(h => h.trim());
    
    const results = [];
    for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(v => v.trim());
        const obj = {};
        for (let j = 0; j < headers.length; j++) {
            obj[headers[j]] = values[j];
        }
        results.push(obj);
    }
    
    return results;
}

async function insertData() {
    try {
        await sequelize.authenticate();
        console.log('Connected to DB...');
        
        const products = parseCSV('actual_data.csv');
        
        for (const row of products) {
            const name = row['Product Name'];
            if (!name) continue;

            const hindi_name = row['Hindi Name'];
            const category = row['Category'];
            const sub_category = row['Sub Category'];
            const pricePerKg = parseFloat(row['Average Cost Price Per Kg']) || 0;
            const margin = parseFloat(row['Retail Margin Percentage']) || 0;
            const unitStr = row['Unit'];
            const minQty = parseFloat(row['Min Retail Quantity']) || 0;
            const weighTime = parseInt(row['Weighing Time (seconds)']) || 0;
            const soakTime = parseInt(row['Soaking Time (seconds)']) || 0;
            const cutTimePiece = parseInt(row['Cutting Time - Per Piece (seconds)']) || 0;
            const cutTime25g = parseInt(row['Cutting Time - Per 25g (seconds)']) || 0;
            const piecesIn25g = parseFloat(row['Pieces in 25 gm']) || 0;
            
            const dryingMachineSec = parseInt(row['Drying Time - Machine (seconds)']) || 0;
            const dryingPieceSec = parseInt(row['Drying Time - Per Piece (seconds)']) || 0;
            const drying25gSec = parseInt(row['Drying Time - Per 25g (seconds)']) || 0;

            // Conversion logic for drying time
            let finalDryingTimeSeconds = 0;
            
            // If the machine time per piece is given, and we have pieces in 25g
            if (dryingMachineSec > 0 && piecesIn25g > 0) {
                // 1 piece weight = 25 / piecesIn25g
                const onePieceWeightGrams = 25 / piecesIn25g;
                
                // Total pieces in 1000g (1kg)
                const piecesPerKg = 1000 / onePieceWeightGrams;
                
                // Time for 1 kg
                finalDryingTimeSeconds = Math.round(dryingMachineSec * piecesPerKg);
            }

            const purchasePriceGm = pricePerKg / 1000;

            // Prepare the payload based on model fields
            const payload = {
                name,
                hindi_name,
                category,
                sub_category,
                unit: unitStr,
                min_retail_qty: minQty,
                purchase_price_per_gm: purchasePriceGm,
                default_margin_percentage: margin,
                weighing_time_seconds: weighTime,
                soaking_time_seconds: soakTime,
                time_per_piece_seconds: cutTimePiece,
                time_per_25g_seconds: cutTime25g,
                pieces_per_25g: piecesIn25g,
                drying_time_per_piece_seconds: dryingPieceSec,
                drying_time_per_25g_seconds: drying25gSec,
                drying_time_seconds: finalDryingTimeSeconds || dryingMachineSec // fallback if not converted
            };

            // Check if product exists
            let product = await Product.findOne({ where: { name } });
            if (product) {
                await product.update(payload);
                console.log(`Updated product: ${name}`);
            } else {
                await Product.create(payload);
                console.log(`Created product: ${name}`);
            }
        }
        
        console.log('Data insertion complete.');
    } catch (err) {
        console.error('Error inserting data:', err);
    } finally {
        await sequelize.close();
    }
}

insertData();
