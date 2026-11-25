import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import path from "path";
import { fileURLToPath } from "url";
import http from "http";
import { Server } from "socket.io";

dotenv.config();

// Database & Models
import { connectDB, sequelize } from "./confiq/db.js";
import "./models/index.js";

// Routes
import authRoutes from "./routes/auth.route.js";
import productRoutes from "./routes/product.route.js";
import packageRoutes from "./routes/package.route.js";
import subscriptionRoutes from "./routes/subscription.route.js";
import deliveryRoutes from "./routes/delivery.route.js";
import walletRoutes from "./routes/wallet.route.js";
import waterRoutes from "./routes/water.route.js";
import notificationRoutes from "./routes/notification.route.js";
import addressRoutes from "./routes/address.route.js";
import calculatorRoutes from "./routes/calculator.route.js";
import paymentRoutes from "./routes/payment.route.js";
import retailRoutes from "./routes/retail.route.js";
import batchRoutes from "./routes/batch.route.js";
import userAnalyticsRoutes from "./routes/userAnalytics.route.js";
import dashboardRoutes from "./routes/dashboard.route.js";
import unitRoutes from "./routes/unit.routes.js";
import zoneRoutes from "./routes/zone.route.js";
import categoryRoutes from "./routes/category.route.js";
import subCategoryRoutes from "./routes/subCategory.route.js";
import todayWorkRoutes from "./routes/todayWork.route.js";
import reportRoutes from "./routes/report.route.js";
import wasteRoutes from "./routes/waste.route.js";
import franchiseRoutes from "./routes/franchise.route.js";
import attendanceRoutes from "./routes/attendance.route.js";
import productionRoutes from "./routes/production.route.js";
import referralRoutes from "./routes/referral.route.js";
import closingStockRoutes from "./routes/closingStock.route.js";
import workerTaskRoutes from "./routes/workerTask.routes.js";
import registeredEmailRoutes from "./routes/registeredEmail.route.js";
import heroSectionRoutes from "./routes/heroSection.route.js";
// Utilities
import { startCronJobs } from "./utils/cronJobs.js";
import { seedDatabase } from "./utils/seed.js";


import notificationRouter from "./routes/notification/notificationRoutes.js";


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 3000;
const httpServer = http.createServer(app);

export const io = new Server(httpServer, {
    cors: {
        origin: process.env.NODE_ENV === "production"
            ? [process.env.FRONTEND_URL, "http://localhost:8081", "http://localhost:5173", "http://localhost:3000", "https://ram-bhaji.vercel.app", "https://nextjs.driveranger.com", "https://vegalert-production-monitor.onrender.com", "https://nextjs.driveranger.com", "http://localhost:8081"]
            : ["http://localhost:5173", "http://localhost:3000", "http://localhost:8081"],
        methods: ["GET", "POST", "PATCH", "PUT", "DELETE"]
    }
});

// Make io accessible in routes
app.set('io', io);

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// HTTP Method Override middleware (allows clients/proxies to tunnel PUT/PATCH via POST if ModSecurity/Apache blocks them)
app.use((req, res, next) => {
    const override = req.headers['x-http-method-override'] || req.query?._method;
    if (override && req.method === 'POST') {
        req.method = override.toUpperCase();
    }
    next();
});

// Robust CORS supporting all domains, preflight OPTIONS, and all REST methods (GET, POST, PUT, PATCH, DELETE)
app.use(cors({
    origin: (origin, callback) => {
        // Allow mobile apps, Postman, curl, server-to-server (no origin)
        if (!origin) return callback(null, true);

        // Allow any rambhaji, shreenari, vercel, render, driveranger, and localhost
        const allowedPatterns = [
            /rambhaji\.com$/,
            /shreenari\.com$/,
            /vercel\.app$/,
            /onrender\.com$/,
            /driveranger\.com$/,
            /localhost/
        ];

        const isAllowed = allowedPatterns.some(pattern => pattern.test(origin));
        if (isAllowed || process.env.NODE_ENV !== "production") {
            callback(null, true);
        } else {
            callback(null, true); // Fallback: allow to ensure API does not block legitimate clients
        }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With", "Accept", "Origin", "X-HTTP-Method-Override"]
}));

// Static uploads
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Health check
app.get("/health", async (req, res) => {
    try {
        await sequelize.authenticate();
        res.status(200).json({ success: true, message: "RamBhaji API is running. DB connected." });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

app.get("/", (req, res) => {
    res.status(200).json({ message: "RamBhaji API v1.0", success: true });
});

// API Routes
app.use("/api/auth", authRoutes);
app.use("/api/products", productRoutes);
app.use("/api/packages", packageRoutes);
app.use("/api/addresses", addressRoutes);
app.use("/api", subscriptionRoutes);       // /api/subscribe, /api/my-subscriptions, etc.
app.use("/api", deliveryRoutes);           // /api/today-deliveries, /api/mark-delivered, etc.
app.use("/api", walletRoutes);             // /api/wallet, /api/admin/...
app.use("/api/water", waterRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/calculator", calculatorRoutes);
app.use("/api/payment", paymentRoutes);
app.use("/api/retail", retailRoutes);
app.use("/api", batchRoutes);
app.use("/api/admin/user-analytics", userAnalyticsRoutes);
app.use("/api/admin", dashboardRoutes);
app.use("/api/units", unitRoutes);
app.use("/api/zones", zoneRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/sub-categories", subCategoryRoutes);
app.use("/api/today-work", todayWorkRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/waste", wasteRoutes);
app.use("/api/franchises", franchiseRoutes);
app.use("/api/attendance", attendanceRoutes);
app.use("/api/production", productionRoutes);
app.use("/api/referral", referralRoutes);
app.use("/api/admin/closing-stock", closingStockRoutes);
app.use("/api/worker-tasks", workerTaskRoutes);
app.use("/api/registered-emails", registeredEmailRoutes);
// notification
app.use('/api/notifications', notificationRouter);
app.use('/api/hero-section', heroSectionRoutes);
app.use('/api/hero', heroSectionRoutes);


// 404 fallback
app.use((req, res) => {
    res.status(404).json({ success: false, message: "Route not found" });
});

// Error handler
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ success: false, message: err.message || "Internal server error" });
});

// Auto-migration helper to automatically add missing table columns on production
const ensureDBSchema = async () => {
    try {
        const [columns] = await sequelize.query("SHOW COLUMNS FROM products");
        const columnNames = columns.map(c => c.Field);

        if (!columnNames.includes('waste_percentage')) {
            console.log("[DB Auto-Migrate] Adding missing column: waste_percentage to products");
            await sequelize.query("ALTER TABLE products ADD COLUMN waste_percentage DECIMAL(5,2) DEFAULT 0");
        }
        if (!columnNames.includes('closing_stock_usable_percentage')) {
            console.log("[DB Auto-Migrate] Adding missing column: closing_stock_usable_percentage to products");
            await sequelize.query("ALTER TABLE products ADD COLUMN closing_stock_usable_percentage DECIMAL(5,2) DEFAULT 100");
        }
        console.log("[DB Auto-Migrate] Products table schema verified.");
    } catch (err) {
        console.error("[DB Auto-Migrate Warning]", err.message);
    }
};

// Start server
const startServer = async () => {
    await connectDB();
    await sequelize.sync();
    console.log("[DB] Models synchronized");
    await ensureDBSchema();

    await seedDatabase();

    startCronJobs(io);

    httpServer.listen(port, () => {
        console.log(`\n🥦 RamBhaji Server running on http://localhost:${port}`);
        console.log(`   Health: http://localhost:${port}/health\n`);
    });
};

startServer().catch(console.error);

