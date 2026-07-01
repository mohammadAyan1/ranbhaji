import jwt from "jsonwebtoken";
import { User } from "../models/index.js";

export const requireAuth = async (req, res, next) => {
    try {
        let token;
        const authHeader = req.headers.authorization;
        if (authHeader && authHeader.startsWith("Bearer ")) {
            token = authHeader.split(" ")[1];
        } else if (req.cookies && req.cookies.token) {
            token = req.cookies.token;
        }

        if (!token) {
            return res.status(401).json({ success: false, message: "Authorization token is required" });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findByPk(decoded.id, {
            attributes: { exclude: ['password_hash'] }
        });

        if (!user) {
            return res.status(401).json({ success: false, message: "User no longer exists" });
        }
        if (user.status === 'inactive') {
            return res.status(403).json({ success: false, message: "Account is deactivated" });
        }

        req.user = user;
        next();
    } catch (error) {
        return res.status(500).json({ success: false, message: "Invalid or expired token" });
    }
};

export const requireRole = (roles) => (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({ success: false, message: "Not authenticated" });
    }
    if (!roles.includes(req.user.role)) {
        return res.status(403).json({ success: false, message: `Access denied. Required role: ${roles.join(' or ')}` });
    }
    next();
};
