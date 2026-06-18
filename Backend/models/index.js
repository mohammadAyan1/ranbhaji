import { Sequelize, DataTypes } from 'sequelize';
import { sequelize } from '../confiq/db.js';

// 1. USERS
const User = sequelize.define('User', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  name: { type: DataTypes.STRING(100) },
  phone: { type: DataTypes.STRING(15), unique: true },
  email: { type: DataTypes.STRING(100), unique: true },
  password_hash: { type: DataTypes.STRING(255) },
  role: { type: DataTypes.ENUM('admin', 'user', 'delivery'), defaultValue: 'user' },
  wallet_balance: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },
  due_amount: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },
  status: { type: DataTypes.ENUM('active', 'inactive'), defaultValue: 'active' }
}, { tableName: 'users', timestamps: true, createdAt: 'created_at', updatedAt: 'updated_at' });

// 2. PRODUCTS
const Product = sequelize.define('Product', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  name: { type: DataTypes.STRING(100) },
  category: { type: DataTypes.ENUM('vegetable', 'fruit', 'water', 'exotic', 'salad') },
  sub_category: { type: DataTypes.STRING(50) },
  purchase_price_per_gm: { type: DataTypes.DECIMAL(10, 2) },
  selling_price_per_gm: { type: DataTypes.DECIMAL(10, 2) },
  unit: { type: DataTypes.ENUM('gm', 'ml', 'piece') },
  status: { type: DataTypes.ENUM('active', 'inactive'), defaultValue: 'active' }
}, { tableName: 'products', timestamps: true, createdAt: 'created_at', updatedAt: false });

// 3. PACKAGES
const Package = sequelize.define('Package', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  name: { type: DataTypes.STRING(100) },
  num_persons: { type: DataTypes.INTEGER },
  services_per_month: { type: DataTypes.INTEGER },
  price: { type: DataTypes.DECIMAL(10, 2) },
  type: { type: DataTypes.ENUM('standard', 'custom', 'yearly') },
  target_user_id: { type: DataTypes.INTEGER, allowNull: true },
  margin_percent: { type: DataTypes.DECIMAL(5, 2), defaultValue: 0 },
  status: { type: DataTypes.ENUM('active', 'inactive'), defaultValue: 'active' }
}, { tableName: 'packages', timestamps: true, createdAt: 'created_at', updatedAt: false });

// 4. PACKAGE_FIXED_ITEMS
const PackageFixedItem = sequelize.define('PackageFixedItem', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  default_qty_gm: { type: DataTypes.DECIMAL(10, 2) }
}, { tableName: 'package_fixed_items', timestamps: false });

// 5. PACKAGE_SEASONAL_POOL
const PackageSeasonalPool = sequelize.define('PackageSeasonalPool', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true }
}, { tableName: 'package_seasonal_pool', timestamps: false });

// 6. PACKAGE_SEASONAL_CONFIG
const PackageSeasonalConfig = sequelize.define('PackageSeasonalConfig', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  max_select_count: { type: DataTypes.INTEGER }
}, { tableName: 'package_seasonal_config', timestamps: false });

// 7. SUBSCRIPTIONS
const Subscription = sequelize.define('Subscription', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  start_date: { type: DataTypes.DATEONLY },
  end_date: { type: DataTypes.DATEONLY },
  status: { type: DataTypes.ENUM('active', 'paused', 'completed', 'cancelled') },
  type: { type: DataTypes.ENUM('monthly', 'yearly') },
  yearly_amount_paid: { type: DataTypes.DECIMAL(10, 2), allowNull: true },
  services_completed: { type: DataTypes.INTEGER, defaultValue: 0 },
  total_services: { type: DataTypes.INTEGER },
  address_id: { type: DataTypes.INTEGER, allowNull: true }
}, { tableName: 'subscriptions', timestamps: true, createdAt: 'created_at', updatedAt: false });

