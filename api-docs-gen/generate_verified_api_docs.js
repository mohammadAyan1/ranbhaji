const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");
const {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  Table,
  TableRow,
  TableCell,
  WidthType,
  BorderStyle,
  AlignmentType,
  ShadingType,
  TableOfContents,
  Footer,
  PageNumber,
  Header,
  TabStopType,
  TabStopPosition,
} = require("docx");

const ROOT = path.resolve(__dirname, "..");
const BACKEND_DIR = path.join(ROOT, "Backend");
const FRONTEND_DIR = path.join(ROOT, "Frontend");
const OUTPUT_JSON = path.join(__dirname, "verified_api_analysis.json");
const OUTPUT_DOCX = path.join(__dirname, "Ranbhaji_Backend_API_Documentation_Verified.docx");
const BASE_URL = "https://ranbhaji.onrender.com/api";
const GENERATION_DATE = "July 17, 2026";

const ROUTE_MOUNTS = {
  "auth.route.js": "/api/auth",
  "product.route.js": "/api/products",
  "package.route.js": "/api/packages",
  "subscription.route.js": "/api",
  "delivery.route.js": "/api",
  "wallet.route.js": "/api",
  "water.route.js": "/api/water",
  "notification.route.js": "/api/notifications",
  "address.route.js": "/api/addresses",
  "calculator.route.js": "/api/calculator",
  "payment.route.js": "/api/payment",
  "retail.route.js": "/api/retail",
  "batch.route.js": "/api",
  "userAnalytics.route.js": "/api/admin/user-analytics",
  "dashboard.route.js": "/api/admin",
};

const MODULE_TITLES = {
  auth: "Authentication",
  products: "Products",
  packages: "Packages",
  subscriptions: "Subscriptions",
  deliveries: "Delivery Operations",
  wallet: "Wallet and Users",
  water: "Water Subscriptions",
  notifications: "Notifications",
  addresses: "Addresses",
  calculator: "Calculator Drafts",
  payment: "PhonePe Payments",
  retail: "Retail Orders",
  batches: "Batches",
  analytics: "User Analytics",
  dashboard: "Dashboard",
};

const MODEL_ALIAS_MAP = {
  user: "User",
  users: "User",
  product: "Product",
  products: "Product",
  package: "Package",
  packages: "Package",
  address: "Address",
  addresses: "Address",
  subscription: "Subscription",
  subscriptions: "Subscription",
  water_subscription: "WaterSubscription",
  water_subscriptions: "WaterSubscription",
  notification: "Notification",
  notifications: "Notification",
  transaction: "WalletTransaction",
  transactions: "WalletTransaction",
  batch: "Batch",
  batches: "Batch",
  order: "RetailOrder",
  orders: "RetailOrder",
  draft: "CalculatorDraft",
  drafts: "CalculatorDraft",
  log: "PurchaseLog",
  purchases: "PurchaseLog",
  missedLogs: "MissedProductLog",
};

const FIELD_TYPE_OVERRIDES = {
  phone: "String",
  otp: "String",
  name: "String",
  email: "String",
  password: "String",
  confirmPassword: "String",
  role: "Enum(admin|user|delivery)",
  amount: "Number",
  address_id: "Integer",
  package_id: "Integer",
  water_subscription_id: "Integer",
  subscription_id: "Integer",
  product_id: "Integer",
  delivery_item_id: "Integer",
  txnId: "String",
  start_date: "Date (YYYY-MM-DD)",
  end_date: "Date (YYYY-MM-DD)",
  restart_date: "Date (YYYY-MM-DD)",
  pause_days: "Integer",
  pause_type: "Enum(monthly|yearly)",
  pause_scope: "Enum(single|all)",
  city: "String",
  pincode: "String",
  landmark: "String",
  address_line: "String",
  latitude: "Number",
  longitude: "Number",
  category: "Enum(vegetable|fruit|water|exotic|salad)",
  sub_category: "String",
  purchase_price_per_gm: "Number",
  selling_price_per_gm: "Number",
  purchase_price_per_kg: "Number",
  selling_price_per_kg: "Number",
  quantity: "Number",
  qty_gm: "Number",
  packedQty: "Number",
  packed_qty: "Number",
  return_qty: "Number",
  return_reason: "String",
  payment_method: "String",
  billing_type: "Enum(monthly|yearly)",
  type: "String",
  status: "String",
  water_type: "String",
  container: "String",
  frequency: "Enum(daily|alternate)",
  fixed_items: "Array<Object>",
  items: "Array<Object>",
  seasonal_pool: "Array<Integer>",
  max_select_count: "Integer",
  margin_percent: "Number",
  num_persons: "Integer",
  num_persons_max: "Integer",
  services_per_month: "Integer",
  selectedDate: "Date (YYYY-MM-DD)",
  schedule_id: "Integer",
  scheduleIds: "Array<Integer>",
  retailOrderIds: "Array<Integer>",
  delivery_boy_id: "Integer",
  batch_id: "Integer",
  zones: "Array<String>",
  target_user_id: "Integer",
  target_mobile_number: "String",
  calculated_price: "Number",
  max_fixed_count: "Integer",
  max_seasonal_count: "Integer",
  is_default: "Boolean",
  date: "Date (YYYY-MM-DD)",
  startDate: "Date (YYYY-MM-DD)",
  endDate: "Date (YYYY-MM-DD)",
};

const FIELD_DESCRIPTION_OVERRIDES = {
  phone: "10-digit mobile number used as the primary login identifier.",
  otp: "One-time password currently validated against the stored OTP on the user record.",
  password: "Plain-text password sent by the client; the backend hashes it with bcrypt before storing.",
  confirmPassword: "Confirmation copy of the new password. Must match password exactly.",
  package_id: "Package identifier from the packages catalog.",
  subscription_id: "Subscription identifier returned when a package subscription is created.",
  water_subscription_id: "Water subscription identifier returned when a water subscription is created.",
  address_id: "Saved delivery address identifier.",
  items: "Collection of line items or custom seasonal selections, depending on the endpoint.",
  fixed_items: "Customized fixed product quantities for a package delivery.",
  schedule_id: "Delivery schedule identifier.",
  scheduleIds: "Batch assignment or packing target schedule identifiers.",
  retailOrderIds: "Batch assignment or packing target retail order identifiers.",
  billing_type: "Package billing duration chosen by the customer.",
  payment_method: "Payment source or channel name used by the controller branch.",
  pause_scope: "Whether to pause only the selected subscription or all active subscriptions for the user.",
  pause_type: "Pause allowance bucket enforced by the backend.",
  water_type: "Water product family used to match an active water catalog item by name.",
  container: "Container type used to match an active water catalog item by name.",
  frequency: "Delivery frequency for the water plan.",
  qty_gm: "Quantity stored by the backend in base units; for package produce this is grams, and for some water items it may be piece or milliliter-equivalent according to product.unit.",
  quantity: "Requested quantity entered by the client. The backend converts kg/L input to base units for gm/ml products.",
  zones: "Delivery zones assigned to a delivery partner.",
  batch_id: "Batch grouping identifier used during admin order preparation.",
  delivery_boy_id: "Delivery partner user identifier.",
  date: "Target reporting or fulfillment date.",
  startDate: "Sales report start date filter.",
  endDate: "Sales report end date filter.",
  start_date: "Date when the delivery schedule should begin.",
  restart_date: "Date from which the backend regenerates pending deliveries after a pause.",
  return_reason: "User-supplied explanation for the return request.",
};

const FILE_UPLOAD_META = {
  image: {
    fieldName: "image",
    contentType: "multipart/form-data",
    allowedTypes: "jpeg, jpg, png, gif, webp and any extension allowed by the shared multer middleware",
    maxFiles: 1,
    maxSize: "5 MB",
    storage: "Stored on local disk under /uploads and served as a static file.",
  },
  photo: {
    fieldName: "photo",
    contentType: "multipart/form-data",
    allowedTypes: "jpeg, jpg, png, gif, webp and any extension allowed by the shared multer middleware",
    maxFiles: 1,
    maxSize: "5 MB",
    storage: "Stored on local disk under /uploads and served as a static file.",
  },
};

const COMMON_ERROR_CODES = {
  500: {
    message: "Internal server error or controller-thrown message",
    reason: "Unexpected error path caught by the controller or global error handler.",
  },
};

