import bcrypt from "bcryptjs";
import { User, Product, Package, PackageFixedItem, PackageSeasonalPool, PackageSeasonalConfig } from "../models/index.js";

export const seedDatabase = async () => {
    try {
        const userCount = await User.count();
        if (userCount > 0) {
            console.log("[SEED] Database already seeded, checking/seeding water products...");
            const waterProducts = await Product.count({ where: { category: 'water' } });
            if (waterProducts < 4) {
                await Product.destroy({ where: { category: 'water' } });
                await Product.bulkCreate([
                    { name: "Alkaline Health Water (Glass)", category: "water", sub_category: "glass", purchase_price_per_gm: 15.00, selling_price_per_gm: 20.00, unit: "piece" },
                    { name: "Alkaline Health Water (Plastic)", category: "water", sub_category: "plastic", purchase_price_per_gm: 10.00, selling_price_per_gm: 15.00, unit: "piece" },
                    { name: "Miracle Water (Glass)", category: "water", sub_category: "glass", purchase_price_per_gm: 25.00, selling_price_per_gm: 30.00, unit: "piece" },
                    { name: "Miracle Water (Plastic)", category: "water", sub_category: "plastic", purchase_price_per_gm: 20.00, selling_price_per_gm: 25.00, unit: "piece" }
                ]);
                console.log("[SEED] Seeded new 4 water products.");
            }
            return;
        }

        console.log("[SEED] Seeding database...");
        const hash = (pwd) => bcrypt.hash(pwd, 10);

        // Users
        await User.bulkCreate([
            { name: "Admin User", phone: "9000000001", email: "admin@rambhaji.com", password_hash: await hash("Admin@123"), role: "admin", wallet_balance: 0 },
            { name: "Raju Kumar", phone: "9000000002", email: "raju@example.com", password_hash: await hash("User@123"), role: "user", wallet_balance: 5000 },
            { name: "Priya Singh", phone: "9000000003", email: "priya@example.com", password_hash: await hash("User@123"), role: "user", wallet_balance: 2500 },
            { name: "Delivery Boy", phone: "9000000004", email: "delivery@rambhaji.com", password_hash: await hash("Delivery@123"), role: "delivery", wallet_balance: 0 }
        ]);

        // Products
        const products = await Product.bulkCreate([
            // Vegetables
            { name: "Potato (Aloo)", category: "vegetable", sub_category: "root", purchase_price_per_gm: 0.02, selling_price_per_gm: 0.03, unit: "gm" },
            { name: "Tomato", category: "vegetable", sub_category: "fruit-veg", purchase_price_per_gm: 0.04, selling_price_per_gm: 0.06, unit: "gm" },
            { name: "Onion", category: "vegetable", sub_category: "root", purchase_price_per_gm: 0.025, selling_price_per_gm: 0.04, unit: "gm" },
            { name: "Spinach", category: "vegetable", sub_category: "leafy", purchase_price_per_gm: 0.05, selling_price_per_gm: 0.08, unit: "gm" },
            { name: "Carrot", category: "vegetable", sub_category: "root", purchase_price_per_gm: 0.04, selling_price_per_gm: 0.06, unit: "gm" },
            { name: "Capsicum", category: "vegetable", sub_category: "fruit-veg", purchase_price_per_gm: 0.08, selling_price_per_gm: 0.12, unit: "gm" },
            // Fruits
            { name: "Banana", category: "fruit", sub_category: "tropical", purchase_price_per_gm: 0.03, selling_price_per_gm: 0.05, unit: "gm" },
            { name: "Apple", category: "fruit", sub_category: "seasonal", purchase_price_per_gm: 0.10, selling_price_per_gm: 0.15, unit: "gm" },
            { name: "Papaya", category: "fruit", sub_category: "tropical", purchase_price_per_gm: 0.04, selling_price_per_gm: 0.06, unit: "gm" },
            // Exotic
            { name: "Broccoli", category: "exotic", sub_category: "cruciferous", purchase_price_per_gm: 0.12, selling_price_per_gm: 0.18, unit: "gm" },
            { name: "Zucchini", category: "exotic", sub_category: "gourd", purchase_price_per_gm: 0.10, selling_price_per_gm: 0.15, unit: "gm" },
            // Salad
            { name: "Iceberg Lettuce", category: "salad", sub_category: "leafy", purchase_price_per_gm: 0.06, selling_price_per_gm: 0.09, unit: "gm" },
            { name: "Cherry Tomato", category: "salad", sub_category: "fruit-veg", purchase_price_per_gm: 0.09, selling_price_per_gm: 0.14, unit: "gm" },
            // Water
            { name: "Alkaline Health Water (Glass)", category: "water", sub_category: "glass", purchase_price_per_gm: 15.00, selling_price_per_gm: 20.00, unit: "piece" },
            { name: "Alkaline Health Water (Plastic)", category: "water", sub_category: "plastic", purchase_price_per_gm: 10.00, selling_price_per_gm: 15.00, unit: "piece" },
            { name: "Miracle Water (Glass)", category: "water", sub_category: "glass", purchase_price_per_gm: 25.00, selling_price_per_gm: 30.00, unit: "piece" },
            { name: "Miracle Water (Plastic)", category: "water", sub_category: "plastic", purchase_price_per_gm: 20.00, selling_price_per_gm: 25.00, unit: "piece" }
        ]);

        // NANO Package (2 persons, 12 services/month = ₹1200)
        // Per service = ₹100, fixed cost = potato 500gm * 0.03 + tomato 300gm * 0.06 = ₹15 + ₹18 = ₹33
        const nanoPkg = await Package.create({
            name: "Nano", num_persons: 2, services_per_month: 12, price: 1200, type: "standard"
        });
        await PackageFixedItem.bulkCreate([
            { package_id: nanoPkg.id, product_id: products[0].id, default_qty_gm: 500 }, // Potato
            { package_id: nanoPkg.id, product_id: products[1].id, default_qty_gm: 300 }, // Tomato
            { package_id: nanoPkg.id, product_id: products[2].id, default_qty_gm: 250 }  // Onion
        ]);
        await PackageSeasonalPool.bulkCreate([
            { package_id: nanoPkg.id, product_id: products[3].id }, // Spinach
            { package_id: nanoPkg.id, product_id: products[4].id }, // Carrot
            { package_id: nanoPkg.id, product_id: products[5].id }, // Capsicum
            { package_id: nanoPkg.id, product_id: products[6].id }, // Banana
        ]);
        await PackageSeasonalConfig.create({ package_id: nanoPkg.id, max_select_count: 3 });

        // GOLD Package (4 persons, 26 services/month = ₹3500)
        // Per service ≈ ₹134.6
        const goldPkg = await Package.create({
            name: "Gold", num_persons: 4, services_per_month: 26, price: 3500, type: "standard"
        });
        await PackageFixedItem.bulkCreate([
            { package_id: goldPkg.id, product_id: products[0].id, default_qty_gm: 1000 }, // Potato
            { package_id: goldPkg.id, product_id: products[1].id, default_qty_gm: 500 },  // Tomato
            { package_id: goldPkg.id, product_id: products[2].id, default_qty_gm: 500 },  // Onion
        ]);
        await PackageSeasonalPool.bulkCreate([
            { package_id: goldPkg.id, product_id: products[3].id }, // Spinach
            { package_id: goldPkg.id, product_id: products[4].id }, // Carrot
            { package_id: goldPkg.id, product_id: products[5].id }, // Capsicum
            { package_id: goldPkg.id, product_id: products[7].id }, // Apple
            { package_id: goldPkg.id, product_id: products[9].id }, // Broccoli
            { package_id: goldPkg.id, product_id: products[11].id }, // Lettuce
        ]);
        await PackageSeasonalConfig.create({ package_id: goldPkg.id, max_select_count: 5 });

        // SILVER Package (3 persons, 20 services/month = ₹2200)
        const silverPkg = await Package.create({
            name: "Silver", num_persons: 3, services_per_month: 20, price: 2200, type: "standard"
        });
        await PackageFixedItem.bulkCreate([
            { package_id: silverPkg.id, product_id: products[0].id, default_qty_gm: 750 },
            { package_id: silverPkg.id, product_id: products[1].id, default_qty_gm: 400 },
            { package_id: silverPkg.id, product_id: products[2].id, default_qty_gm: 400 },
        ]);
        await PackageSeasonalPool.bulkCreate([
            { package_id: silverPkg.id, product_id: products[3].id },
            { package_id: silverPkg.id, product_id: products[4].id },
            { package_id: silverPkg.id, product_id: products[8].id }, // Papaya
            { package_id: silverPkg.id, product_id: products[10].id }, // Zucchini
        ]);
        await PackageSeasonalConfig.create({ package_id: silverPkg.id, max_select_count: 4 });

        console.log("[SEED] Database seeded successfully!");
        console.log("[SEED] Test credentials:");
        console.log("  Admin:    phone=9000000001  password=Admin@123");
        console.log("  Customer: phone=9000000002  password=User@123");
        console.log("  Delivery: phone=9000000004  password=Delivery@123");

    } catch (error) {
        console.error("[SEED] Seeding failed:", error.message);
    }
};
