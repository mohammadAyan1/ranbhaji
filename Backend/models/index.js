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
  hindi_name: { type: DataTypes.STRING(100), allowNull: true },
  image_url: { type: DataTypes.STRING(255), allowNull: true },
  category: { type: DataTypes.ENUM('vegetable', 'fruit', 'water', 'exotic', 'salad') },
  sub_category: { type: DataTypes.STRING(50) },
  purchase_price_per_gm: { type: DataTypes.DECIMAL(10, 4) },
  selling_price_per_gm: { type: DataTypes.DECIMAL(10, 4) },
  unit: { type: DataTypes.ENUM('gm', 'ml', 'piece') },
  status: { type: DataTypes.ENUM('active', 'inactive'), defaultValue: 'active' },
  total_purchased_qty: { type: DataTypes.DECIMAL(12, 2), defaultValue: 0 },
  total_sold_qty: { type: DataTypes.DECIMAL(12, 2), defaultValue: 0 },
  current_stock: { type: DataTypes.DECIMAL(12, 2), defaultValue: 0 }
}, { tableName: 'products', timestamps: true, createdAt: 'created_at', updatedAt: false });

// 3. PACKAGES
const Package = sequelize.define('Package', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  name: { type: DataTypes.STRING(100) },
  num_persons: { type: DataTypes.INTEGER },
  num_persons_max: { type: DataTypes.INTEGER, allowNull: true },
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
  status: { type: DataTypes.ENUM('pending', 'ready_for_delivery', 'delivered', 'skipped') },
  actual_delivery_date: { type: DataTypes.DATEONLY, allowNull: true },
  is_locked: { type: DataTypes.BOOLEAN, defaultValue: false },
  delivery_boy_id: { type: DataTypes.INTEGER, allowNull: true },
  delivery_photo_url: { type: DataTypes.STRING(255), allowNull: true },
  delivery_remark: { type: DataTypes.STRING(255), allowNull: true },
  batch_id: { type: DataTypes.INTEGER, allowNull: true }
}, { tableName: 'delivery_schedule', timestamps: false });

// 10. DELIVERY_ITEMS
const DeliveryItem = sequelize.define('DeliveryItem', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  qty_gm: { type: DataTypes.DECIMAL(10, 2) },
  delivered_qty: { type: DataTypes.DECIMAL(10, 2), allowNull: true },
  return_qty: { type: DataTypes.DECIMAL(10, 2), allowNull: true },
  return_reason: { type: DataTypes.STRING(255), allowNull: true },
  return_photo_url: { type: DataTypes.STRING(255), allowNull: true },
  return_status: { type: DataTypes.ENUM('none', 'requested', 'approved', 'rejected'), defaultValue: 'none' },
  packed_qty: { type: DataTypes.DECIMAL(10, 2), allowNull: true }
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
  latitude: { type: DataTypes.DECIMAL(10, 8), allowNull: true },
  longitude: { type: DataTypes.DECIMAL(11, 8), allowNull: true },
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


// 18. CALCULATOR_DRAFTS
const CalculatorDraft = sequelize.define('CalculatorDraft', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  name: { type: DataTypes.STRING(100), allowNull: false },
  margin_percent: { type: DataTypes.DECIMAL(5, 2), defaultValue: 0 },
  services_per_month: { type: DataTypes.INTEGER, defaultValue: 1 },
  num_persons: { type: DataTypes.INTEGER, defaultValue: 2 },
  calculated_price: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },
  max_fixed_count: { type: DataTypes.INTEGER, defaultValue: 0 },
  max_seasonal_count: { type: DataTypes.INTEGER, defaultValue: 0 }
}, { tableName: 'calculator_drafts', timestamps: true, createdAt: 'created_at', updatedAt: 'updated_at' });

// 19. CALCULATOR_DRAFT_ITEMS
const CalculatorDraftItem = sequelize.define('CalculatorDraftItem', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  qty_gm: { type: DataTypes.DECIMAL(10, 2) },
  is_fixed: { type: DataTypes.BOOLEAN, defaultValue: true },
  is_seasonal: { type: DataTypes.BOOLEAN, defaultValue: false }
}, { tableName: 'calculator_draft_items', timestamps: false });

CalculatorDraftItem.belongsTo(CalculatorDraft, { foreignKey: 'draft_id', onDelete: 'CASCADE' });
CalculatorDraftItem.belongsTo(Product, { foreignKey: 'product_id' });
CalculatorDraft.hasMany(CalculatorDraftItem, { foreignKey: 'draft_id', as: 'Items', onDelete: 'CASCADE' });