const FRONTEND_LABEL_OVERRIDES = {
  "Frontend/src/pages/user/PackagesPage.jsx": "User Packages page",
  "Frontend/src/pages/user/MySubscriptions.jsx": "User My Subscriptions page",
  "Frontend/src/pages/user/WalletPage.jsx": "User Wallet page",
  "Frontend/src/pages/user/AddressPage.jsx": "User Address page",
  "Frontend/src/pages/user/WaterPage.jsx": "User Water page",
  "Frontend/src/pages/user/RetailStore.jsx": "User Retail Store page",
  "Frontend/src/pages/user/MyRetailOrders.jsx": "User My Retail Orders page",
  "Frontend/src/pages/user/DeliveryHistory.jsx": "User Delivery History page",
  "Frontend/src/pages/user/NotificationsPage.jsx": "User Notifications page",
  "Frontend/src/pages/user/UserDashboard.jsx": "User Dashboard page",
  "Frontend/src/pages/user/PaymentStatusPage.jsx": "User Payment Status page",
  "Frontend/src/pages/delivery/DeliveryHome.jsx": "Delivery Home page",
  "Frontend/src/pages/admin/AdminProducts.jsx": "Admin Products page",
  "Frontend/src/pages/admin/AdminPackages.jsx": "Admin Packages page",
  "Frontend/src/pages/admin/AdminUsers.jsx": "Admin Users page",
  "Frontend/src/pages/admin/AdminUserAddresses.jsx": "Admin User Addresses page",
  "Frontend/src/pages/admin/AdminSubscriptions.jsx": "Admin Subscriptions page",
  "Frontend/src/pages/admin/AdminDemands.jsx": "Admin Demands page",
  "Frontend/src/pages/admin/AdminSeasonalSelections.jsx": "Admin Seasonal Selections page",
  "Frontend/src/pages/admin/AdminDeliveries.jsx": "Admin Deliveries page",
  "Frontend/src/pages/admin/AdminReturns.jsx": "Admin Returns page",
  "Frontend/src/pages/admin/AdminRetailOrders.jsx": "Admin Retail Orders page",
  "Frontend/src/pages/admin/AdminBatches.jsx": "Admin Batches page",
  "Frontend/src/pages/admin/AdminAllOrders.jsx": "Admin All Orders page",
  "Frontend/src/pages/admin/AdminDashboard.jsx": "Admin Dashboard page",
  "Frontend/src/pages/admin/AdminUserHistory.jsx": "Admin User History page",
  "Frontend/src/pages/admin/AdminMissedProducts.jsx": "Admin Missed Products page",
  "Frontend/src/store/authStore.js": "Shared auth store",
};

const ENDPOINT_OVERRIDES = {
  "GET /health": {
    moduleKey: "dashboard",
    liveApi: false,
    apiName: "Health Check",
    purpose: "Checks whether the server process is up and the Sequelize database connection can authenticate.",
  },
  "GET /": {
    moduleKey: "dashboard",
    liveApi: false,
    apiName: "Root API Banner",
    purpose: "Returns the public API banner text and success flag.",
  },
  "POST /api/subscribe": {
    purpose:
      "Creates a new package subscription shell, records the payment transaction, and asks the user to confirm a start date before delivery schedules are generated.",
    notes: [
      "Blocks duplicate active or paused subscriptions for the same package with HTTP 409.",
      "Supports monthly and yearly subscriptions; yearly pricing is package price x 12 with a 25% discount.",
      "If payment_method is wallet, the backend only validates balance now and debits the wallet later per delivered service.",
      "If payment_method is not wallet, the backend credits the wallet immediately and records a successful PaymentTransaction with package_purchase or yearly_booking type.",
      "Recovers any outstanding postpaid_debt before continuing.",
      "Tracks renewal_count and locked_price so users can retain grandfathered pricing after repeated renewals.",
      "Falls back to the user's default address when address_id is omitted.",
    ],
  },
  "POST /api/confirm-start-date": {
    notes: [
      "Generates delivery dates using generateDeliveryDates in utils/scheduleEngine.js.",
      "The scheduling rule uses 30/services_per_month spacing and shifts Sunday dates back to Saturday only for that delivery occurrence.",
      "Creates DeliverySchedule rows in bulk and updates subscription start_date, end_date, and total_services.",
    ],
  },
  "PATCH /api/subscriptions/:id/pause": {
    notes: [
      "Monthly pause allowance is capped at 15 days per cycle.",
      "Yearly pause allowance is capped at one pause log up to 45 days.",
      "When pause_scope is all, the endpoint pauses all active standard and water subscriptions it can and reports skipped errors inline in the success message.",
      "Pending future DeliverySchedule rows are marked skipped from today onward.",
    ],
  },
  "PATCH /api/subscriptions/:id/restart": {
    notes: [
      "Requires restart_date and only works for paused subscriptions.",
      "Completes the active PauseLog with actual days used based on current date minus pause_start.",
      "Regenerates pending delivery dates only for remaining services.",
    ],
  },
  "GET /api/seasonal-options/:subscription_id": {
    notes: [
      "Computes per_service_amount from package price and services_per_month while applying margin_percent as implemented in the controller.",
      "Returns fixed_items either from customized subscription items or the original package defaults.",
      "Returns seasonal_budget as per_service_amount minus fixed item purchase cost.",
    ],
  },
  "POST /api/select-seasonal": {
    notes: [
      "Validates that every package fixed product remains present with a non-negative quantity.",
      "Compares combined purchase cost of fixed and seasonal items against the per-service budget.",
      "If cost exceeds budget and payment_method is razorpay, the backend stores an extra_overage_charge PaymentTransaction; otherwise it returns HTTP 400 with overage and needs_payment.",
      "Updates the earliest pending unlocked schedule with both fixed and seasonal selections.",
    ],
  },
  "GET /api/subscriptions/:id/upcoming-selections": {
    notes: [
      "Returns each pending unlocked schedule with an is_window_open flag.",
      "The selection cutoff is 8:00 PM on the day before the scheduled delivery date.",
      "Also returns default_seasonal selections from the subscription and current wallet_balance.",
    ],
  },
  "POST /api/subscriptions/:id/schedule-seasonal": {
    notes: [
      "Targets a specific schedule_id from the request body and validates it belongs to the subscription in the URL.",
      "Blocks updates when the schedule is locked, already processed, or the selection window has closed.",
      "Allows paid overage exactly like POST /api/select-seasonal, but for one scheduled service.",
    ],
  },
  "POST /api/mark-delivered": {
    notes: [
      "Accepts package and retail deliveries; type determines which branch executes.",
      "Requires at least a proof photo or a delivery remark.",
      "Debits the user's wallet per delivered service; if the wallet goes negative, the deficit is added to due_amount and wallet_balance is clamped to zero.",
      "For package subscriptions, refunds unused delivery budget based on actual purchase-cost consumption of the delivery items.",
      "Creates an extra pending postpaid serving for eligible long-running package subscriptions and records its debt on user.postpaid_debt.",
      "Deducts product stock and increments total_sold_qty after delivery completion.",
    ],
  },
  "POST /api/return-item": {
    notes: [
      "Supports both a new multi-item items array payload and a backward-compatible single-item payload using delivery_item_id and return_qty.",
      "Validates that each DeliveryItem belongs to the logged-in user through either a standard or water subscription delivery schedule.",
    ],
  },
  "PATCH /api/return-item/:id/review": {
    notes: [
      "When approved, the backend restores stock, reduces total_sold_qty, credits the user's wallet based on purchase_price_per_gm x return quantity, and creates a notification.",
      "When rejected, the backend only creates a rejection notification and updates return_status.",
    ],
  },
  "GET /api/admin/demands": {
    notes: [
      "Defaults to tomorrow when date is not provided.",
      "Calculates package and retail demand totals separately and includes per-batch breakdowns with user names and phone numbers.",
      "Water demand is matched to catalog products by name using water_type and container substrings.",
    ],
  },
  "GET /api/admin/seasonal-selections": {
    notes: [
      "Classifies each seasonal schedule as selected, fallback, or pending.",
      "Fallback means the cutoff has passed or the schedule is locked, so default seasonal preferences are used.",
    ],
  },
  "GET /api/admin/orders": {
    notes: [
      "Defaults to today when date is not provided.",
      "Groups package and retail orders by user and then by address.",
      "Auto-creates DeliveryItem rows when package or water schedules do not have them yet.",
      "Tracks packedQty per grouped item so the admin UI can allocate packed stock before release.",
    ],
  },
  "PUT /api/admin/orders/pack": {
    notes: [
      "Allocates packed_qty across matching package and retail line items by product.",
      "Unchecked package items are carried over to the next schedule and logged in missed_product_logs.",
      "Marks package schedules status as ready_for_delivery and retail orders delivery_status as ready_for_delivery.",
      "Attempts zone-based auto-assignment by comparing address.zone with delivery user delivery_zones and sorting by last_assigned_at.",
    ],
  },
  "GET /api/available-orders": {
    notes: [
      "Returns only ready_for_delivery package schedules and retail orders that do not yet have a delivery_boy_id assigned.",
    ],
  },
  "PUT /api/accept-order": {
    notes: [
      "Only changes the delivery_boy_id on either a package schedule or a retail order; it does not change status.",
    ],
  },
  "POST /api/water/subscribe": {
    notes: [
      "Allows only one active or paused water subscription per user.",
      "Matches the requested water_type and container against active water products by substring search on product name.",
      "Uses daily=30 services/month and alternate=15 services/month with the same 25% yearly discount rule as package plans.",
      "Like package subscriptions, wallet payments validate balance now but actual debits happen per delivered service.",
    ],
  },
  "POST /api/water/confirm-start-date": {
    notes: [
      "Generates daily or every-other-day schedules based on frequency and shifts Sunday dates back to Saturday.",
    ],
  },
  "PATCH /api/water/:id/pause": {
    notes: [
      "Uses the same monthly and yearly pause allowance logic as standard subscriptions.",
      "pause_scope=all pauses both standard and water subscriptions for the user when possible.",
    ],
  },
  "PATCH /api/water/:id/restart": {
    notes: [
      "Regenerates only the remaining water delivery dates using a 1-day gap for daily and 2-day gap for alternate schedules.",
    ],
  },
  "POST /api/payment/phonepe/initiate": {
    notes: [
      "Creates a pending PaymentTransaction before redirecting to PhonePe.",
      "For retail online checkout, also creates a pending RetailOrder and its RetailOrderItem rows before redirect.",
      "For package online checkout, the subscription is not created yet; final subscription creation happens only after payment verification succeeds.",
      "Falls back to a simulated payment-status redirect when the PhonePe sandbox call fails.",
    ],
  },
  "GET /api/payment/phonepe/status/:txnId": {
    notes: [
      "Short-circuits if the transaction is already success or failed in the local database.",
      "Treats simulated=true or a txnId containing _simulated as a successful verification path.",
      "On successful package verification, credits the user's wallet, recovers postpaid debt if any, creates the subscription, and creates subscription items.",
      "On successful retail verification, marks the existing RetailOrder payment_status as success.",
    ],
  },
  "POST /api/retail": {
    notes: [
      "Implements an 8 PM cutoff: before 8 PM the delivery date is tomorrow, otherwise it is the day after tomorrow.",
      "Converts kg/L quantities to base units for gm/ml products before pricing and storage.",
      "If payment_method is wallet, the full order amount is debited immediately and a WalletTransaction is created.",
    ],
  },
  "PATCH /api/retail/admin/:id/status": {
    notes: [
      "Only pending orders can be updated.",
      "When marked delivered, stock is deducted immediately for each retail item and COD orders are marked payment success.",
    ],
  },
  "GET /api/products/sales": {
    notes: [
      "Requires both startDate and endDate query filters.",
      "Aggregates product quantities from retail orders, package delivery items, and seasonal selections.",
      "Returns only products with totalQty > 0 sorted descending by totalQty.",
    ],
  },
};

