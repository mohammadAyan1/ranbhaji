import fs from 'fs';
import { sequelize, Product, Category, SubCategory, Unit } from './models/index.js';

function parseCSV(filePath) {
    const data = fs.readFileSync(filePath, 'utf8');
    const lines = data.split('\n').filter(l => l.trim() !== '');
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

async function fixRelations() {
    try {
        await sequelize.authenticate();
        console.log('Connected to DB. Fixing categories, subcategories, and units...');
        
        const products = parseCSV('actual_data.csv');
        
        // Use Maps to track what we've created/found
        const categoryMap = new Map();
        const subCategoryMap = new Map();
        const unitMap = new Map();

        for (const row of products) {
            const catName = row['Category']?.trim();
            const subCatName = row['Sub Category']?.trim();
            const unitName = row['Unit']?.trim();
            const prodName = row['Product Name']?.trim();

            if (!catName || !prodName) continue;

            // 1. Handle Category
            let categoryId;
            if (!categoryMap.has(catName)) {
                let [cat] = await Category.findOrCreate({
                    where: { name: catName },
                    defaults: { description: catName, status: 'active' }
                });
                categoryId = cat.id;
                categoryMap.set(catName, cat.id);
            } else {
                categoryId = categoryMap.get(catName);
            }

            // 2. Handle SubCategory
            if (subCatName) {
                const subCatKey = `${categoryId}-${subCatName}`;
                if (!subCategoryMap.has(subCatKey)) {
                    await SubCategory.findOrCreate({
                        where: { name: subCatName, category_id: categoryId },
                        defaults: { description: subCatName, status: 'active' }
                    });
                    subCategoryMap.set(subCatKey, true);
                }
            }

            // 3. Handle Unit
            let unitId = null;
            if (unitName) {
                if (!unitMap.has(unitName)) {
                    let [unit] = await Unit.findOrCreate({
                        where: { name: unitName },
                        defaults: { abbreviation: unitName.toLowerCase(), status: 'active' }
                    });
                    unitId = unit.id;
                    unitMap.set(unitName, unit.id);
                } else {
                    unitId = unitMap.get(unitName);
                }
            }

            // 4. Update Product with unit_id
            if (unitId) {
                await Product.update(
                    { unit_id: unitId },
                    { where: { name: prodName } }
                );
            }
        }
        
        console.log('Successfully created Categories, SubCategories, Units and updated Products.');
    } catch (err) {
        console.error('Error fixing relations:', err);
    } finally {
        await sequelize.close();
    }
}

fixRelations();
