import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { User, Package, AttendanceLog, ReferralLog, Subscription, DeliverySchedule, DeliveryItem } from "../models/index.js";

const generateReferralCode = async () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code;
    let exists = true;
    while (exists) {
        code = '';
        for (let i = 0; i < 12; i++) {
            code += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        const user = await User.findOne({ where: { referral_code: code } });
        if (!user) exists = false;
    }
    return code;
};

const generateToken = (id, role) =>
    jwt.sign({ id, role }, process.env.JWT_SECRET, { expiresIn: "7d" });

const cookieOpts = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
    maxAge: 7 * 24 * 60 * 60 * 1000
};

// POST /api/auth/register
export const register = async (req, res) => {
    try {
        const { name, phone, email, password, role, gender, disliked_products, referral_code } = req.body;
        if (!name || !phone || !password) {
            return res.status(400).json({ success: false, message: "name, phone, and password are required" });
        }
        const allowedRoles = ["user", "delivery", "admin", "salesman"];
        const userRole = role && allowedRoles.includes(role) ? role : "user";
        // `select * from where phone = ${phone}`
        const existing = await User.findOne({ where: { phone } });
        if (existing) return res.status(400).json({ success: false, message: "Phone number already registered" });

        if (email) {
            const existingEmail = await User.findOne({ where: { email } });
            if (existingEmail) return res.status(400).json({ success: false, message: "Email already registered" });
        }

        const password_hash = await bcrypt.hash(password, 10);

        const otp = "123456";
        const otp_expiry = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes from now

        const myCode = await generateReferralCode();

        const user = await User.create({
            name, phone, email: email || null, password_hash, actual_password: password, role: userRole, gender: gender || null,
            otp, otp_expiry, is_verified: false,
            disliked_products: Array.isArray(disliked_products) ? disliked_products : [],
            referral_code: myCode
        });

        if (referral_code) {
            const referrer = await User.findOne({ where: { referral_code } });
            if (referrer) {
                if (referrer.role === 'salesman') {
                    await ReferralLog.create({
                        referrer_id: referrer.id,
                        referred_user_id: user.id,
                        is_salesman: true,
                        awarded_free_serving: false
                    });
                } else {
                    let awarded = false;
                    let awarded_sub_id = null;
                    if (referrer.total_free_servings < 10) {
                        const subscriptions = await Subscription.findAll({
                            where: { user_id: referrer.id, status: 'active' },
                            order: [['start_date', 'ASC']]
                        });
                        const eligibleSub = subscriptions.find(s => s.free_servings_awarded < 3);
                        if (eligibleSub) {
                            const lastSchedule = await DeliverySchedule.findOne({
                                where: { subscription_id: eligibleSub.id },
                                order: [['scheduled_date', 'DESC']]
                            });

                            let nextDate = new Date();
                            if (lastSchedule) {
                                nextDate = new Date(lastSchedule.scheduled_date);
                                const allSchedules = await DeliverySchedule.findAll({
                                    where: { subscription_id: eligibleSub.id },
                                    order: [['scheduled_date', 'DESC']],
                                    limit: 2
                                });
                                let gapDays = 1;
                                if (allSchedules.length === 2) {
                                    const d1 = new Date(allSchedules[0].scheduled_date);
                                    const d2 = new Date(allSchedules[1].scheduled_date);
                                    gapDays = Math.max(1, (d1 - d2) / (1000 * 60 * 60 * 24));
                                }
                                nextDate.setDate(nextDate.getDate() + gapDays);
                            } else {
                                nextDate.setDate(nextDate.getDate() + 1);
                            }

                            const isoDate = nextDate.toISOString().split('T')[0];
                            const newSchedule = await DeliverySchedule.create({
                                subscription_id: eligibleSub.id,
                                scheduled_date: isoDate,
                                status: 'pending',
                                batch_id: eligibleSub.batch_id
                            });

                            if (lastSchedule) {
                                const lastItems = await DeliveryItem.findAll({ where: { schedule_id: lastSchedule.id } });
                                for (const item of lastItems) {
                                    await DeliveryItem.create({
                                        schedule_id: newSchedule.id,
                                        product_id: item.product_id,
                                        qty_gm: item.qty_gm
                                    });
                                }
                            }

                            eligibleSub.total_services += 1;
                            eligibleSub.free_servings_awarded += 1;
                            await eligibleSub.save();

                            referrer.total_free_servings += 1;
                            await referrer.save();

                            awarded = true;
                            awarded_sub_id = eligibleSub.id;
                        }
                    }
                    await ReferralLog.create({
                        referrer_id: referrer.id,
                        referred_user_id: user.id,
                        is_salesman: false,
                        awarded_free_serving: awarded,
                        subscription_id: awarded_sub_id
                    });
                }
            }
        }

        // Auto-assign any custom package targeting this mobile number
        await Package.update(
            { target_user_id: user.id },
            { where: { target_mobile_number: user.phone, type: 'custom' } }
        );

        res.status(201).json({
            success: true,
            message: "Registered successfully. Please verify your phone number.",
            user: { id: user.id, name: user.name, phone: user.phone, email: user.email, role: user.role }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// POST /api/auth/login
export const login = async (req, res) => {
    try {
        const { phone, password } = req.body;
        if (!phone || !password) return res.status(400).json({ success: false, message: "phone and password are required" });

        const user = await User.findOne({ where: { phone } });
        if (!user) return res.status(404).json({ success: false, message: "User not found" });
        if (user.status === "inactive") return res.status(403).json({ success: false, message: "Account is deactivated" });
        if (!user.is_verified) return res.status(403).json({ success: false, message: "Please verify your phone number first" });

        const match = await bcrypt.compare(password, user.password_hash);
        if (!match) return res.status(400).json({ success: false, message: "Invalid password" });

        const token = generateToken(user.id, user.role);

        res.cookie("token", token, cookieOpts).status(200).json({
            success: true,
            token,
            user: { id: user.id, name: user.name, phone: user.phone, email: user.email, role: user.role, wallet_balance: user.wallet_balance, due_amount: user.due_amount }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// GET /api/auth/me
export const getMe = async (req, res) => {
    try {
        const user = await User.findByPk(req.user.id, {
            attributes: { exclude: ['password_hash', 'otp', 'otp_expiry'] }
        });
        if (!user) return res.status(404).json({ success: false, message: "User not found" });
        res.status(200).json({ success: true, user });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// PUT /api/auth/me/dislikes
export const updateDislikes = async (req, res) => {
    try {
        const { disliked_products } = req.body;
        const user = await User.findByPk(req.user.id);
        if (!user) return res.status(404).json({ success: false, message: "User not found" });

        await user.update({ disliked_products: Array.isArray(disliked_products) ? disliked_products : [] });
        res.status(200).json({ success: true, message: "Preferences updated", disliked_products: user.disliked_products });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// POST /api/auth/logout
export const logout = (req, res) => {
    res.clearCookie("token").json({ success: true, message: "Logged out" });
};

// POST /api/auth/verify-registration-otp
export const verifyRegistrationOTP = async (req, res) => {
    try {
        const { phone, otp } = req.body;
        if (!phone || !otp) return res.status(400).json({ success: false, message: "Phone and OTP are required" });

        const user = await User.findOne({ where: { phone } });
        if (!user) return res.status(404).json({ success: false, message: "User not found" });
        if (user.is_verified) return res.status(400).json({ success: false, message: "User is already verified" });

        if (user.otp !== otp) return res.status(400).json({ success: false, message: "Invalid OTP" });
        if (new Date() > user.otp_expiry) return res.status(400).json({ success: false, message: "OTP has expired" });

        user.is_verified = true;
        user.otp = null;
        user.otp_expiry = null;
        await user.save();

        const token = generateToken(user.id, user.role);
        res.cookie("token", token, cookieOpts).status(200).json({
            success: true,
            message: "Phone number verified successfully",
            token,
            user: { id: user.id, name: user.name, phone: user.phone, email: user.email, role: user.role, wallet_balance: user.wallet_balance, due_amount: user.due_amount }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// POST /api/auth/resend-otp
export const resendOTP = async (req, res) => {
    try {
        const { phone } = req.body;
        if (!phone) return res.status(400).json({ success: false, message: "Phone number is required" });

        const user = await User.findOne({ where: { phone } });
        if (!user) return res.status(404).json({ success: false, message: "User not found" });

        const otp = "123456";
        const otp_expiry = new Date(Date.now() + 5 * 60 * 1000);

        user.otp = otp;
        user.otp_expiry = otp_expiry;
        await user.save();

        res.status(200).json({ success: true, message: "OTP sent successfully" });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// POST /api/auth/forgot-password
export const forgotPassword = async (req, res) => {
    try {
        const { phone } = req.body;
        if (!phone) return res.status(400).json({ success: false, message: "Phone number is required" });

        const user = await User.findOne({ where: { phone } });
        if (!user) return res.status(404).json({ success: false, message: "User not found" });

        const otp = "123456";
        const otp_expiry = new Date(Date.now() + 5 * 60 * 1000);

        user.otp = otp;
        user.otp_expiry = otp_expiry;
        await user.save();

        res.status(200).json({ success: true, message: "OTP sent successfully to reset password" });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// POST /api/auth/verify-forgot-password-otp
export const verifyForgotPasswordOTP = async (req, res) => {
    try {
        const { phone, otp } = req.body;
        if (!phone || !otp) return res.status(400).json({ success: false, message: "Phone and OTP are required" });

        const user = await User.findOne({ where: { phone } });
        if (!user) return res.status(404).json({ success: false, message: "User not found" });

        if (user.otp !== otp) return res.status(400).json({ success: false, message: "Invalid OTP" });
        if (new Date() > user.otp_expiry) return res.status(400).json({ success: false, message: "OTP has expired" });

        res.status(200).json({ success: true, message: "OTP verified successfully. You can now reset your password." });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// POST /api/auth/reset-password
export const resetPassword = async (req, res) => {
    try {
        const { phone, otp, password, confirmPassword } = req.body;
        if (!phone || !otp || !password || !confirmPassword) {
            return res.status(400).json({ success: false, message: "All fields are required" });
        }
        if (password !== confirmPassword) {
            return res.status(400).json({ success: false, message: "Passwords do not match" });
        }

        const user = await User.findOne({ where: { phone } });
        if (!user) return res.status(404).json({ success: false, message: "User not found" });

        if (user.otp !== otp) return res.status(400).json({ success: false, message: "Invalid OTP" });
        if (new Date() > user.otp_expiry) return res.status(400).json({ success: false, message: "OTP has expired" });

        const password_hash = await bcrypt.hash(password, 10);
        user.password_hash = password_hash;
        user.actual_password = password;
        user.otp = null;
        user.otp_expiry = null;
        await user.save();

        res.status(200).json({ success: true, message: "Password reset successfully" });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};