// 8. SUBSCRIPTION_ITEMS
const SubscriptionItem = sequelize.define('SubscriptionItem', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  qty_gm: { type: DataTypes.DECIMAL(10, 2) },
  is_fixed: { type: DataTypes.BOOLEAN },
  is_seasonal: { type: DataTypes.BOOLEAN },
  is_active: { type: DataTypes.BOOLEAN, defaultValue: true }
}, { tableName: 'subscription_items', timestamps: false });

// 9. DELIVERY_SCHEDULE
const DeliverySchedule = sequelize.define('DeliverySchedule', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  scheduled_date: { type: DataTypes.DATEONLY },
  status: { type: DataTypes.ENUM('pending', 'delivered', 'skipped') },
  actual_delivery_date: { type: DataTypes.DATEONLY, allowNull: true },
  is_locked: { type: DataTypes.BOOLEAN, defaultValue: false },
  delivery_boy_id: { type: DataTypes.INTEGER, allowNull: true },
  delivery_photo_url: { type: DataTypes.STRING(255), allowNull: true },
  delivery_remark: { type: DataTypes.STRING(255), allowNull: true }
}, { tableName: 'delivery_schedule', timestamps: false });

// 10. DELIVERY_ITEMS
const DeliveryItem = sequelize.define('DeliveryItem', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  qty_gm: { type: DataTypes.DECIMAL(10, 2) },
  delivered_qty: { type: DataTypes.DECIMAL(10, 2), allowNull: true },
  return_qty: { type: DataTypes.DECIMAL(10, 2), allowNull: true },
  return_reason: { type: DataTypes.STRING(255), allowNull: true },
  return_photo_url: { type: DataTypes.STRING(255), allowNull: true },
  return_status: { type: DataTypes.ENUM('none', 'requested', 'approved', 'rejected'), defaultValue: 'none' }
}, { tableName: 'delivery_items', timestamps: false });

// 10b. SCHEDULE_SEASONAL_SELECTIONS
const ScheduleSeasonalSelection = sequelize.define('ScheduleSeasonalSelection', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  qty_gm: { type: DataTypes.DECIMAL(10, 2) },
  is_auto: { type: DataTypes.BOOLEAN, defaultValue: false }
}, { tableName: 'schedule_seasonal_selections', timestamps: false });


// 11. WALLET_TRANSACTIONS
const WalletTransaction = sequelize.define('WalletTransaction', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  amount: { type: DataTypes.DECIMAL(10, 2) },
  type: { type: DataTypes.ENUM('credit', 'debit') },
  reason: { type: DataTypes.STRING(255) },
  reference_id: { type: DataTypes.INTEGER, allowNull: true }
}, { tableName: 'wallet_transactions', timestamps: true, createdAt: 'created_at', updatedAt: false });

// 12. PAUSE_LOG
const PauseLog = sequelize.define('PauseLog', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  pause_start: { type: DataTypes.DATEONLY },
  pause_end: { type: DataTypes.DATEONLY },
  requested_days: { type: DataTypes.INTEGER },
  actual_days_used: { type: DataTypes.INTEGER },
  type: { type: DataTypes.ENUM('monthly', 'yearly') },
  status: { type: DataTypes.ENUM('active', 'completed', 'cancelled') }
}, { tableName: 'pause_log', timestamps: false });

