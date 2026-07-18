import xlsx from 'xlsx';
import path from 'path';
import { fileURLToPath } from 'url';
import { connectDB, sequelize } from '../confiq/db.js';
import {
  User, Address, Subscription, SubscriptionItem, DeliverySchedule,
  Package, PackageFixedItem, Product
} from '../models/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function excelDateToJSDate(excelDate) {
  if (!excelDate) return null;
  // Excel dates are days since 1899-12-30
  // Note: 25569 is the number of days between 1899-12-30 and 1970-01-01
  const date = new Date(Math.round((excelDate - 25569) * 86400 * 1000));
  return date.toISOString().split('T')[0];
}

async function getOrCreateProduct(headerString, transaction) {
  // Example header: "( FIXED VEGETABLE 1) आलू (Aloo) "
  const regex = /\)\s*(.*?)\s*\((.*?)\)/;
  const match = headerString.match(regex);
  
  let hindiName = headerString.trim();
  let englishName = headerString.trim();

  if (match) {
    hindiName = match[1].trim();
    englishName = match[2].trim().toLowerCase();
  }

  // Find by English name (case insensitive)
  let product = await Product.findOne({ where: { name: englishName }, transaction });
  if (!product) {
    // Some manual mappings for common excel headers to db values
    if (englishName.includes('aloo')) englishName = 'potato';
    else if (englishName.includes('pyaz')) englishName = 'onion';
    else if (englishName.includes('tamatar')) englishName = 'tomato';
    else if (englishName.includes('kheera')) englishName = 'cucumber';
    else if (englishName.includes('nimbu')) englishName = 'lemon';
    else if (englishName.includes('lahsun')) englishName = 'garlic';
    else if (englishName.includes('adrak')) englishName = 'ginger';
    else if (englishName.includes('dhaniya')) englishName = 'coriander';
    else if (englishName.includes('hari mirch')) englishName = 'green chilli';

    product = await Product.findOne({ where: { name: englishName }, transaction });
  }

  if (!product) {
    product = await Product.create({
      name: englishName,
      hindi_name: hindiName,
      category: 'vegetable',
      unit: 'gm',
      purchase_price_per_gm: 0.05, // default 50/kg
      selling_price_per_gm: 0.08,  // default 80/kg
      status: 'active'
    }, { transaction });
    console.log(`Created new product: ${englishName} (${hindiName})`);
  }

  return product;
}

async function runImport() {
  await connectDB();
  
  const excelPath = path.join(__dirname, '../../SUBSCRIBER LIST.xlsx');
  console.log(`Reading Excel file: ${excelPath}`);
  
  const workbook = xlsx.readFile(excelPath);
  const sheetName = workbook.SheetNames[0];
  const data = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);

  const t = await sequelize.transaction();

  try {
    for (const row of data) {
      if (!row['NAME'] || !row['MOBILE 1']) continue;

      const mobile = String(row['MOBILE 1']).trim();
      const planName = row['PLAN'] ? String(row['PLAN']).trim() : 'CUSTOM';
      const planCost = parseFloat(row['PLAN COST']) || 0;
      
      console.log(`Processing: ${row['NAME']} (${mobile}) - Plan: ${planName}`);

      // 1. Create or Find User
      let user = await User.findOne({ where: { phone: mobile }, transaction: t });
      if (!user) {
        user = await User.create({
          name: row['NAME'],
          phone: mobile,
          role: 'user',
          status: 'active'
        }, { transaction: t });
      }

      // 2. Create Address
      const address1 = row['ADDRESS1'] || '';
      const address2 = row['ADDRESS2'] || '';
      const pinCode = row['PIN CODE'] || '';
      const addressLine = `${address1}, ${address2}`.replace(/^, | ,$/, '').trim();
      
      let address = await Address.findOne({ where: { user_id: user.id }, transaction: t });
      if (!address && addressLine) {
        address = await Address.create({
          user_id: user.id,
          address_line: addressLine,
          city: 'Bhopal',
          pincode: String(pinCode),
          is_default: true
        }, { transaction: t });
      }

      // 3. Find or Create Package & Calculate Margin
      let pkg = await Package.findOne({ where: { name: planName }, transaction: t });
      
      // Calculate total vegetables cost for the package
      let totalVegCost = 0;
      let fixedItemsData = [];
      let subscriptionItemsData = [];

      for (const key of Object.keys(row)) {
        if (key.includes('FIXED VEGETABLE')) {
          const qty = parseFloat(row[key]);
          if (qty > 0) {
            const product = await getOrCreateProduct(key, t);
            const cost = qty * parseFloat(product.purchase_price_per_gm || 0.05);
            totalVegCost += cost;
            fixedItemsData.push({ product_id: product.id, default_qty_gm: qty });
            subscriptionItemsData.push({ product_id: product.id, qty_gm: qty, is_fixed: true, is_seasonal: false });
          }
        } else if (key.includes('SEASONAL VEGETABLE') || key.includes('EXTRA VEGETABLE')) {
           const qty = parseFloat(row[key]);
           if (qty > 0) {
             const cost = qty * 0.05; // estimate 50rs per kg avg
             totalVegCost += cost;
           }
        }
      }

      const numServings = parseInt(row['SERVINGS']) || 1;
      const totalCostMonth = totalVegCost * numServings;

      let marginPercent = 0;
      if (planCost > 0) {
         marginPercent = ((planCost - totalCostMonth) / planCost) * 100;
      }

      if (!pkg) {
        pkg = await Package.create({
          name: planName,
          num_persons: 2, // arbitrary default based on schema
          services_per_month: numServings,
          price: planCost,
          type: 'standard',
          margin_percent: marginPercent.toFixed(2),
          status: 'active'
        }, { transaction: t });

        // Add fixed items to package
        for (const fi of fixedItemsData) {
          await PackageFixedItem.create({
            package_id: pkg.id,
            product_id: fi.product_id,
            default_qty_gm: fi.default_qty_gm
          }, { transaction: t });
        }
      }

      // 4. Create Subscription
      let startDateStr = null;
      let endDateStr = null;
      if (row['SERVING #1']) startDateStr = excelDateToJSDate(row['SERVING #1']);
      if (row[`SERVING #${numServings}`]) endDateStr = excelDateToJSDate(row[`SERVING #${numServings}`]);

      const subscription = await Subscription.create({
        user_id: user.id,
        package_id: pkg.id,
        status: row['STATUS'] === 'ACTIVE' ? 'active' : 'completed',
        type: 'monthly',
        total_services: numServings,
        address_id: address ? address.id : null,
        locked_price: planCost,
        start_date: startDateStr,
        end_date: endDateStr
      }, { transaction: t });

      // 5. Create Subscription Items
      for (const si of subscriptionItemsData) {
        await SubscriptionItem.create({
          subscription_id: subscription.id,
          product_id: si.product_id,
          qty_gm: si.qty_gm,
          is_fixed: si.is_fixed,
          is_seasonal: si.is_seasonal
        }, { transaction: t });
      }

      // 6. Create Delivery Schedules
      for (let i = 1; i <= numServings; i++) {
        const servingKey = `SERVING #${i}`;
        if (row[servingKey]) {
          const scheduledDate = excelDateToJSDate(row[servingKey]);
          if (scheduledDate) {
            await DeliverySchedule.create({
              subscription_id: subscription.id,
              scheduled_date: scheduledDate,
              status: 'pending'
            }, { transaction: t });
          }
        }
      }
    }

    await t.commit();
    console.log('Import completed successfully!');
  } catch (err) {
    await t.rollback();
    console.error('Import failed:', err);
  } finally {
    process.exit(0);
  }
}

runImport();
