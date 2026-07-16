import { Package, PackageFixedItem, PackageSeasonalPool, PackageSeasonalConfig, Product, User, Subscription } from "../models/index.js";
import { sequelize } from "../confiq/db.js";

// POST /api/packages  (admin)
export const createPackage = async (req, res) => {
    const t = await sequelize.transaction();
    try {
        const { name, num_persons, num_persons_max, services_per_month, price, type, target_user_id, fixed_items, seasonal_pool, max_select_count, margin_percent, target_mobile_number } = req.body;

        // Validation: sum of fixed_item cost per service must be < per_service_amount
        const per_service_amount = (parseFloat(price) / parseInt(services_per_month)) * (1 - parseFloat(margin_percent || 0) / 200);
        let fixed_cost_per_service = 0;

        if (fixed_items && fixed_items.length > 0) {
            for (const item of fixed_items) {
                const product = await Product.findByPk(item.product_id);
                if (!product) {
                    await t.rollback();
                    return res.status(404).json({ success: false, message: `Product ${item.product_id} not found` });
                }
                fixed_cost_per_service += parseFloat(item.default_qty_gm) * parseFloat(product.purchase_price_per_gm);
            }
        }

        if (fixed_cost_per_service >= per_service_amount) {
            await t.rollback();
            return res.status(400).json({
                success: false,
                message: `Package price validation failed: Fixed item cost per service (₹${fixed_cost_per_service.toFixed(2)}) must be LESS than per-service amount (₹${per_service_amount.toFixed(2)}). No budget left for seasonal items.`
            });
        }

        let final_target_user_id = target_user_id || null;
        let final_target_mobile = type === 'custom' ? (target_mobile_number || null) : null;

        if (type === 'custom' && final_target_mobile && !final_target_user_id) {
            const user = await User.findOne({ where: { phone: final_target_mobile }, transaction: t });
            if (user) final_target_user_id = user.id;
        }

        const pkg = await Package.create({ name, num_persons, num_persons_max: num_persons_max || null, services_per_month, price, type, target_user_id: final_target_user_id, target_mobile_number: final_target_mobile, margin_percent: margin_percent || 0 }, { transaction: t });


        if (fixed_items && fixed_items.length > 0) {
            const fixedRows = fixed_items.map(item => ({ package_id: pkg.id, product_id: item.product_id, default_qty_gm: item.default_qty_gm }));
            await PackageFixedItem.bulkCreate(fixedRows, { transaction: t });
        }

        if (seasonal_pool && seasonal_pool.length > 0) {
            const poolRows = seasonal_pool.map(product_id => ({ package_id: pkg.id, product_id }));
            await PackageSeasonalPool.bulkCreate(poolRows, { transaction: t });
        }

        if (max_select_count) {
            await PackageSeasonalConfig.create({ package_id: pkg.id, max_select_count }, { transaction: t });
        }

        await t.commit();
        res.status(201).json({ success: true, message: "Package created", package: pkg });
    } catch (error) {
        await t.rollback();
        res.status(500).json({ success: false, message: error.message });
    }
};

