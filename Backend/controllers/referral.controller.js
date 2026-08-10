import { User, ReferralLog, Subscription, sequelize } from "../models/index.js";

// GET /api/referral/my-code
export const getMyReferralCode = async (req, res) => {
    try {
        const userId = req.user.id;
        
        // Check if user has an active non-water package
        const activeSub = await Subscription.findOne({
            where: { user_id: userId, status: 'active' }
        });

        if (!activeSub) {
            return res.status(200).json({
                success: true,
                hasActivePackage: false,
                message: "You must have an active package to view and share your referral code."
            });
        }

        const user = await User.findByPk(userId);
        return res.status(200).json({
            success: true,
            hasActivePackage: true,
            referral_code: user.referral_code,
            total_free_servings: user.total_free_servings
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// GET /api/referral/admin/salesmen
export const getSalesmanReferrals = async (req, res) => {
    try {
        const referrals = await ReferralLog.findAll({
            where: { is_salesman: true },
            include: [
                { model: User, as: 'Referrer', attributes: ['id', 'name', 'phone', 'email'] },
                { model: User, as: 'ReferredUser', attributes: ['id', 'name', 'phone', 'created_at'] }
            ],
            order: [['created_at', 'DESC']]
        });

        // Group by Salesman
        const salesmanMap = {};
        for (const ref of referrals) {
            if (!ref.Referrer) continue;
            const sId = ref.Referrer.id;
            if (!salesmanMap[sId]) {
                salesmanMap[sId] = {
                    salesman: ref.Referrer,
                    total_referrals: 0,
                    referred_users: []
                };
            }
            salesmanMap[sId].total_referrals += 1;
            salesmanMap[sId].referred_users.push({
                user: ref.ReferredUser,
                registered_at: ref.created_at
            });
        }

        res.status(200).json({ success: true, data: Object.values(salesmanMap) });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// GET /api/referral/admin/users
export const getUserReferrals = async (req, res) => {
    try {
        const referrals = await ReferralLog.findAll({
            where: { is_salesman: false },
            include: [
                { model: User, as: 'Referrer', attributes: ['id', 'name', 'phone', 'email', 'total_free_servings'] },
                { model: User, as: 'ReferredUser', attributes: ['id', 'name', 'phone', 'created_at'] }
            ],
            order: [['created_at', 'DESC']]
        });

        // Group by User
        const userMap = {};
        for (const ref of referrals) {
            if (!ref.Referrer) continue; // Should not happen if referrer_id is valid
            const uId = ref.Referrer.id;
            if (!userMap[uId]) {
                userMap[uId] = {
                    referrer: ref.Referrer,
                    total_referrals: 0,
                    referred_users: []
                };
            }
            userMap[uId].total_referrals += 1;
            userMap[uId].referred_users.push({
                user: ref.ReferredUser,
                registered_at: ref.created_at,
                awarded_free_serving: ref.awarded_free_serving,
                subscription_id: ref.subscription_id
            });
        }

        res.status(200).json({ success: true, data: Object.values(userMap) });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