// 20. PURCHASE_LOGS
const PurchaseLog = sequelize.define('PurchaseLog', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  quantity: { type: DataTypes.DECIMAL(12, 2), allowNull: false },
  purchase_price_per_kg: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
  selling_price_per_kg: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
  total_amount: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
  purchase_date: { type: DataTypes.DATE, defaultValue: DataTypes.NOW }
}, { tableName: 'purchase_logs', timestamps: false });

PurchaseLog.belongsTo(Product, { foreignKey: 'product_id' });
Product.hasMany(PurchaseLog, { foreignKey: 'product_id', as: 'PurchaseLogs' });

// 21. RETAIL_ORDERS
const RetailOrder = sequelize.define('RetailOrder', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  total_amount: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
  delivery_charge: { type: DataTypes.DECIMAL(10, 2), defaultValue: 30.00 },
  payment_method: { type: DataTypes.ENUM('cod', 'phonepe'), allowNull: false },
  payment_status: { type: DataTypes.ENUM('pending', 'success', 'failed'), defaultValue: 'pending' },
  delivery_date: { type: DataTypes.DATEONLY, allowNull: false },
  delivery_status: { type: DataTypes.ENUM('pending', 'ready_for_delivery', 'delivered', 'cancelled'), defaultValue: 'pending' },
  phonepe_txn_id: { type: DataTypes.STRING(100), allowNull: true },
  batch_id: { type: DataTypes.INTEGER, allowNull: true },
  delivery_boy_id: { type: DataTypes.INTEGER, allowNull: true }
}, { tableName: 'retail_orders', timestamps: true, createdAt: 'created_at', updatedAt: 'updated_at' });

RetailOrder.belongsTo(User, { foreignKey: 'user_id' });
User.hasMany(RetailOrder, { foreignKey: 'user_id' });
RetailOrder.belongsTo(Address, { foreignKey: 'address_id' });
Address.hasMany(RetailOrder, { foreignKey: 'address_id' });
RetailOrder.belongsTo(User, { as: 'DeliveryBoy', foreignKey: 'delivery_boy_id' });
User.hasMany(RetailOrder, { foreignKey: 'delivery_boy_id' });

// 22. RETAIL_ORDER_ITEMS
const RetailOrderItem = sequelize.define('RetailOrderItem', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  quantity: { type: DataTypes.DECIMAL(12, 2), allowNull: false },
  packed_qty: { type: DataTypes.DECIMAL(10, 2), allowNull: true },
  price_per_unit: { type: DataTypes.DECIMAL(10, 4), allowNull: false },
  total_price: { type: DataTypes.DECIMAL(10, 2), allowNull: false }
}, { tableName: 'retail_order_items', timestamps: false });

RetailOrderItem.belongsTo(RetailOrder, { foreignKey: 'order_id', onDelete: 'CASCADE' });
RetailOrder.hasMany(RetailOrderItem, { foreignKey: 'order_id', as: 'Items', onDelete: 'CASCADE' });
RetailOrderItem.belongsTo(Product, { foreignKey: 'product_id' });
Product.hasMany(RetailOrderItem, { foreignKey: 'product_id' });

// 23. BATCHES
const Batch = sequelize.define('Batch', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  name: { type: DataTypes.STRING(100), allowNull: false },
  status: { type: DataTypes.ENUM('active', 'inactive'), defaultValue: 'active' },
  is_deleted: { type: DataTypes.BOOLEAN, defaultValue: false }
}, { tableName: 'batches', timestamps: true, createdAt: 'created_at', updatedAt: 'updated_at' });

DeliverySchedule.belongsTo(Batch, { foreignKey: 'batch_id' });
Batch.hasMany(DeliverySchedule, { foreignKey: 'batch_id' });

RetailOrder.belongsTo(Batch, { foreignKey: 'batch_id' });
Batch.hasMany(RetailOrder, { foreignKey: 'batch_id' });

// 24. MISSED_PRODUCT_LOG
const MissedProductLog = sequelize.define('MissedProductLog', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  missed_date: { type: DataTypes.DATEONLY, allowNull: false },
  missed_qty: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
  next_schedule_date: { type: DataTypes.DATEONLY, allowNull: true }
}, { tableName: 'missed_product_logs', timestamps: true, createdAt: 'created_at', updatedAt: false });

MissedProductLog.belongsTo(User, { foreignKey: 'user_id' });
User.hasMany(MissedProductLog, { foreignKey: 'user_id' });
MissedProductLog.belongsTo(Product, { foreignKey: 'product_id' });
Product.hasMany(MissedProductLog, { foreignKey: 'product_id' });

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
  PaymentTransaction,
  CalculatorDraft,
  CalculatorDraftItem,
  PurchaseLog,
  RetailOrder,
  RetailOrderItem,
  Batch,
  MissedProductLog
};