// GET /api/packages
export const getPackages = async (req, res) => {
    try {
        const isAdmin = req.user?.role === 'admin';
        const userId = req.user?.id;
        const where = { status: 'active' };
        if (isAdmin) delete where.status;

        const packages = await Package.findAll({
            where,
            include: [
                { model: PackageFixedItem, as: 'FixedItems', include: [{ model: Product, attributes: ['id', 'name', 'unit', 'category'] }] },
                { model: PackageSeasonalPool, as: 'SeasonalPool', include: [{ model: Product, attributes: ['id', 'name', 'unit', 'category'] }] },
                { model: PackageSeasonalConfig, as: 'SeasonalConfig' }
            ]
        });

        // Filter out custom packages not targeted at this user
        const filtered = packages.filter(p => {
            if (p.type === 'custom' && !isAdmin) {
                return p.target_user_id === userId;
            }
            return true;
        });

        // Strip price details for non-admins (only show package price, not per-item prices)
        const data = filtered.map(p => {
            const obj = p.toJSON();
            if (!isAdmin) {
                delete obj.margin_percent;
                // Remove item-level prices from the response
                obj.FixedItems = obj.FixedItems?.map(fi => {
                    if (fi.Product) {
                        delete fi.Product.purchase_price_per_gm;
                        delete fi.Product.selling_price_per_gm;
                    }
                    return fi;
                });
            }
            return obj;
        });

        if (userId && !isAdmin) {
            // Find user's latest subscription for each package
            const userSubs = await Subscription.findAll({
                where: { user_id: userId },
                order: [['created_at', 'DESC']]
            });
            
            for (let obj of data) {
                const latestSub = userSubs.find(s => s.package_id === obj.id);
                if (latestSub && latestSub.renewal_count >= 3 && latestSub.locked_price) {
                    // Check if the subscription is active, or expired within 7 days
                    let isEligible = false;
                    if (latestSub.status === 'active' || latestSub.status === 'paused') {
                        isEligible = true;
                    } else if (latestSub.status === 'completed' && latestSub.end_date) {
                        const endDate = new Date(latestSub.end_date);
                        const sevenDaysAgo = new Date();
                        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
                        if (endDate >= sevenDaysAgo) {
                            isEligible = true;
                        }
                    }
                    if (isEligible) {
                        obj.price = latestSub.locked_price;
                        obj.is_grandfathered_price = true; // flag for frontend if needed
                    }
                }
            }
        }

        res.status(200).json({ success: true, packages: data });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// GET /api/packages/:id
export const getPackageById = async (req, res) => {
    try {
        const pkg = await Package.findByPk(req.params.id, {
            include: [
                { model: PackageFixedItem, as: 'FixedItems', include: [{ model: Product }] },
                { model: PackageSeasonalPool, as: 'SeasonalPool', include: [{ model: Product }] },
                { model: PackageSeasonalConfig, as: 'SeasonalConfig' }
            ]
        });
        if (!pkg) return res.status(404).json({ success: false, message: "Package not found" });

        const isAdmin = req.user?.role === 'admin';
        const obj = pkg.toJSON();
        if (!isAdmin) {
            delete obj.margin_percent;
            obj.FixedItems = obj.FixedItems?.map(fi => {
                if (fi.Product) { delete fi.Product.purchase_price_per_gm; delete fi.Product.selling_price_per_gm; }
                return fi;
            });
        }
        res.status(200).json({ success: true, package: obj });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// PUT /api/packages/:id  (admin)
export const updatePackage = async (req, res) => {
    const t = await sequelize.transaction();
    try {
        const pkg = await Package.findByPk(req.params.id);
        if (!pkg) { await t.rollback(); return res.status(404).json({ success: false, message: "Package not found" }); }

        const { name, num_persons, num_persons_max, services_per_month, price, type, target_user_id, fixed_items, seasonal_pool, max_select_count, margin_percent, status, target_mobile_number } = req.body;


        // Re-validate if price-related fields changed
        const newPrice = price || pkg.price;
        const newServicesPerMonth = services_per_month || pkg.services_per_month;
        const newMarginPercent = margin_percent !== undefined ? margin_percent : pkg.margin_percent;
        const per_service_amount = (parseFloat(newPrice) / parseInt(newServicesPerMonth)) * (1 - parseFloat(newMarginPercent || 0) / 200);

        if (fixed_items) {
            let fixed_cost_per_service = 0;
            for (const item of fixed_items) {
                const product = await Product.findByPk(item.product_id);
                if (!product) { await t.rollback(); return res.status(404).json({ success: false, message: `Product ${item.product_id} not found` }); }
                fixed_cost_per_service += parseFloat(item.default_qty_gm) * parseFloat(product.purchase_price_per_gm);
            }
            if (fixed_cost_per_service >= per_service_amount) {
                await t.rollback();
                return res.status(400).json({ success: false, message: `Fixed item cost (₹${fixed_cost_per_service.toFixed(2)}) must be < per-service amount (₹${per_service_amount.toFixed(2)})` });
            }
            await PackageFixedItem.destroy({ where: { package_id: pkg.id }, transaction: t });
            await PackageFixedItem.bulkCreate(fixed_items.map(i => ({ package_id: pkg.id, product_id: i.product_id, default_qty_gm: i.default_qty_gm })), { transaction: t });
        }

        if (seasonal_pool) {
            await PackageSeasonalPool.destroy({ where: { package_id: pkg.id }, transaction: t });
            await PackageSeasonalPool.bulkCreate(seasonal_pool.map(product_id => ({ package_id: pkg.id, product_id })), { transaction: t });
        }

        if (max_select_count !== undefined) {
            await PackageSeasonalConfig.upsert({ package_id: pkg.id, max_select_count }, { transaction: t });
        }

        let final_target_user_id = target_user_id !== undefined ? target_user_id : pkg.target_user_id;
        let final_target_mobile = target_mobile_number !== undefined ? (target_mobile_number || null) : pkg.target_mobile_number;
        
        if (type === 'custom' && final_target_mobile && !final_target_user_id) {
            const user = await User.findOne({ where: { phone: final_target_mobile }, transaction: t });
            if (user) final_target_user_id = user.id;
        }

        await pkg.update({ name, num_persons, num_persons_max: num_persons_max !== undefined ? (num_persons_max || null) : pkg.num_persons_max, services_per_month, price, type, target_user_id: final_target_user_id, target_mobile_number: final_target_mobile, margin_percent: newMarginPercent, status }, { transaction: t });

        await t.commit();
        res.status(200).json({ success: true, message: "Package updated" });
    } catch (error) {
        await t.rollback();
        res.status(500).json({ success: false, message: error.message });
    }
};
