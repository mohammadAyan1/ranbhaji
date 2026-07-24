import { User, Subscription, SubscriptionItem, Package, RetailOrder, RetailOrderItem, Product, WaterSubscription, DeliverySchedule, DeliveryItem, ScheduleSeasonalSelection, Batch } from "../models/index.js";
import { Op } from "sequelize";

// GET /api/admin/user-analytics/users
export const getAllUsers = async (req, res) => {
    try {
        const users = await User.findAll({
            where: { role: 'user' },
            attributes: ['id', 'name', 'phone'],
            order: [['name', 'ASC']]
        });
        res.status(200).json({ success: true, users });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// GET /api/admin/user-analytics/:userId
export const getUserAnalytics = async (req, res) => {
    try {
        const userId = req.params.userId;

        // Fetch User Info
        const user = await User.findByPk(userId, { attributes: ['id', 'name', 'phone'] });
        if (!user) return res.status(404).json({ success: false, message: "User not found" });

        // 1. Fetch Subscriptions (Packages)
        const subscriptions = await Subscription.findAll({
            where: { 
                user_id: userId,
                status: { [Op.in]: ['active', 'paused', 'completed'] }
            },
            include: [
                { model: Package },
                { model: SubscriptionItem, as: 'Items', include: [{ model: Product }] },
                { model: Batch }
            ]
        });

        // 2. Fetch Water Subscriptions
        const waterSubscriptions = await WaterSubscription.findAll({
            where: { user_id: userId },
            include: [{ model: Batch }]
        });

        // 3. Fetch Retail Orders
        const retailOrders = await RetailOrder.findAll({
            where: { user_id: userId },
            include: [
                { model: RetailOrderItem, as: 'Items', include: [{ model: Product }] }
            ],
            order: [['created_at', 'DESC']]
        });

        // Aggregation Maps
        const packageStats = {}; // To group by package id and count renewals
        const productTotalStats = {}; // To aggregate total product quantities

        const addProductStat = (product, qty, type) => {
            if (!product) return;
            const pId = product.id;
            if (!productTotalStats[pId]) {
                productTotalStats[pId] = {
                    id: pId,
                    name: product.name,
                    unit: product.unit,
                    category: product.category,
                    totalQty: 0,
                    retailQty: 0,
                    packageQty: 0
                };
            }
            productTotalStats[pId].totalQty += qty;
            if (type === 'retail') {
                productTotalStats[pId].retailQty += qty;
            } else if (type === 'package') {
                productTotalStats[pId].packageQty += qty;
            }
        };

        // Process Subscriptions (Veg/Fruit)
        subscriptions.forEach(sub => {
            const pkg = sub.Package;
            if (pkg) {
                if (!packageStats[pkg.id]) {
                    packageStats[pkg.id] = {
                        sub_id: sub.id,
                        id: pkg.id,
                        name: pkg.name,
                        type: 'Veg/Fruit Package',
                        renewals: 0,
                        status: sub.status,
                        batch: sub.Batch ? sub.Batch.name : null,
                        batch_id: sub.batch_id,
                        is_water: false,
                        items: {}
                    };
                }
                if (sub.status === 'active' || sub.status === 'paused') {
                    packageStats[pkg.id].status = sub.status;
                    packageStats[pkg.id].sub_id = sub.id;
                    packageStats[pkg.id].batch = sub.Batch ? sub.Batch.name : null;
                    packageStats[pkg.id].batch_id = sub.batch_id;
                }
                packageStats[pkg.id].renewals += 1;

                // Process Items inside this subscription
                if (sub.Items && sub.Items.length > 0) {
                    sub.Items.forEach(item => {
                        if (item.Product) {
                            // Add to package stats
                            if (!packageStats[pkg.id].items[item.Product.id]) {
                                packageStats[pkg.id].items[item.Product.id] = {
                                    name: item.Product.name,
                                    unit: item.Product.unit,
                                    qtyPerService: parseFloat(item.qty_gm || 0)
                                };
                            }
                            
                            // Add to total stats (multiplying by total services per month isn't perfect for exact quantities because they might miss deliveries, but represents what they "purchased" via subscription.
                            // To be exact on what was ordered/delivered, we should use DeliveryItems. But let's use the requested "services ki sare product ka name aur quantity show karao" -> This means total qty * services completed? 
                            // Or maybe just show how much they got per service.
                            // To get exact total quantity delivered via package, we will query DeliveryItems below.
                        }
                    });
                }
            }
        });

        // Process Water Subscriptions
        waterSubscriptions.forEach(wSub => {
            const key = 'water_' + wSub.water_type;
            if (!packageStats[key]) {
                packageStats[key] = {
                    sub_id: wSub.id,
                    id: key,
                    name: `Water Subscription (${wSub.water_type})`,
                    type: 'Water',
                    renewals: 0,
                    status: wSub.status,
                    batch: wSub.Batch ? wSub.Batch.name : null,
                    batch_id: wSub.batch_id,
                    is_water: true,
                    items: {
                        [wSub.id]: {
                            name: `${wSub.water_type} Water`,
                            unit: 'bottle',
                            qtyPerService: 1
                        }
                    }
                };
            }
            if (wSub.status === 'active' || wSub.status === 'paused') {
                packageStats[key].status = wSub.status;
                packageStats[key].sub_id = wSub.id;
                packageStats[key].batch = wSub.Batch ? wSub.Batch.name : null;
                packageStats[key].batch_id = wSub.batch_id;
            }
            packageStats[key].renewals += 1;
        });

        // Process Retail Orders for totals and timeline
        const retailHistory = [];
        retailOrders.forEach(order => {
            const date = order.created_at;
            const items = [];
            
            if (order.Items && order.Items.length > 0) {
                order.Items.forEach(item => {
                    if (item.Product) {
                        const qty = parseFloat(item.quantity || 0);
                        items.push({
                            name: item.Product.name,
                            qty: qty,
                            unit: item.Product.unit,
                            category: item.Product.category
                        });
                        addProductStat(item.Product, qty, 'retail');
                    }
                });
            }

            if (items.length > 0) {
                retailHistory.push({
                    orderId: order.id,
                    date: date,
                    totalAmount: order.total_amount,
                    status: order.delivery_status,
                    items: items
                });
            }
        });

        // To get accurate "Package Quantity" ever ordered by this user, we must check DeliveryItems and ScheduleSeasonalSelections
        // attached to this user's DeliverySchedules.
        const deliverySchedules = await DeliverySchedule.findAll({
            where: {
                [Op.or]: [
                    { '$Subscription.user_id$': userId },
                    { '$WaterSubscription.user_id$': userId }
                ]
            },
            include: [
                { model: Subscription, required: false, attributes: [] },
                { model: WaterSubscription, required: false, attributes: [] },
                { model: DeliveryItem, as: 'DeliveryItems', include: [{ model: Product }] },
                { model: ScheduleSeasonalSelection, as: 'SeasonalSelections', include: [{ model: Product }] }
            ]
        });

        deliverySchedules.forEach(schedule => {
            if (schedule.DeliveryItems && schedule.DeliveryItems.length > 0) {
                schedule.DeliveryItems.forEach(item => {
                    if (item.Product) {
                        addProductStat(item.Product, parseFloat(item.qty_gm || 0), 'package');
                    }
                });
            }
            if (schedule.SeasonalSelections && schedule.SeasonalSelections.length > 0) {
                schedule.SeasonalSelections.forEach(sel => {
                    if (sel.Product) {
                        addProductStat(sel.Product, parseFloat(sel.qty_gm || 0), 'package');
                    }
                });
            }
        });

        // Format data
        const packageData = Object.values(packageStats).map(p => {
            return {
                ...p,
                items: Object.values(p.items)
            };
        });

        const totalProductData = Object.values(productTotalStats).sort((a, b) => b.totalQty - a.totalQty);

        res.status(200).json({
            success: true,
            user,
            analytics: {
                packages: packageData,
                retailHistory: retailHistory,
                totalProducts: totalProductData
            }
        });

    } catch (error) {
        console.error("User Analytics Error:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};
