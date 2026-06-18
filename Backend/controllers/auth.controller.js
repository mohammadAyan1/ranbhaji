import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { User } from "../models/index.js";

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
        const { name, phone, email, password, role } = req.body;
        if (!name || !phone || !password) {
            return res.status(400).json({ success: false, message: "name, phone, and password are required" });
        }
        const allowedRoles = ["user", "delivery", "admin"];
        const userRole = role && allowedRoles.includes(role) ? role : "user";

        const existing = await User.findOne({ where: { phone } });
        if (existing) return res.status(400).json({ success: false, message: "Phone number already registered" });

        if (email) {
            const existingEmail = await User.findOne({ where: { email } });
            if (existingEmail) return res.status(400).json({ success: false, message: "Email already registered" });
        }

        const password_hash = await bcrypt.hash(password, 10);
        const user = await User.create({ name, phone, email: email || null, password_hash, role: userRole });

        const token = generateToken(user.id, user.role);
        res.cookie("token", token, cookieOpts).status(201).json({
            success: true,
            message: "Registered successfully",
            token,
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
            attributes: { exclude: ['password_hash'] }
        });
        res.status(200).json({ success: true, user });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// POST /api/auth/logout
export const logout = (req, res) => {
    res.clearCookie("token").json({ success: true, message: "Logged out" });
};