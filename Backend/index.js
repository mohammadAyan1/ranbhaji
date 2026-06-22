import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import path from "path";
import { fileURLToPath } from "url";

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

// Utilities
import { startCronJobs } from "./utils/cronJobs.js";
import { seedDatabase } from "./utils/seed.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.use(cors({
    origin: process.env.NODE_ENV === "production"
        ? [process.env.FRONTEND_URL]
        : ["http://localhost:5173", "http://localhost:3000"],
    credentials: true
}));

// Static uploads
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Health check
app.get("/health", async (req, res) => {
    try {
        await sequelize.authenticate();
        res.status(200).json({ success: true, message: "FreshBox API is running. DB connected." });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

app.get("/", (req, res) => {
    res.status(200).json({ message: "FreshBox API v1.0", success: true });
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

// 404 fallback
app.use((req, res) => {
    res.status(404).json({ success: false, message: "Route not found" });
});

// Error handler
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ success: false, message: err.message || "Internal server error" });
});

// Start server
const startServer = async () => {
    await connectDB();
    await sequelize.sync();
    console.log("[DB] Models synchronized");

    await seedDatabase();

    startCronJobs();

    app.listen(port, () => {
        console.log(`\n🥦 FreshBox Server running on http://localhost:${port}`);
        console.log(`   Health: http://localhost:${port}/health\n`);
    });
};

startServer().catch(console.error);