function sanitizeText(value) {
  if (value === null || value === undefined) {
    return "";
  }

  return String(value)
    .replace(/â‚¹/g, "Rs.")
    .replace(/â€”/g, "-")
    .replace(/ðŸ¥¦/g, "FreshBox")
    .replace(/ðŸ”/g, "OTP")
    .replace(/ðŸ”‘/g, "Password")
    .replace(/ðŸš«/g, "")
    .replace(/âœ…/g, "Success:")
    .replace(/âŒ/g, "Error:")
    .replace(/â‰ˆ/g, "~")
    .replace(/â†’/g, "->")
    .replace(/â€/g, "-")
    .replace(/â€™/g, "'")
    .replace(/â€œ/g, '"')
    .replace(/â€/g, '"')
    .replace(/â€¦/g, "...")
    .replace(/ðŸŒ¿/g, "Package")
    .replace(/ðŸ“…/g, "Date")
    .replace(/ðŸšš/g, "Delivery")
    .replace(/ðŸ“/g, "Address")
    .replace(/ðŸ’°/g, "Wallet")
    .replace(/ðŸ›’/g, "Retail")
    .replace(/ðŸš™/g, "Delivery")
    .replace(/ðŸŒ/g, "Online")
    .replace(/ðŸ”’/g, "Secure")
    .replace(/\u00a0/g, " ")
    .replace(/\s+\n/g, "\n")
    .trim();
}