// 13. WATER_SUBSCRIPTIONS
const WaterSubscription = sequelize.define('WaterSubscription', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  water_type: { type: DataTypes.ENUM('health', 'miracle') },
  container: { type: DataTypes.ENUM('glass', 'plastic') },
  frequency: { type: DataTypes.ENUM('daily', 'alternate') },
  price_per_bottle: { type: DataTypes.DECIMAL(10, 2) },
  status: { type: DataTypes.ENUM('active', 'paused', 'completed', 'cancelled'), defaultValue: 'active' },
  start_date: { type: DataTypes.DATEONLY, allowNull: true },
  end_date: { type: DataTypes.DATEONLY, allowNull: true },
  type: { type: DataTypes.ENUM('monthly', 'yearly'), defaultValue: 'monthly' },
  yearly_amount_paid: { type: DataTypes.DECIMAL(10, 2), allowNull: true },
  services_completed: { type: DataTypes.INTEGER, defaultValue: 0 },
  total_services: { type: DataTypes.INTEGER, defaultValue: 0 },
  address_id: { type: DataTypes.INTEGER, allowNull: true }
}, { tableName: 'water_subscriptions', timestamps: true, createdAt: 'created_at', updatedAt: false });

// 14. NOTIFICATIONS
const Notification = sequelize.define('Notification', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  title: { type: DataTypes.STRING(150) },
  message: { type: DataTypes.TEXT },
  type: { type: DataTypes.ENUM('reminder', 'alert', 'recharge') },
  scheduled_at: { type: DataTypes.DATE },
  sent_at: { type: DataTypes.DATE, allowNull: true },
  is_read: { type: DataTypes.BOOLEAN, defaultValue: false }
}, { tableName: 'notifications', timestamps: false });

// 15. CREDIT_LOG
const CreditLog = sequelize.define('CreditLog', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  month: { type: DataTypes.STRING(20) },
  due_amount: { type: DataTypes.DECIMAL(10, 2) },
  status: { type: DataTypes.ENUM('pending', 'paid') },
  admin_override: { type: DataTypes.BOOLEAN, defaultValue: false }
}, { tableName: 'credit_log', timestamps: false });

// 16. ADDRESSES
const Address = sequelize.define('Address', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  address_line: { type: DataTypes.STRING(255) },
  city: { type: DataTypes.STRING(50) },
  pincode: { type: DataTypes.STRING(10) },
  landmark: { type: DataTypes.STRING(100) },
  is_default: { type: DataTypes.BOOLEAN, defaultValue: true }
}, { tableName: 'addresses', timestamps: false });

// 17. PAYMENT_TRANSACTIONS
const PaymentTransaction = sequelize.define('PaymentTransaction', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  amount: { type: DataTypes.DECIMAL(10, 2) },
  payment_method: { type: DataTypes.ENUM('wallet', 'razorpay', 'phonepe') },
  gateway_txn_id: { type: DataTypes.STRING(100), allowNull: true },
  status: { type: DataTypes.ENUM('success', 'failed', 'pending') },
  type: { type: DataTypes.ENUM('package_purchase', 'recharge', 'extra_item', 'yearly_booking') }
}, { tableName: 'payment_transactions', timestamps: true, createdAt: 'created_at', updatedAt: false });


// Define Associations

// Packages -> target_user_id
Package.belongsTo(User, { as: 'TargetUser', foreignKey: 'target_user_id' });

// PackageFixedItem
PackageFixedItem.belongsTo(Package, { foreignKey: 'package_id' });
PackageFixedItem.belongsTo(Product, { foreignKey: 'product_id' });
Package.hasMany(PackageFixedItem, { foreignKey: 'package_id', as: 'FixedItems' });

// PackageSeasonalPool
PackageSeasonalPool.belongsTo(Package, { foreignKey: 'package_id' });
PackageSeasonalPool.belongsTo(Product, { foreignKey: 'product_id' });
Package.hasMany(PackageSeasonalPool, { foreignKey: 'package_id', as: 'SeasonalPool' });

// PackageSeasonalConfig
PackageSeasonalConfig.belongsTo(Package, { foreignKey: 'package_id' });
Package.hasOne(PackageSeasonalConfig, { foreignKey: 'package_id', as: 'SeasonalConfig' });

// Subscriptions
Subscription.belongsTo(User, { foreignKey: 'user_id' });
Subscription.belongsTo(Package, { foreignKey: 'package_id' });
User.hasMany(Subscription, { foreignKey: 'user_id' });

