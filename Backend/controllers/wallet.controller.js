import { sequelize } from "../confiq/db.js";
import { User, WalletTransaction, CreditLog, Subscription, DeliverySchedule, Package, WaterSubscription, Address } from "../models/index.js";
import { Op } from "sequelize";
import bcrypt from "bcryptjs";

// GET /api/wallet
export const getWallet = async (req, res) => {
    try {
        const user = await User.findByPk(req.user.id, {
            attributes: ['wallet_balance', 'due_amount']
        });
        res.status(200).json({ success: true, wallet_balance: user.wallet_balance, due_amount: user.due_amount });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// POST /api/add-funds (mock payment gateway)
export const addFunds = async (req, res) => {
    const t = await sequelize.transaction();
    try {
        const { amount, payment_method } = req.body;
        if (!amount || amount <= 0) { await t.rollback(); return res.status(400).json({ success: false, message: "Valid amount required" }); }

        const user = await User.findByPk(req.user.id, { transaction: t });
        const newBalance = parseFloat(user.wallet_balance) + parseFloat(amount);
        await user.update({ wallet_balance: newBalance }, { transaction: t });
        await WalletTransaction.create({ user_id: user.id, amount, type: 'credit', reason: `Manual recharge via ${payment_method || 'wallet'}` }, { transaction: t });

        await t.commit();
        res.status(200).json({ success: true, message: "Funds added", wallet_balance: newBalance });
    } catch (error) {
        await t.rollback();
        res.status(500).json({ success: false, message: error.message });
    }
};

// GET /api/wallet/transactions
export const getTransactions = async (req, res) => {
    try {
        const transactions = await WalletTransaction.findAll({
            where: { user_id: req.user.id },
            order: [['created_at', 'DESC']],
            limit: 50
        });
        res.status(200).json({ success: true, transactions });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// GET /api/admin/tomorrow-summary  (admin)
export const getTomorrowSummary = async (req, res) => {
    try {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const tomorrowStr = tomorrow.toISOString().split('T')[0];

        const schedules = await DeliverySchedule.findAll({
            where: { scheduled_date: tomorrowStr, status: 'pending' },
            include: [
                {
                    model: Subscription,
                    include: [{ model: User, attributes: ['id', 'name', 'phone'] }, { model: Package, attributes: ['name'] }]
                },
                {
                    model: WaterSubscription,
                    include: [{ model: User, attributes: ['id', 'name', 'phone'] }]
                }
            ]
        });

        const customerIds = [];
        const deliveries = [];

        for (const s of schedules) {
            let user = null;
            let packageName = "Unknown";

            if (s.Subscription) {
                user = s.Subscription.User;
                packageName = s.Subscription.Package?.name || "Standard Package";
                if (user) customerIds.push(user.id);
            } else if (s.WaterSubscription) {
                user = s.WaterSubscription.User;
                packageName = `${s.WaterSubscription.water_type} Water (${s.WaterSubscription.container})`;
                if (user) customerIds.push(user.id);
            }

            if (user) {
                deliveries.push({
                    user,
                    package: packageName,
                    schedule_id: s.id
                });
            }
        }

        const summary = {
            date: tomorrowStr,
            total_customers: new Set(customerIds).size,
            deliveries
        };

        res.status(200).json({ success: true, summary });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// GET /api/admin/user/:id/all-subscriptions
export const getUserSubscriptions = async (req, res) => {
    try {
        const user = await User.findByPk(req.params.id, {
            attributes: { exclude: ['password_hash'] },
            include: [
                { model: Subscription, include: [{ model: Package }, { model: Address }] },
                { model: WaterSubscription, include: [{ model: Address }] }
            ]
        });
        if (!user) return res.status(404).json({ success: false, message: "User not found" });
        res.status(200).json({ success: true, user });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// GET /api/admin/users
export const getAllUsers = async (req, res) => {
    try {
        const users = await User.findAll({ 
            attributes: { exclude: ['password_hash'] }, 
            include: [{ model: Address }],
            order: [['created_at', 'DESC']] 
        });
        res.status(200).json({ success: true, users });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// POST /api/admin/users
export const createUser = async (req, res) => {
    try {
        const { name, phone, email, password, role } = req.body;
        
        if (!name || !phone || !password) {
            return res.status(400).json({ success: false, message: "Name, phone, and password are required" });
        }

        const existingUser = await User.findOne({ where: { phone } });
        if (existingUser) {
            return res.status(400).json({ success: false, message: "User with this phone already exists" });
        }

        const password_hash = await bcrypt.hash(password, 10);

        const newUser = await User.create({
            name,
            phone,
            email: email || null,
            password_hash,
            role: role || 'user',
            is_verified: true, // Already verified if admin creates
            status: 'active'
        });

        res.status(201).json({ success: true, message: "User created successfully", user: newUser });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// PATCH /api/admin/credit/:id/override
export const overrideCredit = async (req, res) => {
    try {
        const creditLog = await CreditLog.findByPk(req.params.id);
        if (!creditLog) return res.status(404).json({ success: false, message: "Credit log not found" });
        await creditLog.update({ admin_override: true });

        // Re-activate subscription if it was on hold
        const subscription = await Subscription.findOne({ where: { user_id: creditLog.user_id, status: 'paused' } });
        if (subscription) await subscription.update({ status: 'active' });

        res.status(200).json({ success: true, message: "Credit override applied, subscription re-activated" });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// PATCH /api/admin/users/:id/status
export const updateUserStatus = async (req, res) => {
    try {
        const { status } = req.body;
        const user = await User.findByPk(req.params.id);
        if (!user) return res.status(404).json({ success: false, message: "User not found" });
        await user.update({ status });
        res.status(200).json({ success: true, message: `User ${status}` });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// PATCH /api/admin/users/:id/delivery-zones
export const assignDeliveryZones = async (req, res) => {
    try {
        const { zones } = req.body;
        const user = await User.findByPk(req.params.id);
        if (!user || user.role !== 'delivery') return res.status(404).json({ success: false, message: "Delivery boy not found" });

        await user.update({ delivery_zones: zones });
        res.status(200).json({ success: true, message: "Delivery zones updated successfully", user });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