function splitCamelCase(input) {
  return sanitizeText(input)
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[_-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function titleCase(input) {
  return splitCamelCase(input)
    .split(" ")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function toSentenceCase(input) {
  const cleaned = sanitizeText(input);
  if (!cleaned) return "";
  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
}

function safeRead(filePath) {
  return fs.readFileSync(filePath, "utf8");
}

function getControllerFileForRoute(routeFile) {
  return path.join(
    BACKEND_DIR,
    "controllers",
    routeFile.replace(".route.js", ".controller.js")
  );
}

function loadModelSchemas() {
  const script = `
    import('./Backend/models/index.js').then((m) => {
      const out = {};
      for (const [name, value] of Object.entries(m)) {
        if (value && value.rawAttributes) {
          out[name] = Object.fromEntries(
            Object.entries(value.rawAttributes).map(([key, attr]) => [
              key,
              {
                type: attr.type?.key || attr.type?.constructor?.name || typeof attr.type,
                allowNull: attr.allowNull !== false,
                primaryKey: !!attr.primaryKey,
                defaultValue: attr.defaultValue ?? null
              }
            ])
          );
        }
      }
      console.log(JSON.stringify(out));
    }).catch((err) => {
      console.error(err);
      process.exit(1);
    });
  `;

  const stdout = execFileSync("node", ["--input-type=module", "-e", script], {
    cwd: ROOT,
    encoding: "utf8",
  });

  return JSON.parse(stdout.trim().split("\n").pop());
}

function moduleKeyFromRouteFile(routeFile) {
  const base = routeFile.replace(".route.js", "");
  const map = {
    auth: "auth",
    product: "products",
    package: "packages",
    subscription: "subscriptions",
    delivery: "deliveries",
    wallet: "wallet",
    water: "water",
    notification: "notifications",
    address: "addresses",
    calculator: "calculator",
    payment: "payment",
    retail: "retail",
    batch: "batches",
    userAnalytics: "analytics",
    dashboard: "dashboard",
    category: "products",
  };
  return map[base] || base;
}

function humanizeMethodPath(method, fullPath) {
  const raw = fullPath
    .replace("/api/", "")
    .replace(/\//g, " ")
    .replace(/:/g, "")
    .replace(/\b(admin|auth|api)\b/gi, "")
    .trim();
  const resource = titleCase(raw || "Endpoint");
  const verbMap = {
    GET: "Get",
    POST: "Create",
    PUT: "Update",
    PATCH: "Update",
    DELETE: "Delete",
  };
  return `${verbMap[method] || method} ${resource}`.trim();
}

function parseMiddlewareList(argsFragment) {
  const mids = [];
  const uploadMatch = argsFragment.match(/upload\.(single|array)\((["'])([^"']+)\2\)/);
  if (uploadMatch) {
    mids.push(`upload.${uploadMatch[1]}:${uploadMatch[3]}`);
  }
  if (argsFragment.includes("requireAuth")) mids.push("requireAuth");
  const roleMatch = argsFragment.match(/requireRole\(\[([^\]]+)\]\)/);
  if (roleMatch) {
    mids.push(
      `requireRole:${roleMatch[1]
        .split(",")
        .map((part) => part.replace(/["'\s]/g, ""))
        .filter(Boolean)
        .join("|")}`
    );
  }
  return mids;
}

function parseRoutes() {
  const routesDir = path.join(BACKEND_DIR, "routes");
  const routeFiles = fs
    .readdirSync(routesDir)
    .filter((file) => file.endsWith(".route.js"));

  const endpoints = [];
  for (const routeFile of routeFiles) {
    const filePath = path.join(routesDir, routeFile);
    const mountBase = ROUTE_MOUNTS[routeFile];
    const raw = safeRead(filePath);
    const lines = raw.split(/\r?\n/);
    const controllerFile = getControllerFileForRoute(routeFile);
    const controllerContent = fs.existsSync(controllerFile) ? safeRead(controllerFile) : "";

    let activeGlobalMiddleware = [];
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith("router.use(")) {
        activeGlobalMiddleware = parseMiddlewareList(trimmed);
        continue;
      }

      const routeMatch = trimmed.match(
        /^router\.(get|post|put|patch|delete)\((.+)\);?$/
      );
      if (!routeMatch) continue;

      const method = routeMatch[1].toUpperCase();
      const args = routeMatch[2];
      const pathMatch = args.match(/(["'])([^"']+)\1/);
      if (!pathMatch) continue;
      const routePath = pathMatch[2];

      const controllerNameMatch = args.match(/,\s*([A-Za-z0-9_]+)\s*\)?$/);
      if (!controllerNameMatch) continue;
      const controllerName = controllerNameMatch[1];

      const localMiddleware = parseMiddlewareList(args);
      const uploadMeta = localMiddleware.find((item) => item.startsWith("upload."));
      const fullPath = normalizePath(`${mountBase}${routePath}`);

      endpoints.push({
        method,
        routeFile,
        controllerFile,
        controllerContent,
        controllerName,
        moduleKey: moduleKeyFromRouteFile(routeFile),
        routePath,
        fullPath,
        middlewares: [...new Set([...activeGlobalMiddleware, ...localMiddleware])],
        uploadField: uploadMeta ? uploadMeta.split(":")[1] : null,
      });
    }
  }

  return endpoints;
}

function normalizePath(input) {
  return input.replace(/\/+/g, "/").replace(/\/$/, "") || "/";
}

function extractFunctionSource(controllerContent, functionName) {
  const marker = `export const ${functionName} =`;
  const start = controllerContent.indexOf(marker);
  if (start === -1) return "";

  const braceStart = controllerContent.indexOf("{", start);
  if (braceStart === -1) return "";

  let depth = 0;
  let end = braceStart;
  for (let i = braceStart; i < controllerContent.length; i += 1) {
    const ch = controllerContent[i];
    if (ch === "{") depth += 1;
    if (ch === "}") depth -= 1;
    if (depth === 0) {
      end = i;
      break;
    }
  }

  return controllerContent.slice(start, end + 1);
}

function collectDestructuredFields(functionSource, target) {
  const regex = new RegExp(`const\\s*\\{([^}]+)\\}\\s*=\\s*req\\.${target}`, "g");
  const fields = [];
  for (const match of functionSource.matchAll(regex)) {
    match[1]
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean)
      .forEach((item) => {
        const key = item.split(":")[0].trim();
        if (key && !fields.includes(key)) fields.push(key);
      });
  }
  return fields;
}

function inferFieldType(field, functionSource) {
  if (FIELD_TYPE_OVERRIDES[field]) return FIELD_TYPE_OVERRIDES[field];
  if (new RegExp(`parseInt\\(${field}\\)`).test(functionSource)) return "Integer";
  if (new RegExp(`parseFloat\\(${field}\\)`).test(functionSource)) return "Number";
  if (new RegExp(`Array\\.isArray\\(${field}\\)`).test(functionSource)) return "Array";
  if (/(_id|Id|ids)$/.test(field)) return "Integer";
  if (/^(is_|has_|should)/.test(field)) return "Boolean";
  if (/date/i.test(field)) return "Date (YYYY-MM-DD)";
  return "String";
}

function inferFieldDescription(field) {
  if (FIELD_DESCRIPTION_OVERRIDES[field]) return FIELD_DESCRIPTION_OVERRIDES[field];
  return `${titleCase(field)} used by this endpoint.`;
}

function inferExampleValue(field, type) {
  const lower = field.toLowerCase();
  if (lower.includes("phone")) return "9876543210";
  if (lower.includes("email")) return "user@example.com";
  if (lower.includes("password")) return "StrongPass123";
  if (lower.includes("otp")) return "123456";
  if (lower.includes("date")) return "2026-07-20";
  if (lower.includes("name")) return "Sample Name";
  if (lower.includes("city")) return "Bhopal";
  if (lower.includes("pincode")) return "462001";
  if (lower.includes("address_line")) return "H.No. 12, Green Park";
  if (lower.includes("landmark")) return "Near main market";
  if (lower.includes("reason")) return "Customer request";
  if (lower.includes("category")) return "vegetable";
  if (lower.includes("unit")) return "gm";
  if (lower.includes("water_type")) return "Alkaline";
  if (lower.includes("container")) return "Glass";
  if (lower.includes("frequency")) return "daily";
  if (lower.includes("payment_method")) return "wallet";
  if (lower.includes("type")) return "monthly";
  if (lower.includes("status")) return "active";
  if (lower.includes("zone")) return "Zone A";
  if (type.includes("Array")) return "[]";
  if (type.includes("Integer")) return "1";
  if (type.includes("Number")) return "100";
  if (type.includes("Boolean")) return "true";
  return "sample";
}

function collectRequiredFields(functionSource, fields) {
  const required = new Set();
  const requiredMessageMatches = functionSource.matchAll(
    /if\s*\(([^)]*)\)\s*{?\s*(?:await\s+t\.rollback\(\);\s*)?return\s+res\.status\(400\)\.json\(\{[^}]*message:\s*(["'`])([\s\S]*?)\2/gs
  );
  for (const match of requiredMessageMatches) {
    const condition = match[1];
    fields.forEach((field) => {
      if (new RegExp(`!${field}\\b`).test(condition)) required.add(field);
    });
  }
  return required;
}

function collectStatusMessages(functionSource) {
  const messages = [];
  const regex =
    /res\.status\((\d{3})\)\.json\(\{[\s\S]*?message:\s*(["'`])([\s\S]*?)\2[\s\S]*?\}\)/g;
  for (const match of functionSource.matchAll(regex)) {
    messages.push({
      status: Number(match[1]),
      message: sanitizeText(match[3]),
    });
  }
  return messages;
}

function collectDbOperations(functionSource) {
  const ops = [];
  const regex =
    /\b([A-Z][A-Za-z0-9_]+)\.(findAll|findOne|findByPk|create|update|destroy|bulkCreate|count|sum|findOrCreate|upsert)\b/g;
  for (const match of functionSource.matchAll(regex)) {
    ops.push({
      model: match[1],
      operation: match[2],
    });
  }
  return ops;
}

function inferAuth(endpoint) {
  const hasAuth = endpoint.middlewares.includes("requireAuth");
  const roleMid = endpoint.middlewares.find((item) => item.startsWith("requireRole:"));
  if (!hasAuth && !roleMid) {
    return {
      label: "No Authentication Required",
      header: null,
      errors: [],
    };
  }

  let label = "JWT Required";
  if (roleMid) {
    const roles = roleMid.replace("requireRole:", "").split("|");
    if (roles.length === 1 && roles[0] === "admin") label = "Admin Only";
    else if (roles.length === 1 && roles[0] === "user") label = "User Only";
    else if (roles.length === 1 && roles[0] === "delivery") label = "Delivery Only";
    else label = `${roles.map(titleCase).join(" / ")} Roles Only`;
  }

  const errors = [
    {
      status: 401,
      message: "Authorization token is required",
      reason: "No bearer token in Authorization header and no token cookie present.",
    },
    {
      status: 401,
      message: "User no longer exists",
      reason: "JWT decoded successfully but the referenced user record no longer exists.",
    },
    {
      status: 403,
      message: "Account is deactivated",
      reason: "Authenticated user's status is inactive.",
    },
    {
      status: 500,
      message: "Invalid or expired token",
      reason: "JWT verification failed inside requireAuth.",
    },
  ];
  if (roleMid) {
    errors.push({
      status: 403,
      message: `Access denied. Required role: ${roleMid.replace("requireRole:", "").replace(/\|/g, " or ")}`,
      reason: "Authenticated user does not have one of the allowed roles.",
    });
  }

  return {
    label,
    header: "Authorization: Bearer <JWT_TOKEN>",
    errors,
  };
}

function inferRequestHeaders(endpoint) {
  const headers = [
    { name: "Accept", value: "application/json", required: "Recommended" },
  ];

  if (endpoint.uploadField) {
    headers.push({
      name: "Content-Type",
      value: "multipart/form-data",
      required: "Yes",
    });
  } else if (endpoint.method !== "GET") {
    headers.push({
      name: "Content-Type",
      value: "application/json",
      required: "Yes",
    });
  }

  const auth = inferAuth(endpoint);
  if (auth.header) {
    headers.push({
      name: "Authorization",
      value: "Bearer <JWT_TOKEN>",
      required: "Yes",
    });
  }

  return headers;
}

function inferUrlParams(endpoint) {
  const params = [];
  const matches = endpoint.fullPath.match(/:([A-Za-z0-9_]+)/g) || [];
  matches.forEach((raw) => {
    const field = raw.slice(1);
    params.push({
      name: field,
      type: FIELD_TYPE_OVERRIDES[field] || (/id/i.test(field) ? "Integer" : "String"),
      required: "Yes",
      description: inferFieldDescription(field),
      example: inferExampleValue(field, FIELD_TYPE_OVERRIDES[field] || "String"),
    });
  });
  return params;
}

function buildRequestFields(endpoint, functionSource, sourceFields, sourceType) {
  const requiredSet = collectRequiredFields(functionSource, sourceFields);
  return sourceFields.map((field) => {
    const type = inferFieldType(field, functionSource);
    return {
      field,
      type,
      required: requiredSet.has(field) ? "Yes" : "Optional",
      defaultValue: guessDefaultValue(field, functionSource),
      validation: inferValidation(field, functionSource, requiredSet.has(field)),
      description: inferFieldDescription(field),
      example: inferExampleValue(field, type),
      source: sourceType,
    };
  });
}

function guessDefaultValue(field, functionSource) {
  const exact = functionSource.match(
    new RegExp(`${field}\\s*\\|\\|\\s*(["'\\w.-]+)`, "m")
  );
  if (exact) return sanitizeText(exact[1].replace(/["']/g, ""));
  if (new RegExp(`${field}\\s*\\?\\?\\s*(["'\\w.-]+)`).test(functionSource)) {
    const match = functionSource.match(new RegExp(`${field}\\s*\\?\\?\\s*(["'\\w.-]+)`));
    return sanitizeText(match[1].replace(/["']/g, ""));
  }
  return "-";
}

function inferValidation(field, functionSource, required) {
  const notes = [];
  if (required) notes.push("Required by controller");
  if (new RegExp(`Array\\.isArray\\(${field}\\)`).test(functionSource)) notes.push("Must be an array");
  if (new RegExp(`${field}\\.length === 0`).test(functionSource)) notes.push("Cannot be empty");
  if (new RegExp(`parseFloat\\(${field}\\)`).test(functionSource)) notes.push("Parsed as numeric");
  if (new RegExp(`parseInt\\(${field}\\)`).test(functionSource)) notes.push("Parsed as integer");
  if (/password/i.test(field) && field === "confirmPassword") notes.push("Must match password");
  if (/otp/i.test(field)) notes.push("Compared against stored OTP and expiry");
  if (/status/i.test(field)) notes.push("Accepted values depend on controller branch");
  return notes.length ? notes.join("; ") : "-";
}

function guessResponseShape(endpoint, functionSource, modelSchemas) {
  const successMatch = functionSource.match(
    /res\.status\((200|201)\)\.json\(\{([\s\S]*?)\}\)/m
  );
  if (!successMatch) {
    return {
      success: "Boolean",
      message: "String",
    };
  }

  const objectBody = successMatch[2];
  const lines = objectBody
    .split(/\n|,/)
    .map((line) => line.trim())
    .filter(Boolean);

  const shape = {};
  lines.forEach((line) => {
    if (/^success\s*:/.test(line) || line === "success: true" || line === "success") {
      shape.success = "Boolean";
      return;
    }

    const keyValue = line.match(/^([A-Za-z0-9_]+)\s*:\s*(.+)$/);
    if (!keyValue) {
      const clean = line.replace(/[{}]/g, "");
      if (MODEL_ALIAS_MAP[clean]) {
        shape[clean] = schemaDescriptorForModel(MODEL_ALIAS_MAP[clean], modelSchemas);
      }
      return;
    }

    const key = keyValue[1];
    const value = keyValue[2].replace(/,$/, "").trim();

    if (value === "true" || value === "false") {
      shape[key] = "Boolean";
      return;
    }
    if (/^["'`]/.test(value)) {
      shape[key] = "String";
      return;
    }
    if (/parseFloat|parseInt|amount|qty|price|balance|count|total|date|id/.test(value)) {
      shape[key] = inferSchemaTypeFromValue(key, value);
      return;
    }
    const normalized = value.replace(/[{},]/g, "").trim();
    if (MODEL_ALIAS_MAP[key]) {
      shape[key] = schemaDescriptorForModel(MODEL_ALIAS_MAP[key], modelSchemas);
      return;
    }
    if (MODEL_ALIAS_MAP[normalized]) {
      shape[key] = schemaDescriptorForModel(MODEL_ALIAS_MAP[normalized], modelSchemas);
      return;
    }
    if (/^Object\.values\(/.test(value) || /\[\]/.test(value)) {
      shape[key] = "Array";
      return;
    }
    if (/wallet_balance|due_amount|amount_charged|overage|refund/i.test(key)) {
      shape[key] = "Number";
      return;
    }
    shape[key] = "String";
  });

  if (!shape.success) shape.success = "Boolean";
  return shape;
}

function inferSchemaTypeFromValue(key, value) {
  if (/date/i.test(key) || /date/i.test(value)) return "String (date)";
  if (/id$/i.test(key) || /_id/i.test(key)) return "Integer";
  if (/count|qty|price|amount|balance|total|limit/i.test(key) || /parseFloat|parseInt/.test(value)) {
    return "Number";
  }
  return "String";
}

function schemaDescriptorForModel(modelName, modelSchemas, options = {}) {
  const schema = {};
  const model = modelSchemas[modelName];
  if (!model) return { __type: "Object" };

  Object.entries(model).forEach(([field, meta]) => {
    if (options.omit && options.omit.includes(field)) return;
    schema[field] = mapModelFieldType(meta.type);
  });
  return schema;
}

function mapModelFieldType(type) {
  const map = {
    INTEGER: "Integer",
    DECIMAL: "Number",
    DATE: "String (date-time)",
    DATEONLY: "String (date)",
    BOOLEAN: "Boolean",
    JSON: "Object",
    TEXT: "String",
    ENUM: "String",
    STRING: "String",
  };
  return map[type] || "String";
}

function flattenSchema(schema, prefix = "", modelSchemas = {}) {
  const rows = [];
  if (typeof schema === "string") {
    rows.push({
      field: prefix || "value",
      type: schema,
      nullable: "Unknown",
      description: prefix ? `${prefix} value` : "Value",
      example: exampleFromSchemaType(schema),
    });
    return rows;
  }

  if (Array.isArray(schema)) {
    rows.push({
      field: prefix || "items",
      type: "Array",
      nullable: "No",
      description: `${prefix || "items"} array`,
      example: "[]",
    });
    return rows;
  }

  Object.entries(schema || {}).forEach(([key, value]) => {
    const nextPrefix = prefix ? `${prefix}.${key}` : key;
    if (typeof value === "string") {
      rows.push({
        field: nextPrefix,
        type: value,
        nullable: "Unknown",
        description: inferFieldDescription(key),
        example: exampleFromSchemaType(value, key),
      });
    } else if (Array.isArray(value)) {
      rows.push({
        field: nextPrefix,
        type: "Array",
        nullable: "Unknown",
        description: inferFieldDescription(key),
        example: "[]",
      });
    } else {
      rows.push({
        field: nextPrefix,
        type: "Object",
        nullable: "Unknown",
        description: inferFieldDescription(key),
        example: "{...}",
      });
      rows.push(...flattenSchema(value, nextPrefix, modelSchemas));
    }
  });

  return rows;
}

function exampleFromSchemaType(type, fieldName = "") {
  if (type.includes("Integer")) return "1";
  if (type.includes("Number")) return "100";
  if (type.includes("Boolean")) return "true";
  if (type.includes("date-time")) return "2026-07-17T10:00:00.000Z";
  if (type.includes("date")) return "2026-07-20";
  if (type === "Array") return "[]";
  return inferExampleValue(fieldName || "value", type);
}

function buildErrorResponses(endpoint, functionSource) {
  const errors = new Map();
  const auth = inferAuth(endpoint);
  auth.errors.forEach((item) => {
    const key = `${item.status}-${item.message}`;
    errors.set(key, {
      status: item.status,
      message: item.message,
      reason: item.reason,
    });
  });

  collectStatusMessages(functionSource)
    .filter((item) => item.status >= 400)
    .forEach((item) => {
      const key = `${item.status}-${item.message}`;
      if (!errors.has(key)) {
        errors.set(key, {
          status: item.status,
          message: item.message,
          reason: "Controller validation or branch-specific error.",
        });
      }
    });

  if (![...errors.values()].some((item) => item.status === 500)) {
    errors.set("500-default", {
      status: 500,
      message: COMMON_ERROR_CODES[500].message,
      reason: COMMON_ERROR_CODES[500].reason,
    });
  }

  return [...errors.values()].sort((a, b) => a.status - b.status);
}

function summarizeDbOps(dbOps) {
  const byModel = {};
  dbOps.forEach(({ model, operation }) => {
    if (!byModel[model]) byModel[model] = new Set();
    byModel[model].add(operation);
  });

  return Object.entries(byModel).map(([model, ops]) => ({
    model,
    operations: [...ops].sort().join(", "),
  }));
}

function parseFrontendUsage() {
  const files = walkFiles(path.join(FRONTEND_DIR, "src")).filter((file) =>
    /\.(js|jsx|ts|tsx)$/.test(file)
  );

  const usage = {};
  const regex =
    /api\.(get|post|put|patch|delete)\(\s*([`'"])([\s\S]*?)\2/g;

  files.forEach((file) => {
    const rel = path.relative(ROOT, file).replace(/\\/g, "/");
    const content = safeRead(file);
    for (const match of content.matchAll(regex)) {
      const method = match[1].toUpperCase();
      const route = match[3];
      const key = `${method} ${route}`;
      if (!usage[key]) usage[key] = [];
      usage[key].push(rel);
    }
  });

  return usage;
}

function walkFiles(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files = [];
  entries.forEach((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...walkFiles(full));
    else files.push(full);
  });
  return files;
}

function normalizeFrontendRoute(route) {
  return route.replace(/\$\{[^}]+\}/g, ":param");
}

function matchFrontendUsage(endpoint, frontendUsage) {
  const exactKeys = [
    `${endpoint.method} ${endpoint.fullPath.replace("/api", "")}`,
    `${endpoint.method} ${endpoint.fullPath}`,
  ];

  for (const key of exactKeys) {
    if (frontendUsage[key]) return frontendUsage[key];
  }

  const normalizedEndpoint = endpoint.fullPath
    .replace("/api", "")
    .replace(/:[A-Za-z0-9_]+/g, ":param");

  for (const [key, files] of Object.entries(frontendUsage)) {
    const [, route] = key.split(" ");
    if (normalizeFrontendRoute(route) === normalizedEndpoint) return files;
  }

  return [];
}

function buildFrontendGuide(endpoint, matchedFiles) {
  if (!matchedFiles.length) {
    return {
      screen: "Not directly called in the current React frontend codebase",
      whenToCall:
        endpoint.method === "GET"
          ? "Use when the corresponding screen needs to read this data."
          : "Use when the corresponding user or admin action needs to mutate backend state.",
      sequence: "No direct frontend usage was found during the code scan.",
      tokenHandling: inferAuth(endpoint).header
        ? "Use the shared axios client; it injects Authorization from localStorage and also sends cookies."
        : "No token is required by the backend for this endpoint.",
      loadingState:
        endpoint.method === "GET"
          ? "Show a page or section loader while the request is in flight."
          : "Disable the submit or action button while the request is in flight.",
      emptyState:
        endpoint.method === "GET"
          ? "Render an empty-state message when the response collection is empty."
          : "Not usually applicable unless the endpoint response returns an empty collection.",
      errorState:
        "Display the backend message from error.response.data.message when present and fall back to a generic error banner.",
    };
  }

  const labels = matchedFiles.map(
    (file) => FRONTEND_LABEL_OVERRIDES[file] || file.replace(/^Frontend\/src\//, "")
  );
  const uniqueLabels = [...new Set(labels)];

  return {
    screen: uniqueLabels.join("; "),
    whenToCall:
      endpoint.method === "GET"
        ? "Called on page load, refresh, or after a related mutation invalidates the existing client state."
        : "Called from a form submit or button click on the listed screen(s).",
    sequence:
      inferSequenceHint(endpoint),
    tokenHandling: inferAuth(endpoint).header
      ? "The current frontend uses Frontend/src/api/axios.js, which sends Authorization: Bearer <token> from localStorage and also enables withCredentials."
      : "Public endpoint; the shared axios client can still call it without a token.",
    loadingState:
      endpoint.method === "GET"
        ? "Show skeletons or section loading while data is fetched."
        : "Disable the action button and show inline progress text until the request completes.",
    emptyState:
      endpoint.method === "GET"
        ? "Render an empty-state card or helper text when no records are returned."
        : "Not usually applicable unless the response list is empty after a mutation refresh.",
    errorState:
      "Surface the backend message to the user. The current frontend often uses alert/toast or inline status text for this.",
  };
}

function inferSequenceHint(endpoint) {
  const key = `${endpoint.method} ${endpoint.fullPath}`;
  if (key === "POST /api/auth/register") return "Register -> verify OTP -> login state established.";
  if (key === "POST /api/auth/verify-registration-otp") return "Called after registration on the OTP verification screen.";
  if (key === "POST /api/auth/forgot-password") return "Forgot password flow step 1 -> verify OTP -> reset password.";
  if (key === "POST /api/subscribe") return "Create subscription shell -> fetch available dates -> confirm start date -> seasonal selection.";
  if (key === "POST /api/confirm-start-date") return "Call only after subscribe returns subscription_id.";
  if (key === "POST /api/select-seasonal") return "Call after confirm-start-date when the seasonal customization step is submitted.";
  if (key === "POST /api/payment/phonepe/initiate") return "Initiate -> redirect to PhonePe -> user returns to payment-status screen -> GET payment/phonepe/status/:txnId.";
  if (key === "GET /api/payment/phonepe/status/:txnId") return "Called on PaymentStatusPage after the PhonePe redirect returns to the frontend.";
  if (key === "POST /api/water/subscribe") return "Water purchase -> available dates -> confirm water start date.";
  if (key === "POST /api/water/confirm-start-date") return "Call only after water subscription creation returns water_subscription_id.";
  if (key === "PUT /api/admin/orders/pack") return "Admin loads grouped orders -> optionally assigns batch -> packs quantities -> marks ready for delivery.";
  if (key === "POST /api/mark-delivered") return "Delivery partner accepts or receives assigned orders, then submits proof to complete delivery.";
  return "Call in the order dictated by the surrounding screen flow and dependent identifiers returned by earlier endpoints.";
}

function deriveModuleTitle(endpoint) {
  return MODULE_TITLES[endpoint.moduleKey] || titleCase(endpoint.moduleKey);
}

function buildEndpointRecord(endpoint, modelSchemas, frontendUsage) {
  const functionSource = extractFunctionSource(endpoint.controllerContent, endpoint.controllerName);
  const requestBodyFields = buildRequestFields(
    endpoint,
    functionSource,
    collectDestructuredFields(functionSource, "body"),
    "body"
  );
  const queryFields = buildRequestFields(
    endpoint,
    functionSource,
    collectDestructuredFields(functionSource, "query"),
    "query"
  );
  const dbOps = summarizeDbOps(collectDbOperations(functionSource));
  const auth = inferAuth(endpoint);
  const responseShape = guessResponseShape(endpoint, functionSource, modelSchemas);
  const responseFields = flattenSchema(responseShape, "", modelSchemas);
  const matchedFrontendFiles = matchFrontendUsage(endpoint, frontendUsage);
  const override = ENDPOINT_OVERRIDES[`${endpoint.method} ${endpoint.fullPath}`] || {};

  return {
    method: endpoint.method,
    fullPath: endpoint.fullPath,
    fullUrl:
      endpoint.fullPath === "/health" || endpoint.fullPath === "/"
        ? `https://ranbhaji.onrender.com${endpoint.fullPath}`
        : `${BASE_URL}${endpoint.fullPath.replace("/api", "")}`,
    apiName: override.apiName || humanizeMethodPath(endpoint.method, endpoint.fullPath),
    moduleKey: override.moduleKey || endpoint.moduleKey,
    moduleTitle: deriveModuleTitle({
      ...endpoint,
      moduleKey: override.moduleKey || endpoint.moduleKey,
    }),
    purpose:
      override.purpose ||
      `${titleCase(endpoint.controllerName)} endpoint derived from ${endpoint.controllerName} in ${path.basename(endpoint.controllerFile)}.`,
    authentication: auth,
    headers: inferRequestHeaders(endpoint),
    urlParams: inferUrlParams(endpoint),
    queryParams: queryFields,
    requestBody: requestBodyFields,
    fileUpload: endpoint.uploadField ? FILE_UPLOAD_META[endpoint.uploadField] : null,
    validationRules: buildValidationRules(functionSource, requestBodyFields, queryFields, endpoint),
    businessLogic: buildBusinessLogic(functionSource, dbOps, endpoint, override),
    successResponseSchema: responseShape,
    responseFields,
    errorResponses: buildErrorResponses(endpoint, functionSource),
    dbOperations: dbOps,
    notes: override.notes || buildNotes(functionSource, endpoint),
    requestExamples: buildRequestExamples(endpoint, requestBodyFields),
    frontendGuide: buildFrontendGuide(endpoint, matchedFrontendFiles),
    controllerName: endpoint.controllerName,
    routeFile: endpoint.routeFile,
    controllerFile: path.relative(ROOT, endpoint.controllerFile).replace(/\\/g, "/"),
    functionSource,
    liveApi: override.liveApi !== false,
  };
}

function buildValidationRules(functionSource, requestBodyFields, queryFields, endpoint) {
  const validations = [];
  [...requestBodyFields, ...queryFields].forEach((field) => {
    if (field.required === "Yes") validations.push(`${field.field} is required.`);
    if (field.validation !== "-" && !validations.includes(field.validation)) {
      validations.push(`${titleCase(field.field)}: ${field.validation}.`);
    }
  });

  collectStatusMessages(functionSource)
    .filter((entry) => entry.status === 400 || entry.status === 409)
    .forEach((entry) => {
      const message = entry.message.endsWith(".") ? entry.message : `${entry.message}.`;
      if (!validations.includes(message)) validations.push(message);
    });

  if (endpoint.uploadField) {
    validations.push(
      `${endpoint.uploadField} upload uses the shared multer middleware with a 5 MB limit and extension allow-list enforcement.`
    );
  }

  return validations.length ? validations : ["No explicit controller-level validation beyond auth and model lookups was detected."];
}

function buildBusinessLogic(functionSource, dbOps, endpoint, override) {
  if (override.businessLogic) return override.businessLogic;

  const steps = [];
  if (inferAuth(endpoint).header) steps.push("Validates the caller through JWT auth middleware before entering the controller.");
  if (functionSource.includes("sequelize.transaction")) steps.push("Runs inside a Sequelize transaction so dependent writes commit or roll back together.");
  dbOps.forEach((op) => {
    steps.push(`${op.model}: ${op.operations}.`);
  });
  if (functionSource.includes("WalletTransaction.create")) steps.push("Writes a wallet ledger entry when balance-affecting logic executes.");
  if (functionSource.includes("PaymentTransaction.create")) steps.push("Writes a payment transaction record for audit and payment-status tracking.");
  if (functionSource.includes("Notification.create")) steps.push("Creates notification records as part of the workflow.");
  if (functionSource.includes("DeliverySchedule.bulkCreate")) steps.push("Generates delivery schedules in bulk.");
  if (functionSource.includes("DeliveryItem.bulkCreate")) steps.push("Generates delivery item rows in bulk when required.");
  if (functionSource.includes("bulkCreate") && !functionSource.includes("DeliverySchedule.bulkCreate")) steps.push("Creates related rows in bulk where the controller builds arrays of child records.");
  if (functionSource.includes("res.cookie")) steps.push("Sets the auth token cookie in addition to returning JSON.");
  if (functionSource.includes("bcrypt.hash")) steps.push("Hashes passwords with bcrypt before persisting them.");
  if (functionSource.includes("jwt.sign")) steps.push("Generates a JWT token signed with JWT_SECRET.");
  if (functionSource.includes("req.file")) steps.push("Reads an uploaded file from the shared multer middleware and stores the relative /uploads path.");
  return steps.length ? steps : ["Performs the controller action and returns a JSON response."];
}

function buildNotes(functionSource, endpoint) {
  const notes = [];
  if (functionSource.includes("order: [[")) notes.push("The response ordering is explicitly defined in the controller.");
  if (functionSource.includes("limit:")) notes.push("The controller enforces a maximum row count on the response.");
  if (functionSource.includes("Op.between")) notes.push("Supports date-range filtering.");
  if (functionSource.includes("req.query")) notes.push("Supports query-based filtering or reporting.");
  if (functionSource.includes("update({ status: 'inactive'")) notes.push("Uses status-based soft deactivation instead of physical deletion.");
  if (functionSource.includes("is_deleted")) notes.push("Uses is_deleted for soft-delete behavior.");
  if (functionSource.includes("DeliverySchedule.update(\n         { status: 'skipped' }")) notes.push("Skips future schedules instead of deleting them.");
  if (functionSource.includes("now.getHours()") || functionSource.includes("hour < 20")) notes.push("Contains an 8 PM order cutoff rule.");
  if (functionSource.includes("Sunday")) notes.push("Contains Sunday date shifting logic.");
  return notes;
}

function buildRequestExamples(endpoint, requestBodyFields) {
  const body = {};
  requestBodyFields.forEach((field) => {
    if (field.type === "Array<Object>") {
      body[field.field] = [{ id: 1 }];
    } else if (field.type.startsWith("Array")) {
      body[field.field] = [];
    } else if (field.type.includes("Boolean")) {
      body[field.field] = true;
    } else if (field.type.includes("Integer")) {
      body[field.field] = 1;
    } else if (field.type.includes("Number")) {
      body[field.field] = 100;
    } else {
      body[field.field] = inferExampleValue(field.field, field.type);
    }
  });

  const headers = [];
  if (endpoint.authentication.header) headers.push(`-H "Authorization: Bearer <JWT_TOKEN>"`);
  if (endpoint.uploadField) {
    headers.push(`-F "${endpoint.uploadField}=@/path/to/file.jpg"`);
    requestBodyFields.forEach((field) => {
      headers.push(`-F "${field.field}=${body[field.field]}"`);
    });
  } else if (endpoint.method !== "GET" && Object.keys(body).length) {
    headers.push(`-H "Content-Type: application/json"`);
    headers.push(`-d '${JSON.stringify(body, null, 2)}'`);
  }

  const curl = [
    `curl -X ${endpoint.method}`,
    `"${endpoint.fullUrl}"`,
    ...headers,
  ].join(" \\\n  ");

  const fetchLines = [];
  fetchLines.push(`fetch("${endpoint.fullUrl}", {`);
  fetchLines.push(`  method: "${endpoint.method}",`);
  const headerMap = {};
  if (endpoint.authentication.header) headerMap.Authorization = "Bearer <JWT_TOKEN>";
  if (!endpoint.uploadField && endpoint.method !== "GET") headerMap["Content-Type"] = "application/json";
  if (Object.keys(headerMap).length) {
    fetchLines.push(`  headers: ${JSON.stringify(headerMap, null, 2)},`);
  }
  if (!endpoint.uploadField && endpoint.method !== "GET" && Object.keys(body).length) {
    fetchLines.push(`  body: JSON.stringify(${JSON.stringify(body, null, 2)})`);
  }
  fetchLines.push(`});`);

  const axiosLines = [];
  axiosLines.push(`api.${endpoint.method.toLowerCase()}(`);
  axiosLines.push(`  "${endpoint.fullPath.replace("/api", "")}",`);
  if (endpoint.method === "GET") {
    axiosLines.push(`  { params: ${JSON.stringify(body, null, 2)} }`);
  } else {
    axiosLines.push(`  ${JSON.stringify(body, null, 2)}`);
  }
  axiosLines.push(`);`);

  return {
    curl,
    fetch: fetchLines.join("\n"),
    axios: axiosLines.join("\n"),
  };
}

function buildCommonSections(modelSchemas, endpointRecords) {
  const envUsage = [
    ["PORT", "Selects the HTTP port; defaults to 3000 in Backend/index.js."],
    ["NODE_ENV", "Controls cookie security flags and CORS origin behavior."],
    ["FRONTEND_URL", "Used for production CORS allow-list and PhonePe redirect URLs."],
    ["JWT_SECRET", "Signs login and OTP-verification tokens and validates bearer tokens."],
    ["DB_NAME / DB_USER / DB_PASSWORD / DB_HOST / DB_PORT", "Configure the Sequelize MySQL connection."],
    ["PHONEPE_*", "Configure merchant, checksum, and status URLs for PhonePe payment flows."],
    ["IMAGEKIT_*", "Configure the unused ImageKit utility present in the repository."],
  ];

  const liveEndpoints = endpointRecords.filter((record) => record.liveApi);
  const authSummary = [
    "The current frontend uses Frontend/src/api/axios.js with baseURL = VITE_API_URL + /api.",
    "JWT is returned in JSON and stored in localStorage by the frontend. Requests send Authorization: Bearer <token> and also include cookies via withCredentials.",
    "The backend also accepts a token cookie named token for routes protected by requireAuth.",
    "Protected routes can additionally enforce admin, user, or delivery roles through requireRole([...]).",
  ];

  return { envUsage, authSummary, liveEndpoints, modelSchemas };
}

function buildDoc(endpointRecords, modelSchemas) {
  const common = buildCommonSections(modelSchemas, endpointRecords);
  const children = [];

  children.push(
    new Paragraph({
      text: "Ranbhaji Backend API Documentation",
      heading: HeadingLevel.TITLE,
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 },
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [new TextRun({ text: "Professional API reference for frontend developers", italics: true })],
      spacing: { after: 160 },
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [new TextRun({ text: `Base API URL: ${BASE_URL}` })],
      spacing: { after: 80 },
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [new TextRun({ text: `Generated on: ${GENERATION_DATE}` })],
      spacing: { after: 80 },
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [new TextRun({ text: "Version: 1.0 (code-verified)" })],
      pageBreakBefore: false,
      spacing: { after: 400 },
    }),
    new Paragraph({ pageBreakBefore: true, text: "" }),
    new Paragraph({
      text: "Table of Contents",
      heading: HeadingLevel.HEADING_1,
      spacing: { after: 120 },
    }),
    new TableOfContents("Contents", {
      hyperlink: true,
      headingStyleRange: "1-3",
    }),
    new Paragraph({ pageBreakBefore: true, text: "" }),
    new Paragraph({
      text: "Project Overview",
      heading: HeadingLevel.HEADING_1,
    }),
    new Paragraph({
      children: [
        new TextRun("This document was generated by tracing the mounted Express routes, controllers, auth middleware, Sequelize models, utility functions, and current React frontend integrations found in the repository."),
      ],
      spacing: { after: 120 },
    }),
    new Paragraph({
      text: "Authentication",
      heading: HeadingLevel.HEADING_2,
    })
  );

  common.authSummary.forEach((line) => {
    children.push(bullet(line));
  });

  children.push(
    new Paragraph({
      text: "Environment Variable Usage",
      heading: HeadingLevel.HEADING_2,
      spacing: { before: 160 },
    }),
    createTable(
      ["Variable", "Observed Usage"],
      common.envUsage.map(([name, usage]) => [name, usage])
    ),
    new Paragraph({
      text: "Complete Endpoint Inventory",
      heading: HeadingLevel.HEADING_2,
      spacing: { before: 160 },
    }),
    createTable(
      ["Method", "Path", "Module", "Auth"],
      common.liveEndpoints.map((record) => [
        record.method,
        record.fullPath,
        record.moduleTitle,
        record.authentication.label,
      ])
    )
  );

  const grouped = groupBy(common.liveEndpoints, (record) => record.moduleTitle);
  Object.keys(grouped)
    .sort()
    .forEach((moduleTitle) => {
      children.push(
        new Paragraph({
          text: moduleTitle,
          heading: HeadingLevel.HEADING_1,
          pageBreakBefore: true,
        })
      );

      grouped[moduleTitle].forEach((record) => {
        children.push(
          new Paragraph({
            text: record.apiName,
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 120, after: 80 },
          }),
          labelledParagraph("Endpoint", `${record.method} ${record.fullUrl}`),
          labelledParagraph("HTTP Method", record.method),
          labelledParagraph("Purpose", record.purpose),
          labelledParagraph(
            "Authentication",
            record.authentication.header
              ? `${record.authentication.label}. Header format: ${record.authentication.header}`
              : record.authentication.label
          ),
          new Paragraph({
            text: "Headers Required",
            heading: HeadingLevel.HEADING_3,
          }),
          createTable(
            ["Header", "Value", "Required"],
            record.headers.map((header) => [header.name, header.value, header.required])
          ),
          new Paragraph({
            text: "URL Parameters",
            heading: HeadingLevel.HEADING_3,
          }),
          record.urlParams.length
            ? createTable(
                ["Name", "Type", "Required", "Description", "Example"],
                record.urlParams.map((item) => [
                  item.name,
                  item.type,
                  item.required,
                  item.description,
                  item.example,
                ])
              )
            : fallbackParagraph("None"),
          new Paragraph({
            text: "Query Parameters",
            heading: HeadingLevel.HEADING_3,
          }),
          record.queryParams.length
            ? createTable(
                ["Field", "Type", "Required", "Default", "Validation", "Description", "Example"],
                record.queryParams.map((field) => [
                  field.field,
                  field.type,
                  field.required,
                  field.defaultValue,
                  field.validation,
                  field.description,
                  field.example,
                ])
              )
            : fallbackParagraph("None"),
          new Paragraph({
            text: "Request Payload",
            heading: HeadingLevel.HEADING_3,
          }),
          record.requestBody.length
            ? createTable(
                ["Field", "Type", "Required", "Default", "Validation", "Description", "Example"],
                record.requestBody.map((field) => [
                  field.field,
                  field.type,
                  field.required,
                  field.defaultValue,
                  field.validation,
                  field.description,
                  field.example,
                ])
              )
            : fallbackParagraph("No JSON body fields detected in the controller."),
          new Paragraph({
            text: "File Upload",
            heading: HeadingLevel.HEADING_3,
          }),
          record.fileUpload
            ? createTable(
                ["Property", "Value"],
                [
                  ["Content-Type", record.fileUpload.contentType],
                  ["Field Name", record.fileUpload.fieldName],
                  ["Allowed Types", record.fileUpload.allowedTypes],
                  ["Maximum Files", String(record.fileUpload.maxFiles)],
                  ["Maximum Size", record.fileUpload.maxSize],
                  ["Storage", record.fileUpload.storage],
                ]
              )
            : fallbackParagraph("This endpoint does not use req.file or upload middleware."),
          new Paragraph({
            text: "Validation Rules",
            heading: HeadingLevel.HEADING_3,
          })
        );

        record.validationRules.forEach((rule) => children.push(bullet(rule)));

        children.push(
          new Paragraph({
            text: "Business Logic",
            heading: HeadingLevel.HEADING_3,
          })
        );
        record.businessLogic.forEach((step) => children.push(bullet(step)));

        children.push(
          new Paragraph({
            text: "Success Response",
            heading: HeadingLevel.HEADING_3,
          }),
          codeBlock(JSON.stringify(renderExampleFromSchema(record.successResponseSchema), null, 2)),
          new Paragraph({
            text: "Response Field Documentation",
            heading: HeadingLevel.HEADING_3,
          }),
          createTable(
            ["Field", "Type", "Nullable", "Description", "Example"],
            record.responseFields.map((field) => [
              field.field,
              field.type,
              field.nullable,
              field.description,
              field.example,
            ])
          ),
          new Paragraph({
            text: "Error Responses",
            heading: HeadingLevel.HEADING_3,
          }),
          createTable(
            ["Status", "Message", "Reason", "Example JSON"],
            record.errorResponses.map((error) => [
              String(error.status),
              error.message,
              error.reason,
              JSON.stringify(
                {
                  success: false,
                  message: error.message,
                },
                null,
                2
              ),
            ])
          ),
          new Paragraph({
            text: "Database Operations",
            heading: HeadingLevel.HEADING_3,
          }),
          record.dbOperations.length
            ? createTable(
                ["Model", "Operations"],
                record.dbOperations.map((entry) => [entry.model, entry.operations])
              )
            : fallbackParagraph("No direct model operations were detected in the endpoint body."),
          new Paragraph({
            text: "Notes",
            heading: HeadingLevel.HEADING_3,
          })
        );

        if (record.notes.length) {
          record.notes.forEach((note) => children.push(bullet(note)));
        } else {
          children.push(fallbackParagraph("No additional endpoint-specific notes."));
        }

        children.push(
          new Paragraph({
            text: "Response Schema",
            heading: HeadingLevel.HEADING_3,
          }),
          codeBlock(JSON.stringify(renderSchemaSummary(record.successResponseSchema), null, 2)),
          new Paragraph({
            text: "Request Examples",
            heading: HeadingLevel.HEADING_3,
          }),
          labelledParagraph("curl", ""),
          codeBlock(record.requestExamples.curl),
          labelledParagraph("JavaScript fetch", ""),
          codeBlock(record.requestExamples.fetch),
          labelledParagraph("Axios", ""),
          codeBlock(record.requestExamples.axios),
          new Paragraph({
            text: "Frontend Integration Guide",
            heading: HeadingLevel.HEADING_3,
          }),
          createTable(
            ["Aspect", "Details"],
            [
              ["Screen(s)", record.frontendGuide.screen],
              ["When to call", record.frontendGuide.whenToCall],
              ["Sequence", record.frontendGuide.sequence],
              ["Token handling", record.frontendGuide.tokenHandling],
              ["Loading state", record.frontendGuide.loadingState],
              ["Empty state", record.frontendGuide.emptyState],
              ["Error state", record.frontendGuide.errorState],
            ]
          )
        );
      });
    });

  children.push(
    new Paragraph({
      text: "Data Models",
      heading: HeadingLevel.HEADING_1,
      pageBreakBefore: true,
    })
  );

  Object.keys(modelSchemas)
    .sort()
    .forEach((modelName) => {
      children.push(
        new Paragraph({
          text: modelName,
          heading: HeadingLevel.HEADING_2,
        }),
        createTable(
          ["Field", "Type", "Allow Null", "Primary Key", "Default"],
          Object.entries(modelSchemas[modelName]).map(([field, meta]) => [
            field,
            mapModelFieldType(meta.type),
            meta.allowNull ? "Yes" : "No",
            meta.primaryKey ? "Yes" : "No",
            sanitizeText(
              meta.defaultValue === null || meta.defaultValue === undefined
                ? "-"
                : typeof meta.defaultValue === "object"
                  ? JSON.stringify(meta.defaultValue)
                  : String(meta.defaultValue)
            ),
          ])
        )
      );
    });

  children.push(
    new Paragraph({
      text: "Non-Live or Unmounted Code Observations",
      heading: HeadingLevel.HEADING_1,
      pageBreakBefore: true,
    }),
    bullet("Backend/routes/category.route.js exists but is not mounted in Backend/index.js, so its endpoints are not live."),
    bullet("The category route references authMiddleware and adminMiddleware names that do not exist in the current auth middleware file."),
    bullet("Backend/middlewares/upload.middleware.js and the ImageKit utility exist in the repository but are not used by the mounted API routes scanned in this document."),
    bullet("The nightly cron job in Backend/utils/cronJobs.js materially affects tomorrow's deliveries by locking schedules, generating delivery items, and creating notifications."),
    new Paragraph({
      text: "Frontend Integration Matrix",
      heading: HeadingLevel.HEADING_1,
      pageBreakBefore: true,
    }),
    createTable(
      ["Endpoint", "Screens"],
      endpointRecords
        .filter((record) => record.liveApi)
        .map((record) => [
          `${record.method} ${record.fullPath}`,
          record.frontendGuide.screen,
        ])
    )
  );

  return new Document({
    creator: "OpenAI Codex",
    title: "Ranbhaji Backend API Documentation",
    description: "Verified API documentation generated from the Node.js/Express backend project.",
    sections: [
      {
        headers: {
          default: new Header({
            children: [
              new Paragraph({
                children: [new TextRun({ text: "Ranbhaji API Documentation", bold: true })],
              }),
            ],
          }),
        },
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun("Page "),
                  PageNumber.CURRENT,
                ],
              }),
            ],
          }),
        },
        children,
      },
    ],
    styles: {
      paragraphStyles: [
        {
          id: "Code",
          name: "Code",
          run: {
            font: "Consolas",
            size: 20,
          },
          paragraph: {
            spacing: { after: 60 },
          },
        },
      ],
    },
  });
}

function renderSchemaSummary(schema) {
  if (typeof schema === "string") return schema;
  const out = {};
  Object.entries(schema || {}).forEach(([key, value]) => {
    out[key] = typeof value === "string" ? value : renderSchemaSummary(value);
  });
  return out;
}

function renderExampleFromSchema(schema) {
  if (typeof schema === "string") {
    return scalarExample(schema);
  }

  const out = {};
  Object.entries(schema || {}).forEach(([key, value]) => {
    out[key] = typeof value === "string" ? scalarExample(value, key) : renderExampleFromSchema(value);
  });
  return out;
}

function scalarExample(type, key = "") {
  if (type.includes("Boolean")) return true;
  if (type.includes("Integer")) return 1;
  if (type.includes("Number")) return 100;
  if (type.includes("date-time")) return "2026-07-17T10:00:00.000Z";
  if (type.includes("date")) return "2026-07-20";
  if (type === "Array") return [];
  return inferExampleValue(key, type);
}

function labelledParagraph(label, value) {
  return new Paragraph({
    spacing: { after: 60 },
    children: [
      new TextRun({ text: `${label}: `, bold: true }),
      new TextRun(sanitizeText(value || "")),
    ],
  });
}

function fallbackParagraph(text) {
  return new Paragraph({
    children: [new TextRun({ text: sanitizeText(text), italics: true })],
    spacing: { after: 60 },
  });
}

function bullet(text) {
  return new Paragraph({
    text: sanitizeText(text),
    bullet: {
      level: 0,
    },
    spacing: { after: 40 },
  });
}

function codeBlock(text) {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: tableBorders("E2E8F0"),
    rows: [
      new TableRow({
        children: [
          new TableCell({
            shading: {
              fill: "F8FAFC",
              type: ShadingType.CLEAR,
              color: "auto",
            },
            children: text
              .split("\n")
              .map((line) =>
                new Paragraph({
                  style: "Code",
                  children: [new TextRun({ text: sanitizeText(line), font: "Consolas", size: 18 })],
                })
              ),
          }),
        ],
      }),
    ],
  });
}

function createTable(headers, rows) {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: tableBorders("D1D5DB"),
    rows: [
      new TableRow({
        tableHeader: true,
        children: headers.map(
          (header) =>
            new TableCell({
              shading: {
                fill: "E2E8F0",
                type: ShadingType.CLEAR,
                color: "auto",
              },
              children: [new Paragraph({ children: [new TextRun({ text: sanitizeText(header), bold: true })] })],
            })
        ),
      }),
      ...rows.map(
        (row) =>
          new TableRow({
            children: row.map(
              (cell) =>
                new TableCell({
                  children: [new Paragraph({ text: sanitizeText(cell) })],
                })
            ),
          })
      ),
    ],
  });
}

function tableBorders(color) {
  return {
    top: { style: BorderStyle.SINGLE, size: 1, color },
    bottom: { style: BorderStyle.SINGLE, size: 1, color },
    left: { style: BorderStyle.SINGLE, size: 1, color },
    right: { style: BorderStyle.SINGLE, size: 1, color },
    insideHorizontal: { style: BorderStyle.SINGLE, size: 1, color },
    insideVertical: { style: BorderStyle.SINGLE, size: 1, color },
  };
}

function groupBy(items, keyFn) {
  return items.reduce((acc, item) => {
    const key = keyFn(item);
    if (!acc[key]) acc[key] = [];
    acc[key].push(item);
    return acc;
  }, {});
}

async function main() {
  const modelSchemas = loadModelSchemas();
  const endpoints = parseRoutes();
  const frontendUsage = parseFrontendUsage();

  const nonApiEndpoints = [
    {
      method: "GET",
      routeFile: "index.js",
      controllerFile: path.join(BACKEND_DIR, "index.js"),
      controllerContent: safeRead(path.join(BACKEND_DIR, "index.js")),
      controllerName: "health",
      moduleKey: "dashboard",
      routePath: "/health",
      fullPath: "/health",
      middlewares: [],
      uploadField: null,
    },
    {
      method: "GET",
      routeFile: "index.js",
      controllerFile: path.join(BACKEND_DIR, "index.js"),
      controllerContent: safeRead(path.join(BACKEND_DIR, "index.js")),
      controllerName: "root",
      moduleKey: "dashboard",
      routePath: "/",
      fullPath: "/",
      middlewares: [],
      uploadField: null,
    },
  ];

  const endpointRecords = [...endpoints, ...nonApiEndpoints]
    .map((endpoint) => buildEndpointRecord(endpoint, modelSchemas, frontendUsage))
    .sort((a, b) => {
      if (a.liveApi !== b.liveApi) return a.liveApi ? -1 : 1;
      return a.fullPath.localeCompare(b.fullPath) || a.method.localeCompare(b.method);
    });

  fs.writeFileSync(OUTPUT_JSON, JSON.stringify(endpointRecords, null, 2));

  const doc = buildDoc(endpointRecords, modelSchemas);
  const buffer = await Packer.toBuffer(doc);
  fs.writeFileSync(OUTPUT_DOCX, buffer);

  console.log(`Analysis JSON written to ${OUTPUT_JSON}`);
  console.log(`DOCX written to ${OUTPUT_DOCX}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