// SubscriptionItems
SubscriptionItem.belongsTo(Subscription, { foreignKey: 'subscription_id' });
SubscriptionItem.belongsTo(Product, { foreignKey: 'product_id' });
Subscription.hasMany(SubscriptionItem, { foreignKey: 'subscription_id', as: 'Items' });

// DeliverySchedule
DeliverySchedule.belongsTo(Subscription, { foreignKey: 'subscription_id' });
Subscription.hasMany(DeliverySchedule, { foreignKey: 'subscription_id', as: 'Schedules' });
DeliverySchedule.belongsTo(WaterSubscription, { foreignKey: 'water_subscription_id' });
WaterSubscription.hasMany(DeliverySchedule, { foreignKey: 'water_subscription_id', as: 'Schedules' });
DeliverySchedule.belongsTo(User, { as: 'DeliveryBoy', foreignKey: 'delivery_boy_id' });
User.hasMany(DeliverySchedule, { foreignKey: 'delivery_boy_id' });

// DeliveryItems
DeliveryItem.belongsTo(DeliverySchedule, { foreignKey: 'schedule_id' });
DeliveryItem.belongsTo(Product, { foreignKey: 'product_id' });
DeliverySchedule.hasMany(DeliveryItem, { foreignKey: 'schedule_id', as: 'DeliveryItems' });

// ScheduleSeasonalSelections
ScheduleSeasonalSelection.belongsTo(DeliverySchedule, { foreignKey: 'schedule_id' });
ScheduleSeasonalSelection.belongsTo(Product, { foreignKey: 'product_id' });
DeliverySchedule.hasMany(ScheduleSeasonalSelection, { foreignKey: 'schedule_id', as: 'SeasonalSelections' });


// WalletTransactions
WalletTransaction.belongsTo(User, { foreignKey: 'user_id' });
User.hasMany(WalletTransaction, { foreignKey: 'user_id' });

// PauseLog
PauseLog.belongsTo(Subscription, { foreignKey: 'subscription_id' });
Subscription.hasMany(PauseLog, { foreignKey: 'subscription_id' });
PauseLog.belongsTo(WaterSubscription, { foreignKey: 'water_subscription_id' });
WaterSubscription.hasMany(PauseLog, { foreignKey: 'water_subscription_id' });

// WaterSubscriptions
WaterSubscription.belongsTo(User, { foreignKey: 'user_id' });
User.hasMany(WaterSubscription, { foreignKey: 'user_id' });

// Notifications
Notification.belongsTo(User, { foreignKey: 'user_id' });
User.hasMany(Notification, { foreignKey: 'user_id' });

// CreditLog
CreditLog.belongsTo(User, { foreignKey: 'user_id' });
User.hasMany(CreditLog, { foreignKey: 'user_id' });

// Addresses
Address.belongsTo(User, { foreignKey: 'user_id' });
User.hasMany(Address, { foreignKey: 'user_id' });
Subscription.belongsTo(Address, { foreignKey: 'address_id' });
Address.hasMany(Subscription, { foreignKey: 'address_id' });
WaterSubscription.belongsTo(Address, { foreignKey: 'address_id' });
Address.hasMany(WaterSubscription, { foreignKey: 'address_id' });

// PaymentTransactions
PaymentTransaction.belongsTo(User, { foreignKey: 'user_id' });
User.hasMany(PaymentTransaction, { foreignKey: 'user_id' });


export {
  sequelize,
  User,
  Product,
  Package,
  PackageFixedItem,
  PackageSeasonalPool,
  PackageSeasonalConfig,
  Subscription,
  SubscriptionItem,
  DeliverySchedule,
  DeliveryItem,
  ScheduleSeasonalSelection,
  WalletTransaction,
  PauseLog,
  WaterSubscription,
  Notification,
  CreditLog,
  Address,
  PaymentTransaction
};
