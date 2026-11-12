import React, { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import api from "../../api/axios";
import AdjustWalletModal from "./AdjustWalletModal";

export default function AdminUserHistory() {
  const location = useLocation();
  const [users, setUsers] = useState([]);
  const [packages, setPackages] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState(location.state?.selectedUserId || "");
  const [analytics, setAnalytics] = useState(null);
  const [walletTransactions, setWalletTransactions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");
  const [currentUserInfo, setCurrentUserInfo] = useState(null);

  const [showDiscountModal, setShowDiscountModal] = useState(false);
  const [discountPercent, setDiscountPercent] = useState("");
  const [savingDiscount, setSavingDiscount] = useState(false);

  // Water Discount states
  const [showWaterDiscountModal, setShowWaterDiscountModal] = useState(false);
  const [waterDiscounts, setWaterDiscounts] = useState([]);
  const [waterProducts, setWaterProducts] = useState([]);
  const [waterDiscountForm, setWaterDiscountForm] = useState({ product_id: "", discount_percentage: "", bottles_count: "1" });
  const [savingWaterDiscount, setSavingWaterDiscount] = useState(false);
  const [deletingWaterDiscountId, setDeletingWaterDiscountId] = useState(null);
  const [waterDiscountError, setWaterDiscountError] = useState("");

  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showRenewModal, setShowRenewModal] = useState(false);
  const [showBatchModal, setShowBatchModal] = useState(false);
  const [showWalletModal, setShowWalletModal] = useState(false);
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [addressForm, setAddressForm] = useState({
    address_line: "",
    city: "Nagpur",
    pincode: "",
    landmark: "",
    zone: ""
  });
  const [saving, setSaving] = useState(false);
  const [actionMsg, setActionMsg] = useState("");
  const [batches, setBatches] = useState([]);
  
  const [batchFormData, setBatchFormData] = useState({
    sub_id: "",
    is_water: false,
    batch_id: ""
  });

  const [formData, setFormData] = useState({
    package_id: "",
    type: "monthly",
    start_date: "",
    address_id: ""
  });

  // Serving & Products Edit states
  const [editingServing, setEditingServing] = useState(null);
  const [editingPackage, setEditingPackage] = useState(null);
  const [servingFixedItems, setServingFixedItems] = useState({});
  const [servingSeasonalItems, setServingSeasonalItems] = useState({});
  const [savingServingItems, setSavingServingItems] = useState(false);
  const [servingItemsError, setServingItemsError] = useState("");
  const [statusUpdatingId, setStatusUpdatingId] = useState(null);
  const [deductingServingId, setDeductingServingId] = useState(null);

  // Reschedule Serving states
  const [rescheduleModal, setRescheduleModal] = useState({
    isOpen: false,
    serving: null,
    pkg: null,
    servingIndex: 0,
    newDate: '',
    loading: false,
    error: ''
  });

  // Fetch all users & packages on mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [usersRes, pkgRes, batchesRes, waterProdRes] = await Promise.all([
          api.get("/admin/users"),
          api.get("/packages"),
          api.get("/user/batches"),
          api.get("/products?category=water&status=active")
        ]);
        setUsers(usersRes.data.users || []);
        setPackages(pkgRes.data.packages || []);
        setBatches(batchesRes.data.batches || []);
        setWaterProducts(waterProdRes.data.products || []);
      } catch (err) {
        setMsg(`❌ Failed to load data: ${err.response?.data?.message || err.message}`);
      }
    };
    fetchData();
  }, []);

  useEffect(() => {
    if (location.state?.selectedUserId) {
      setSelectedUserId(location.state.selectedUserId);
    }
  }, [location.state]);

  const fetchFreshWaterDiscounts = async (userId = selectedUserId) => {
    if (!userId) return;
    try {
      const res = await api.get(`/admin/user-analytics/users/${userId}/water-discounts`);
      if (res.data?.discounts) {
        setWaterDiscounts(res.data.discounts);
      }
    } catch (e) {
      console.error("Failed to fetch fresh water discounts", e);
    }
  };

  // Fetch specific user analytics when a user is selected
  useEffect(() => {
    if (!selectedUserId) {
      setAnalytics(null);
      return;
    }

    const fetchAnalytics = async () => {
      setLoading(true);
      setMsg("");
      try {
        const [res, transRes, waterDiscRes] = await Promise.all([
          api.get(`/admin/user-analytics/${selectedUserId}`),
          api.get(`/admin/users/${selectedUserId}/wallet/transactions`),
          api.get(`/admin/user-analytics/users/${selectedUserId}/water-discounts`).catch(() => null)
        ]);
        setAnalytics(res.data.analytics);
        setCurrentUserInfo(res.data.user);
        setDiscountPercent(res.data.user?.discount_percentage ?? "0");
        const discounts = waterDiscRes?.data?.discounts || res.data.waterDiscounts || [];
        setWaterDiscounts(discounts);
        setWalletTransactions(transRes.data.transactions);
      } catch (err) {
        setMsg(`❌ Failed to load analytics for user: ${err.response?.data?.message || err.message}`);
      } finally {
        setLoading(false);
      }
    };
    fetchAnalytics();
  }, [selectedUserId]);

  const handleAddWaterDiscount = async (e) => {
    e.preventDefault();
    if (!selectedUserId) return;
    setWaterDiscountError("");

    const productId = parseInt(waterDiscountForm.product_id, 10);
    const bottles = parseInt(waterDiscountForm.bottles_count, 10);
    const percent = parseFloat(waterDiscountForm.discount_percentage);

    if (isNaN(productId) || productId < 1) {
      setWaterDiscountError("Please select a water product bottle.");
      return;
    }
    if (isNaN(bottles) || bottles < 1) {
      setWaterDiscountError("Bottles count must be an integer of at least 1");
      return;
    }
    if (isNaN(percent) || percent < 0 || percent > 100) {
      setWaterDiscountError("Discount percentage must be between 0% and 100%");
      return;
    }

    const selectedProd = waterProducts.find(p => p.id === productId);
    const prodName = selectedProd?.name || "Selected Product";

    // Check duplicate for the same product and same bottle count
    const alreadyExists = waterDiscounts.some(d => parseInt(d.product_id) === productId && parseInt(d.bottles_count) === bottles);
    if (alreadyExists) {
      setWaterDiscountError(`⚠️ Discount for "${prodName}" with ${bottles} bottle${bottles > 1 ? 's' : ''} already exists! Duplicate tiers for the same product and bottle count are not allowed.`);
      return;
    }

    setSavingWaterDiscount(true);
    try {
      const res = await api.post(`/admin/user-analytics/users/${selectedUserId}/water-discounts`, {
        product_id: productId,
        bottles_count: bottles,
        discount_percentage: percent
      });
      setWaterDiscounts(res.data.discounts || []);
      setWaterDiscountForm(prev => ({ ...prev, discount_percentage: "", bottles_count: "1" }));
      setActionMsg(`✅ Water discount (${percent}% for "${prodName}" at ${bottles} bottle(s)) created successfully!`);
    } catch (err) {
      setWaterDiscountError(err.response?.data?.message || err.message);
      fetchFreshWaterDiscounts();
    } finally {
      setSavingWaterDiscount(false);
    }
  };

  const handleDeleteWaterDiscount = async (discountId) => {
    if (!selectedUserId || !discountId) return;
    setDeletingWaterDiscountId(discountId);
    setWaterDiscountError("");
    try {
      const res = await api.delete(`/admin/user-analytics/users/${selectedUserId}/water-discounts/${discountId}`);
      setWaterDiscounts(res.data.discounts || []);
      setActionMsg("✅ Water discount tier removed successfully.");
    } catch (err) {
      setWaterDiscountError(err.response?.data?.message || err.message);
    } finally {
      setDeletingWaterDiscountId(null);
    }
  };

  const formatQuantity = (qty, unit) => {
    const numericQty = parseFloat(qty);
    if (unit === "gm" || unit === "ml") {
      if (numericQty >= 1000) {
        return `${(numericQty / 1000).toFixed(2)} ${unit === "gm" ? "kg" : "L"}`;
      }
      return `${numericQty.toFixed(0)} ${unit}`;
    }
    return `${numericQty.toFixed(0)} ${unit || "pieces"}`;
  };

  const getCategoryEmoji = (category) => {
    return {
      vegetable: "🥦",
      fruit: "🍎",
      water: "💧",
      exotic: "🥬",
      salad: "🥗",
    }[category] || "📦";
  };

  const selectedUser = users.find(u => u.id === parseInt(selectedUserId) || u.id === selectedUserId);

  const handleAction = async (e, action) => {
    e.preventDefault();
    setSaving(true);
    setActionMsg("");
    try {
      const endpoint = action === 'assign' ? '/subscriptions/admin/assign' : '/subscriptions/admin/renew';
      await api.post(endpoint, {
        user_id: selectedUserId,
        ...formData
      });
      setActionMsg("✅ Package action successful!");
      
      // Refresh analytics
      setLoading(true);
      const res = await api.get(`/admin/user-analytics/${selectedUserId}`);
      setAnalytics(res.data.analytics);
      setLoading(false);

      if (action === 'assign') setShowAssignModal(false);
      else setShowRenewModal(false);
      setFormData({ package_id: "", type: "monthly", start_date: "", address_id: "" });
    } catch (err) {
      setActionMsg(`❌ Action failed: ${err.response?.data?.message || err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateServingStatus = async (scheduleId, newStatus) => {
    setStatusUpdatingId(scheduleId);
    try {
      await api.put(`/admin/delivery-schedules/${scheduleId}/status`, { status: newStatus });
      // Refresh analytics data
      const res = await api.get(`/admin/user-analytics/${selectedUserId}`);
      setAnalytics(res.data.analytics);
    } catch (err) {
      alert(`Status update failed: ${err.response?.data?.message || err.message}`);
    } finally {
      setStatusUpdatingId(null);
    }
  };

  const openRescheduleModal = (pkg, serving, sIdx) => {
    setRescheduleModal({
      isOpen: true,
      serving,
      pkg,
      servingIndex: sIdx,
      newDate: serving.scheduled_date || (serving.actual_delivery_date ? serving.actual_delivery_date.split('T')[0] : ''),
      loading: false,
      error: ''
    });
  };

  const handleConfirmReschedule = async () => {
    if (!rescheduleModal.serving || !rescheduleModal.newDate) return;
    setRescheduleModal(prev => ({ ...prev, loading: true, error: '' }));
    try {
      const res = await api.put(`/admin/delivery-schedules/${rescheduleModal.serving.id}/reschedule`, {
        new_date: rescheduleModal.newDate
      });
      // Refresh analytics data
      const userRes = await api.get(`/admin/user-analytics/${selectedUserId}`);
      setAnalytics(userRes.data.analytics);
      alert(res.data?.message || 'Serving aur aage ki deliveries successfully reschedule ho gayi!');
      setRescheduleModal({
        isOpen: false,
        serving: null,
        pkg: null,
        servingIndex: 0,
        newDate: '',
        loading: false,
        error: ''
      });
    } catch (err) {
      setRescheduleModal(prev => ({
        ...prev,
        loading: false,
        error: err.response?.data?.message || err.message
      }));
    }
  };

  const refreshUserData = async () => {
    if (!selectedUserId) return;
    try {
      const [res, transRes] = await Promise.all([
        api.get(`/admin/user-analytics/${selectedUserId}`),
        api.get(`/admin/users/${selectedUserId}/wallet/transactions`)
      ]);
      setAnalytics(res.data.analytics);
      if (res.data.user) {
        setCurrentUserInfo(res.data.user);
        setUsers(prev => prev.map(u => u.id === res.data.user.id ? { ...u, wallet_balance: res.data.user.wallet_balance, due_amount: res.data.user.due_amount } : u));
      }
      setWalletTransactions(transRes.data.transactions || []);
    } catch (e) {
      console.error("Failed to refresh user data", e);
    }
  };

  const handleDeductServingWallet = async (serving, pkg, sIdx) => {
    if (!serving || !pkg) return;

    const margin = parseFloat(pkg.margin_percent || pkg.seasonal_config?.margin_percent || 0);
    const budget = parseFloat(pkg.seasonal_config?.per_service_budget || 0);
    const perServiceWithMargin = parseFloat(pkg.per_service_price || pkg.seasonal_config?.per_service_price || (budget * (1 + margin / 100)) || 0);
    const amount = perServiceWithMargin > 0 ? perServiceWithMargin : (parseFloat(pkg.package_price || 0) / (pkg.services_per_month || 1));
    const formattedAmount = amount.toFixed(2);
    const dateFormatted = serving.scheduled_date || (serving.actual_delivery_date ? serving.actual_delivery_date.split('T')[0] : 'N/A');

    if (serving.is_debited) {
      const reConfirm = window.confirm(
        `⚠️ Is serving (#${sIdx + 1} - ${dateFormatted}) ke liye pehle hi ₹${parseFloat(serving.debited_amount || amount).toFixed(2)} deduct ho chuka hai.\n\nKya aap sach me dobara ₹${formattedAmount} deduct karna chahte hain?`
      );
      if (!reConfirm) return;
    } else {
      const confirmDeduct = window.confirm(
        `User "${currentUserInfo?.name || 'User'}" ke wallet se Serving #${sIdx + 1} (${dateFormatted}) ke liye ₹${formattedAmount} (margin included) deduct karein?\n\nTransaction ki date serving ki date (${dateFormatted}) hi rahegi.`
      );
      if (!confirmDeduct) return;
    }

    setDeductingServingId(serving.id);
    try {
      const res = await api.post(`/admin/delivery-schedules/${serving.id}/deduct-wallet`, {
        force: serving.is_debited ? true : false,
        custom_amount: amount
      });
      alert(res.data.message || `₹${formattedAmount} wallet se successfully deduct ho gaye!`);
      await refreshUserData();
    } catch (err) {
      alert(`❌ Wallet deduction failed: ${err.response?.data?.message || err.message}`);
    } finally {
      setDeductingServingId(null);
    }
  };

  const openEditServingModal = (pkg, serving) => {
    setEditingPackage(pkg);
    setEditingServing(serving);
    setServingItemsError("");

    // Initialize fixed items
    const fixedMap = {};
    const pkgFixed = pkg.seasonal_config?.fixed_items || [];
    pkgFixed.forEach(fi => {
      const found = (serving.fixed_items || []).find(i => i.product_id === fi.product_id);
      fixedMap[fi.product_id] = found ? parseFloat(found.qty_gm || 0) : parseFloat(fi.qty_gm || 0);
    });
    setServingFixedItems(fixedMap);

    // Initialize seasonal items
    const seasonalMap = {};
    const pkgSeasonal = pkg.seasonal_config?.seasonal_pool || [];
    pkgSeasonal.forEach(sp => {
      const found = (serving.seasonal_items || []).find(i => i.product_id === sp.product_id);
      seasonalMap[sp.product_id] = found ? parseFloat(found.qty_gm || 0) : 0;
    });
    setServingSeasonalItems(seasonalMap);
  };

  const calcTotalServingCost = () => {
    if (!editingPackage) return 0;
    let total = 0;
    const pkgFixed = editingPackage.seasonal_config?.fixed_items || [];
    pkgFixed.forEach(fi => {
      const qty = parseFloat(servingFixedItems[fi.product_id] ?? fi.qty_gm);
      const price = parseFloat(fi.purchase_price_per_gm || 0);
      total += qty * price;
    });

    const pkgSeasonal = editingPackage.seasonal_config?.seasonal_pool || [];
    pkgSeasonal.forEach(sp => {
      const qty = parseFloat(servingSeasonalItems[sp.product_id] || 0);
      const price = parseFloat(sp.purchase_price_per_gm || 0);
      total += qty * price;
    });

    return total;
  };

  const handleSaveServingItems = async () => {
    if (!editingServing || !editingPackage) return;
    const budget = editingPackage.seasonal_config?.per_service_budget || 0;
    const currentCost = calcTotalServingCost();

    if (currentCost - budget > 0.05) {
      setServingItemsError(`⚠️ Jyada quantity ho gaya hai! Allowed budget ₹${budget.toFixed(2)} hai, lekin selected items ka total ₹${currentCost.toFixed(2)} ho gaya hai (₹${(currentCost - budget).toFixed(2)} extra). Kripya quantity kam karein.`);
      return;
    }

    setSavingServingItems(true);
    setServingItemsError("");
    try {
      const fixedPayload = Object.entries(servingFixedItems).map(([pId, qty]) => ({
        product_id: parseInt(pId),
        qty_gm: parseFloat(qty)
      }));
      const seasonalPayload = Object.entries(servingSeasonalItems)
        .map(([pId, qty]) => ({
          product_id: parseInt(pId),
          qty_gm: parseFloat(qty)
        }))
        .filter(i => i.qty_gm > 0);

      await api.put(`/admin/delivery-schedules/${editingServing.id}/items`, {
        fixed_items: fixedPayload,
        items: seasonalPayload
      });

      // Refresh data
      const res = await api.get(`/admin/user-analytics/${selectedUserId}`);
      setAnalytics(res.data.analytics);
      setEditingServing(null);
      setEditingPackage(null);
    } catch (err) {
      setServingItemsError(`❌ ${err.response?.data?.message || err.message}`);
    } finally {
      setSavingServingItems(false);
    }
  };

  const handleBatchUpdate = async (e) => {
    e.preventDefault();
    setSaving(true);
    setActionMsg("");
    try {
      const endpoint = batchFormData.is_water ? `/admin/water/${batchFormData.sub_id}/batch` : `/admin/subscriptions/${batchFormData.sub_id}/batch`;
      await api.patch(endpoint, { batch_id: batchFormData.batch_id });
      setActionMsg("✅ Batch updated successfully!");
      
      // Refresh analytics
      setLoading(true);
      const res = await api.get(`/admin/user-analytics/${selectedUserId}`);
      setAnalytics(res.data.analytics);
      setLoading(false);

      setShowBatchModal(false);
    } catch (err) {
      setActionMsg(`❌ Action failed: ${err.response?.data?.message || err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleAddAddress = async (e) => {
    e.preventDefault();
    setSaving(true);
    setActionMsg("");
    try {
      await api.post("/addresses/admin/create", {
        user_id: selectedUserId,
        ...addressForm
      });
      setActionMsg("✅ Address added successfully!");
      
      setLoading(true);
      const res = await api.get(`/admin/user-analytics/${selectedUserId}`);
      setAnalytics(res.data.analytics);
      setLoading(false);

      setShowAddressModal(false);
      setAddressForm({ address_line: "", city: "Nagpur", pincode: "", landmark: "", zone: "" });
    } catch (err) {
      setActionMsg(`❌ Action failed: ${err.response?.data?.message || err.message}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="page-header">User Purchase History 🔍</h1>
          <p className="page-sub">Deep dive into a specific user's packages and retail orders</p>
        </div>
        
        <div className="flex flex-col bg-white p-2 rounded-xl shadow-sm border border-gray-100 min-w-[250px]">
          <label className="text-gray-500 text-[10px] font-bold uppercase tracking-wider px-1">Select User</label>
          <select 
            value={selectedUserId} 
            onChange={(e) => setSelectedUserId(e.target.value)}
            className="input text-sm py-1.5 px-3 border-none shadow-none focus:ring-0 cursor-pointer"
          >
            <option value="">-- Choose a User --</option>
            {users.map(u => (
              <option key={u.id} value={u.id}>{u.name} ({u.phone})</option>
            ))}
          </select>
        </div>
      </div>

      {selectedUserId && (
        <div className="flex flex-wrap gap-3 mb-4">
          <button onClick={() => setShowAssignModal(true)} className="btn-primary text-sm px-4 py-2 flex items-center gap-2">
            <span>🎁</span> Assign New Package
          </button>
          <button onClick={() => setShowRenewModal(true)} className="btn-secondary text-sm px-4 py-2 flex items-center gap-2 border-fresh-200 text-fresh-700 bg-fresh-50 hover:bg-fresh-100">
            <span>🔄</span> Renew Package
          </button>
          <button onClick={() => setShowWalletModal(true)} className="btn-secondary text-sm px-4 py-2 flex items-center gap-2 border-emerald-200 text-emerald-700 bg-emerald-50 hover:bg-emerald-100">
            <span>💰</span> Adjust Wallet
          </button>
          <button onClick={() => setShowAddressModal(true)} className="btn-secondary text-sm px-4 py-2 flex items-center gap-2 border-blue-200 text-blue-700 bg-blue-50 hover:bg-blue-100">
            <span>📍</span> Add Address
          </button>
          <button 
            onClick={() => {
              setDiscountPercent(currentUserInfo?.discount_percentage ?? "0");
              setShowDiscountModal(true);
            }} 
            className="btn-secondary text-sm px-4 py-2 flex items-center gap-2 border-purple-200 text-purple-700 bg-purple-50 hover:bg-purple-100 transition-colors shadow-2xs"
          >
            <span>🏷️</span> Set Retail Discount ({parseFloat(currentUserInfo?.discount_percentage || 0)}%)
          </button>
          <button 
            onClick={() => {
              setWaterDiscountError("");
              const firstId = waterProducts.length > 0 ? waterProducts[0].id.toString() : "";
              setWaterDiscountForm({ product_id: firstId, discount_percentage: "", bottles_count: "1" });
              setShowWaterDiscountModal(true);
              fetchFreshWaterDiscounts();
            }} 
            className="btn-secondary text-sm px-4 py-2 flex items-center gap-2 border-sky-200 text-sky-700 bg-sky-50 hover:bg-sky-100 transition-colors shadow-2xs"
          >
            <span>💧</span> Set Water Discount ({waterDiscounts.length} Tier{waterDiscounts.length === 1 ? '' : 's'})
          </button>
        </div>
      )}

      {selectedUserId && currentUserInfo && (
        <div className="card bg-gray-50 border border-gray-200 mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="font-bold text-gray-900 text-base">{currentUserInfo.name}</h3>
            <p className="text-sm text-gray-600">{currentUserInfo.phone} {currentUserInfo.email && `| ${currentUserInfo.email}`}</p>
          </div>
          <div className="flex items-center gap-6">
            <div className="text-center">
              <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-1">Retail Discount</p>
              <button
                onClick={() => {
                  setDiscountPercent(currentUserInfo?.discount_percentage ?? "0");
                  setShowDiscountModal(true);
                }}
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-sm font-bold border transition-all hover:scale-105 cursor-pointer ${
                  parseFloat(currentUserInfo.discount_percentage || 0) > 0
                    ? "bg-purple-100 text-purple-800 border-purple-300 shadow-2xs"
                    : "bg-white text-gray-500 border-gray-200 hover:border-purple-300 hover:text-purple-700"
                }`}
                title="Click to edit discount"
              >
                <span>🏷️</span>
                <span>{parseFloat(currentUserInfo.discount_percentage || 0)}% OFF</span>
              </button>
            </div>
            <div className="text-center">
              <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-1">Water Discount</p>
              <button
                onClick={() => {
                  setWaterDiscountError("");
                  const firstId = waterProducts.length > 0 ? waterProducts[0].id.toString() : "";
                  setWaterDiscountForm({ product_id: firstId, discount_percentage: "", bottles_count: "1" });
                  setShowWaterDiscountModal(true);
                  fetchFreshWaterDiscounts();
                }}
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-sm font-bold border transition-all hover:scale-105 cursor-pointer ${
                  waterDiscounts.length > 0
                    ? "bg-sky-100 text-sky-800 border-sky-300 shadow-2xs"
                    : "bg-white text-gray-500 border-gray-200 hover:border-sky-300 hover:text-sky-700"
                }`}
                title="Click to view & configure water discount tiers"
              >
                <span>💧</span>
                <span>{waterDiscounts.length > 0 ? `${waterDiscounts.length} Tier${waterDiscounts.length > 1 ? 's' : ''}` : '0 Tier'}</span>
              </button>
            </div>
            <div className="text-right">
              <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-1">User Password</p>
              <p className="font-mono text-sm font-semibold text-gray-900 bg-white border border-gray-200 px-3 py-1 rounded-lg shadow-sm">
                {currentUserInfo.actual_password || "Not Available"}
              </p>
            </div>
          </div>
        </div>
      )}

      {msg && (
        <div className="rounded-xl px-4 py-3 text-sm bg-red-50 text-red-600 border border-red-200">
          {msg}
        </div>
      )}

      {!selectedUserId && !loading && (
        <div className="text-center py-20 text-gray-500 card">
          <p className="text-5xl mb-4">👤</p>
          <p className="text-xl font-bold text-gray-900">Select a User</p>
          <p className="text-sm mt-2">Choose a user from the dropdown above to view their complete purchase history and analytics.</p>
        </div>
      )}

      {/* MODALS */}
      {(showAssignModal || showRenewModal) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden animate-slide-up">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center">
              <h2 className="text-xl font-bold text-gray-900">{showAssignModal ? "Assign Package to User" : "Renew Package"}</h2>
              <button onClick={() => { setShowAssignModal(false); setShowRenewModal(false); }} className="text-gray-400 hover:text-gray-600">✖</button>
            </div>
            {actionMsg && (
                <div className={`mx-6 mt-4 p-3 rounded-lg text-sm border ${actionMsg.includes('✅') ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-600 border-red-200'}`}>
                    {actionMsg}
                </div>
            )}
            <form onSubmit={(e) => handleAction(e, showAssignModal ? 'assign' : 'renew')} className="p-6 space-y-4">
              <div>
                <label className="label text-xs uppercase tracking-wider mb-1 block">Select Package</label>
                <select 
                  className="input w-full text-sm" 
                  value={formData.package_id} 
                  onChange={e => setFormData({...formData, package_id: e.target.value})}
                  required
                >
                  <option value="">-- Choose Package --</option>
                  {packages.map(p => (
                    <option key={p.id} value={p.id}>{p.name} - ₹{p.price}/month</option>
                  ))}
                </select>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label text-xs uppercase tracking-wider mb-1 block">Plan Type</label>
                  <select 
                    className="input w-full text-sm" 
                    value={formData.type} 
                    onChange={e => setFormData({...formData, type: e.target.value})}
                  >
                    <option value="monthly">Monthly</option>
                    <option value="yearly">Yearly (-25%)</option>
                  </select>
                </div>
                <div>
                  <label className="label text-xs uppercase tracking-wider mb-1 block">Start Date</label>
                  <input 
                    type="date" 
                    className="input w-full text-sm" 
                    value={formData.start_date} 
                    onChange={e => setFormData({...formData, start_date: e.target.value})}
                    required
                  />
                </div>
              </div>

              <div>
                <label className="label text-xs uppercase tracking-wider mb-1 block">Select Delivery Address</label>
                <select 
                  className="input w-full text-sm" 
                  value={formData.address_id} 
                  onChange={e => setFormData({...formData, address_id: e.target.value})}
                  required
                >
                  <option value="">-- Choose User's Address --</option>
                  {selectedUser?.Addresses?.map(addr => (
                    <option key={addr.id} value={addr.id}>
                      {addr.address_line}, {addr.city} - {addr.pincode}
                    </option>
                  ))}
                </select>
                {(!selectedUser?.Addresses || selectedUser.Addresses.length === 0) && (
                    <p className="text-xs text-red-500 mt-1">This user has no saved addresses. Please create one in User Addresses tab first.</p>
                )}
              </div>

              <div className="pt-4 flex justify-end gap-3">
                <button type="button" onClick={() => { setShowAssignModal(false); setShowRenewModal(false); }} className="btn-secondary text-sm px-6">Cancel</button>
                <button type="submit" disabled={saving || !selectedUser?.Addresses?.length} className="btn-primary text-sm px-6">
                  {saving ? "Saving..." : "Confirm & Save"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* BATCH MODAL */}
      {showBatchModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden animate-slide-up">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center">
              <h2 className="text-xl font-bold text-gray-900">Change Batch</h2>
              <button onClick={() => setShowBatchModal(false)} className="text-gray-400 hover:text-gray-600">✖</button>
            </div>
            {actionMsg && (
                <div className={`mx-6 mt-4 p-3 rounded-lg text-sm border ${actionMsg.includes('✅') ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-600 border-red-200'}`}>
                    {actionMsg}
                </div>
            )}
            <form onSubmit={handleBatchUpdate} className="p-6 space-y-4">
              <div>
                <label className="label text-xs uppercase tracking-wider mb-1 block">Select Batch</label>
                <select 
                  className="input w-full text-sm" 
                  value={batchFormData.batch_id} 
                  onChange={e => setBatchFormData({...batchFormData, batch_id: e.target.value})}
                  required
                >
                  <option value="">-- Choose Batch --</option>
                  {batches.map(b => (
                    <option key={b.id} value={b.id}>{b.name} ({b.time_range})</option>
                  ))}
                </select>
              </div>

              <div className="pt-4 flex justify-end gap-3">
                <button type="button" onClick={() => setShowBatchModal(false)} className="btn-secondary text-sm px-6">Cancel</button>
                <button type="submit" disabled={saving} className="btn-primary text-sm px-6">
                  {saving ? "Saving..." : "Save Batch"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DISCOUNT MODAL */}
      {showDiscountModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-slide-up">
            <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gradient-to-r from-purple-700 to-indigo-700 text-white">
              <div>
                <h2 className="text-lg font-bold flex items-center gap-2">
                  <span>🏷️</span> Set User Retail Discount
                </h2>
                <p className="text-xs text-purple-200 mt-0.5">{currentUserInfo?.name} ({currentUserInfo?.phone})</p>
              </div>
              <button 
                onClick={() => setShowDiscountModal(false)} 
                className="text-white hover:bg-white/20 p-1.5 rounded-full transition-colors"
              >
                ✕
              </button>
            </div>

            <form onSubmit={async (e) => {
              e.preventDefault();
              if (!selectedUserId) return;
              setSavingDiscount(true);
              setActionMsg("");
              try {
                const discountVal = parseFloat(discountPercent) || 0;
                await api.patch(`/admin/user-analytics/users/${selectedUserId}/discount`, {
                  discount_percentage: discountVal
                });
                setCurrentUserInfo(prev => ({ ...prev, discount_percentage: discountVal }));
                setUsers(prev => prev.map(u => u.id === parseInt(selectedUserId) ? { ...u, discount_percentage: discountVal } : u));
                setActionMsg(`✅ Retail discount updated to ${discountVal}% successfully!`);
                setShowDiscountModal(false);
              } catch (err) {
                setActionMsg(`❌ Failed to update discount: ${err.response?.data?.message || err.message}`);
              } finally {
                setSavingDiscount(false);
              }
            }} className="p-6 space-y-4">
              <div>
                <label className="label text-xs uppercase tracking-wider mb-1.5 block font-semibold text-gray-700">
                  Discount Percentage (%)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.5"
                    className="input w-full text-lg font-bold pr-10 text-purple-700 border-purple-200 focus:border-purple-500 focus:ring-purple-200"
                    value={discountPercent}
                    onChange={(e) => setDiscountPercent(e.target.value)}
                    placeholder="Enter discount % (e.g. 10)"
                    required
                  />
                  <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-base">%</span>
                </div>
                <p className="text-xs text-gray-500 mt-1.5">
                  Jab ye user retail store se order karega, toh uske total par itne percentage ka discount automatically apply ho jayega.
                </p>
              </div>

              {/* Quick Preset Buttons */}
              <div>
                <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1.5 block">Quick Presets</label>
                <div className="flex flex-wrap gap-2">
                  {[0, 5, 10, 15, 20, 25, 30, 50].map((val) => (
                    <button
                      type="button"
                      key={val}
                      onClick={() => setDiscountPercent(val.toString())}
                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all ${
                        parseFloat(discountPercent) === val
                          ? "bg-purple-600 text-white border-purple-600 shadow-xs"
                          : "bg-gray-50 text-gray-700 border-gray-200 hover:bg-purple-50 hover:border-purple-200"
                      }`}
                    >
                      {val === 0 ? "No Discount (0%)" : `${val}%`}
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-3 border-t border-gray-100 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowDiscountModal(false)}
                  className="btn-secondary text-sm px-4 py-2"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingDiscount}
                  className="btn-primary text-sm px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-xl shadow-md transition-all disabled:opacity-50"
                >
                  {savingDiscount ? "Saving..." : "Save Discount"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* WATER DISCOUNT MODAL */}
      {showWaterDiscountModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-slide-up my-8 max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="p-5 border-b border-sky-600 flex justify-between items-center bg-gradient-to-r from-sky-600 via-blue-600 to-cyan-600 text-white shrink-0">
              <div>
                <h2 className="text-lg font-bold flex items-center gap-2">
                  <span>💧</span> Set User Water Discounts
                </h2>
                <p className="text-xs text-sky-100 mt-0.5">{currentUserInfo?.name} ({currentUserInfo?.phone})</p>
              </div>
              <button 
                onClick={() => setShowWaterDiscountModal(false)} 
                className="text-white hover:bg-white/20 p-1.5 rounded-full transition-colors"
              >
                ✕
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-6">
              {waterDiscountError && (
                <div className="rounded-xl px-4 py-3 text-xs bg-red-50 text-red-700 border border-red-200 flex items-start gap-2">
                  <span>⚠️</span>
                  <span>{waterDiscountError}</span>
                </div>
              )}

              {/* SECTION 1: Active Configured Tiers */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-gray-700 flex items-center gap-1.5">
                    <span>📋</span> Configured Discount Tiers ({waterDiscounts.length})
                  </h3>
                  {waterDiscounts.length > 0 && (
                    <span className="text-[11px] text-sky-600 font-semibold bg-sky-50 px-2 py-0.5 rounded-full border border-sky-100">
                      Multi-tier enabled
                    </span>
                  )}
                </div>

                {waterDiscounts.length === 0 ? (
                  <div className="text-center py-6 px-4 bg-sky-50/50 rounded-xl border border-dashed border-sky-200">
                    <p className="text-2xl mb-1">💧</p>
                    <p className="text-xs font-semibold text-gray-700">No water discount tiers configured</p>
                    <p className="text-[11px] text-gray-500 mt-0.5">This customer will be charged standard product prices.</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {waterDiscounts.map((tier) => {
                      const bottles = parseInt(tier.bottles_count);
                      const percent = parseFloat(tier.discount_percentage);
                      const prod = tier.Product || waterProducts.find(p => p.id === tier.product_id);
                      const prodName = prod?.name || `Product #${tier.product_id || ''}`;
                      const bottlePrice = prod ? parseFloat(prod.selling_price_per_gm) : 20;
                      const exampleBase = bottles * bottlePrice * 30; // bottle price, 30 days
                      const exampleOff = (exampleBase * percent) / 100;
                      const exampleFinal = exampleBase - exampleOff;

                      // Check if highest tier for this product
                      const productTiers = waterDiscounts.filter(d => parseInt(d.product_id) === parseInt(tier.product_id));
                      const isHighestForProduct = productTiers.length > 0 && bottles === Math.max(...productTiers.map(d => parseInt(d.bottles_count)));

                      return (
                        <div 
                          key={tier.id} 
                          className="flex items-center justify-between p-3 rounded-xl border border-sky-100 bg-gradient-to-r from-sky-50/60 to-white hover:border-sky-300 transition-all shadow-2xs"
                        >
                          <div className="space-y-1">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <span className="px-2 py-0.5 rounded-lg text-xs font-bold bg-sky-100 text-sky-800 border border-sky-200">
                                💧 {prodName}
                              </span>
                              <span className="px-2 py-0.5 rounded-lg text-xs font-extrabold bg-blue-600 text-white shadow-xs">
                                🍼 {bottles} Bottle{bottles > 1 ? 's' : ''} / day
                              </span>
                              <span className="px-2 py-0.5 rounded-lg text-xs font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-300">
                                🏷️ {percent}% OFF
                              </span>
                              {isHighestForProduct && productTiers.length > 1 && (
                                <span className="text-[10px] font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full border border-amber-200">
                                  ⭐ Highest ({bottles}+ bottles)
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-gray-500">
                              At ₹{bottlePrice.toFixed(2)}/bottle (30 days): ₹{exampleBase.toFixed(1)} → <span className="font-bold text-emerald-600">₹{exampleFinal.toFixed(1)}</span> (Save ₹{exampleOff.toFixed(1)})
                            </p>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleDeleteWaterDiscount(tier.id)}
                            disabled={deletingWaterDiscountId === tier.id}
                            className="text-red-500 hover:text-red-700 p-2 rounded-lg hover:bg-red-50 transition-colors cursor-pointer disabled:opacity-50"
                            title="Delete this discount tier"
                          >
                            {deletingWaterDiscountId === tier.id ? "⏳" : "🗑️"}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* SECTION 2: Add New Discount Tier Form */}
              <form onSubmit={handleAddWaterDiscount} className="p-4 rounded-xl border border-gray-200 bg-gray-50/70 space-y-4">
                <h4 className="text-xs font-bold text-gray-800 uppercase tracking-wider flex items-center gap-1.5 border-b border-gray-200 pb-2">
                  <span>➕</span> Create New Discount Tier
                </h4>

                {/* Question 0: Select Water Bottle Product */}
                <div>
                  <label className="label text-xs uppercase tracking-wider mb-1 block font-semibold text-gray-700">
                    Water Bottle Product <span className="text-red-500">*</span>
                  </label>
                  <p className="text-[11px] text-gray-500 mb-1.5">Ye discount kiss active water bottle ke liye create karna chahte ho?</p>
                  <select
                    value={waterDiscountForm.product_id}
                    onChange={(e) => {
                      setWaterDiscountError("");
                      setWaterDiscountForm({ ...waterDiscountForm, product_id: e.target.value });
                    }}
                    className="input w-full font-bold text-sm text-gray-800 border-sky-200 focus:border-sky-500 focus:ring-sky-200 cursor-pointer"
                    required
                  >
                    <option value="">-- Choose Active Water Product --</option>
                    {waterProducts.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.name} {p.water_capacity_liters ? `(${p.water_capacity_liters}L)` : ''} — ₹{parseFloat(p.selling_price_per_gm).toFixed(2)}/bottle
                      </option>
                    ))}
                  </select>
                </div>

                {/* Question 1: Discount Percentage first (as requested) */}
                <div>
                  <label className="label text-xs uppercase tracking-wider mb-1 block font-semibold text-gray-700">
                    1. Discount Percentage (%) <span className="text-red-500">*</span>
                  </label>
                  <p className="text-[11px] text-gray-500 mb-1.5">Kitne percentage ka discount dena chahte ho?</p>
                  <div className="relative">
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="any"
                      className="input w-full font-bold pr-10 text-sky-700 border-sky-200 focus:border-sky-500 focus:ring-sky-200"
                      value={waterDiscountForm.discount_percentage}
                      onChange={(e) => {
                        setWaterDiscountError("");
                        setWaterDiscountForm({ ...waterDiscountForm, discount_percentage: e.target.value });
                      }}
                      placeholder="e.g. 5 or 15"
                      required
                    />
                    <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-base">%</span>
                  </div>
                  {/* Preset chips for discount */}
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {[5, 10, 15, 20, 25, 30].map(val => (
                      <button
                        type="button"
                        key={val}
                        onClick={() => setWaterDiscountForm(prev => ({ ...prev, discount_percentage: val.toString() }))}
                        className={`text-[11px] px-2 py-0.5 rounded-md font-semibold border transition-all ${
                          parseFloat(waterDiscountForm.discount_percentage) === val
                            ? 'bg-sky-600 text-white border-sky-600'
                            : 'bg-white text-gray-600 border-gray-200 hover:bg-sky-50 hover:border-sky-200'
                        }`}
                      >
                        {val}%
                      </button>
                    ))}
                  </div>
                </div>

                {/* Question 2: Bottle Count second (as requested) */}
                <div>
                  <label className="label text-xs uppercase tracking-wider mb-1 block font-semibold text-gray-700">
                    2. Bottles Count (Per Day / Delivery) <span className="text-red-500">*</span>
                  </label>
                  <p className="text-[11px] text-gray-500 mb-1.5">Ye discount kitni bottle lene par dena chahte ho?</p>
                  <div className="relative">
                    <input
                      type="number"
                      min="1"
                      step="1"
                      className="input w-full font-bold pr-16 text-blue-700 border-blue-200 focus:border-blue-500 focus:ring-blue-200"
                      value={waterDiscountForm.bottles_count}
                      onChange={(e) => {
                        setWaterDiscountError("");
                        setWaterDiscountForm({ ...waterDiscountForm, bottles_count: e.target.value });
                      }}
                      placeholder="e.g. 1, 2, 3"
                      required
                    />
                    <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 font-semibold text-xs">Bottle(s)</span>
                  </div>

                  {/* Quick bottle selectors */}
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {[1, 2, 3, 4, 5].map(b => {
                      const alreadyUsed = waterDiscounts.some(d => 
                        parseInt(d.product_id) === parseInt(waterDiscountForm.product_id) && 
                        parseInt(d.bottles_count) === b
                      );
                      return (
                        <button
                          type="button"
                          key={b}
                          onClick={() => setWaterDiscountForm(prev => ({ ...prev, bottles_count: b.toString() }))}
                          className={`text-[11px] px-2.5 py-1 rounded-md font-semibold border transition-all ${
                            parseInt(waterDiscountForm.bottles_count) === b
                              ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                              : alreadyUsed
                              ? 'bg-gray-100 text-gray-400 border-gray-200 line-through'
                              : 'bg-white text-gray-700 border-gray-200 hover:bg-blue-50 hover:border-blue-200'
                          }`}
                          title={alreadyUsed ? `${b} bottle tier already exists for selected product` : ""}
                        >
                          {b} Bottle{b > 1 ? 's' : ''} {alreadyUsed ? '(Exists)' : ''}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Live Preview Box */}
                {(() => {
                  const selectedProd = waterProducts.find(p => p.id === parseInt(waterDiscountForm.product_id));
                  const b = parseInt(waterDiscountForm.bottles_count) || 1;
                  const p = parseFloat(waterDiscountForm.discount_percentage) || 0;
                  const unitPrice = selectedProd ? parseFloat(selectedProd.selling_price_per_gm) : 20;
                  const approxTotal = b * unitPrice * 30;
                  const approxOff = (approxTotal * p) / 100;
                  const approxFinal = approxTotal - approxOff;

                  return (
                    <div className="p-3 bg-white rounded-lg border border-sky-200 text-xs text-gray-700 space-y-1">
                      <p className="font-bold text-sky-800 flex items-center gap-1">
                        <span>💡</span> Live Calculation Preview:
                      </p>
                      <p className="text-[11px] text-gray-600">
                        {selectedProd?.name || 'Selected Bottle'} at ₹{unitPrice.toFixed(2)}/bottle for 30 days ({b * 30} bottles):
                      </p>
                      <div className="flex items-center justify-between text-xs pt-1 border-t border-gray-100">
                        <span>Original: <span className="font-semibold">₹{approxTotal.toFixed(1)}</span></span>
                        <span>Discount ({p}%): <span className="font-bold text-emerald-600">-₹{approxOff.toFixed(1)}</span></span>
                        <span>Customer Pays: <span className="font-extrabold text-blue-700">₹{approxFinal.toFixed(1)}</span></span>
                      </div>
                    </div>
                  );
                })()}

                <button
                  type="submit"
                  disabled={savingWaterDiscount || !waterDiscountForm.product_id}
                  className="btn-primary w-full py-2.5 text-sm bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-700 hover:to-blue-700 text-white font-bold rounded-xl shadow-md transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {savingWaterDiscount ? "Creating Tier..." : "➕ Add Water Discount Tier"}
                </button>
              </form>

              {/* SECTION 3: System Rules Note */}
              <div className="p-3.5 bg-amber-50 rounded-xl border border-amber-200 text-amber-900 text-xs space-y-1.5">
                <p className="font-bold flex items-center gap-1.5">
                  <span>ℹ️</span> Discount Application Rules:
                </p>
                <ul className="list-disc list-inside space-y-1 text-[11px] text-amber-800">
                  <li>
                    <strong>Product-Specific:</strong> Discount sirf usi water bottle par apply hoga jo admin ne select ki hai. Agar user doosri water bottle choose karta hai, toh us bottle ke liye alag se banaya gaya discount hi apply hoga.
                  </li>
                  <li>
                    <strong>Duplicate Rule:</strong> Ek specific product aur ek bottle count ke liye sirf 1 discount tier ban sakta hai (e.g. Water A ke 1 bottle ke liye duplicate tier nahi ban sakta, par Water B ke 1 bottle ke liye naya discount ban sakta hai).
                  </li>
                  <li>
                    <strong>Highest Tier Rule:</strong> Agar user usi product me sabse highest bottle tier se zyada bottles order karta hai (e.g., tier is 2 bottles @ 15% and user orders 3 or 4 bottles), toh usko automatically highest tier (15%) discount apply hoga.
                  </li>
                </ul>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-end shrink-0">
              <button
                type="button"
                onClick={() => setShowWaterDiscountModal(false)}
                className="btn-secondary text-sm px-5 py-2"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EDIT SERVING PRODUCTS MODAL */}
      {editingServing && editingPackage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden animate-slide-up my-8 max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gradient-to-r from-fresh-700 to-fresh-600 text-white shrink-0">
              <div>
                <h2 className="text-lg font-bold flex items-center gap-2">
                  <span>🥦</span> Edit Serving Products (Serving #{editingPackage.servings?.findIndex(s => s.id === editingServing.id) + 1})
                </h2>
                <p className="text-xs text-fresh-100 mt-0.5">
                  {editingPackage.name} &bull; Delivery Date: {editingServing.scheduled_date ? new Date(editingServing.scheduled_date).toLocaleDateString("en-IN", { day: 'numeric', month: 'short', year: 'numeric' }) : "N/A"}
                </p>
              </div>
              <button
                onClick={() => { setEditingServing(null); setEditingPackage(null); }}
                className="text-white hover:bg-white/20 p-1.5 rounded-full transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-5">
              {/* Live Budget Counter Card */}
              {(() => {
                const budget = editingPackage.seasonal_config?.per_service_budget || 0;
                const totalCost = calcTotalServingCost();
                const diff = budget - totalCost;
                const isOverBudget = diff < -0.05;

                return (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2 px-1 text-xs text-gray-600 flex-wrap pb-0.5">
                      <span>🏷️ Package Price: <strong className="text-purple-800">₹{(editingPackage.package_price || (editingPackage.per_service_price ? editingPackage.per_service_price * (editingPackage.services_per_month || 1) : 0)).toFixed(2)}</strong></span>
                      <span>💰 Customer Pays / Serving: <strong className="text-blue-700">₹{(editingPackage.per_service_price || (budget * (1 + (editingPackage.margin_percent || 0) / 100))).toFixed(2)}</strong></span>
                      <span>🥦 Veg Purchase Budget: <strong className="text-fresh-700">₹{budget.toFixed(2)}</strong></span>
                    </div>
                    <div className="grid grid-cols-3 gap-3 p-3.5 bg-gray-50 rounded-xl border border-gray-200 text-center">
                      <div>
                        <span className="text-[10px] font-bold uppercase text-gray-500 tracking-wider block">Allowed Serving Budget</span>
                        <span className="text-base font-extrabold text-gray-800">₹{budget.toFixed(2)}</span>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold uppercase text-gray-500 tracking-wider block">Current Selected Cost</span>
                        <span className={`text-base font-extrabold ${isOverBudget ? 'text-red-600' : 'text-fresh-700'}`}>
                          ₹{totalCost.toFixed(2)}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold uppercase text-gray-500 tracking-wider block">Remaining / Status</span>
                        <span className={`text-sm font-bold ${isOverBudget ? 'text-red-600' : 'text-emerald-700'}`}>
                          {isOverBudget ? `-₹${Math.abs(diff).toFixed(2)} (Over)` : `₹${diff.toFixed(2)} (Valid)`}
                        </span>
                      </div>
                    </div>

                    {isOverBudget && (
                      <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs space-y-1">
                        <div className="font-bold flex items-center gap-1.5">
                          <span>⚠️</span> Jyada Quantity Ho Gaya Hai!
                        </div>
                        <p>
                          Is serving ka allowed budget <strong>₹{budget.toFixed(2)}</strong> hai, lekin selected items ka total <strong>₹{totalCost.toFixed(2)}</strong> ho gaya hai (<strong>₹{Math.abs(diff).toFixed(2)} extra</strong>). Kripya quantity kam karein.
                        </p>
                      </div>
                    )}
                  </div>
                );
              })()}

              {servingItemsError && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs">
                  {servingItemsError}
                </div>
              )}

              {/* SECTION 1: Fixed Products */}
              <div className="space-y-3">
                <div className="flex items-center justify-between pb-1 border-b border-gray-200">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-gray-700 flex items-center gap-1.5">
                    <span>📦</span> 1. Fixed Products
                  </h3>
                  <span className="text-[11px] text-gray-400 italic">Included by default in this package</span>
                </div>

                <div className="space-y-2">
                  {(editingPackage.seasonal_config?.fixed_items || []).map((fi) => {
                    const currentQty = servingFixedItems[fi.product_id] ?? fi.qty_gm;
                    const pricePerKg = fi.purchase_price_per_gm * 1000;
                    const itemCost = (currentQty || 0) * fi.purchase_price_per_gm;

                    return (
                      <div
                        key={fi.product_id}
                        className="flex items-center justify-between p-2.5 rounded-xl border border-gray-200 bg-white hover:border-gray-300"
                      >
                        <div>
                          <p className="font-semibold text-xs text-gray-800">
                            {fi.name} {fi.hindi_name ? `(${fi.hindi_name})` : ''}
                          </p>
                          <p className="text-[10px] text-gray-400">
                            Rate: ₹{pricePerKg.toFixed(2)}/kg &bull; Cost: <strong>₹{itemCost.toFixed(2)}</strong>
                          </p>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setServingFixedItems(prev => ({
                              ...prev,
                              [fi.product_id]: Math.max(0, (prev[fi.product_id] ?? fi.qty_gm) - 50)
                            }))}
                            className="w-7 h-7 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold flex items-center justify-center text-sm cursor-pointer"
                          >
                            -
                          </button>
                          <input
                            type="number"
                            min="0"
                            step="50"
                            value={currentQty}
                            onChange={(e) => {
                              const val = Math.max(0, parseFloat(e.target.value) || 0);
                              setServingFixedItems(prev => ({ ...prev, [fi.product_id]: val }));
                            }}
                            className="w-20 text-center text-xs font-bold py-1 border border-gray-200 rounded-md focus:border-fresh-500 focus:outline-none"
                          />
                          <span className="text-xs text-gray-500">{fi.unit || 'gm'}</span>
                          <button
                            type="button"
                            onClick={() => setServingFixedItems(prev => ({
                              ...prev,
                              [fi.product_id]: (prev[fi.product_id] ?? fi.qty_gm) + 50
                            }))}
                            className="w-7 h-7 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold flex items-center justify-center text-sm cursor-pointer"
                          >
                            +
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* SECTION 2: Seasonal Picks */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between pb-1 border-b border-gray-200">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-gray-700 flex items-center gap-1.5">
                    <span>🌿</span> 2. Seasonal Picks
                  </h3>
                  <span className="text-[11px] text-gray-400">
                    Max: {editingPackage.seasonal_config?.max_select_count || 'Unlimited'} items
                  </span>
                </div>

                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                  {(editingPackage.seasonal_config?.seasonal_pool || []).map((sp) => {
                    const currentQty = servingSeasonalItems[sp.product_id] || 0;
                    const pricePerKg = sp.purchase_price_per_gm * 1000;
                    const itemCost = currentQty * sp.purchase_price_per_gm;
                    const isSelected = currentQty > 0;

                    return (
                      <div
                        key={sp.product_id}
                        className={`flex items-center justify-between p-2.5 rounded-xl border transition-all ${
                          isSelected ? 'border-emerald-300 bg-emerald-50/50' : 'border-gray-200 bg-white hover:border-gray-300'
                        }`}
                      >
                        <div>
                          <p className={`font-semibold text-xs ${isSelected ? 'text-emerald-900 font-bold' : 'text-gray-800'}`}>
                            {sp.name} {sp.hindi_name ? `(${sp.hindi_name})` : ''}
                          </p>
                          <p className="text-[10px] text-gray-400">
                            Rate: ₹{pricePerKg.toFixed(2)}/kg &bull; Cost: <strong>₹{itemCost.toFixed(2)}</strong>
                          </p>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setServingSeasonalItems(prev => ({
                              ...prev,
                              [sp.product_id]: Math.max(0, (prev[sp.product_id] || 0) - 50)
                            }))}
                            className="w-7 h-7 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold flex items-center justify-center text-sm cursor-pointer"
                          >
                            -
                          </button>
                          <input
                            type="number"
                            min="0"
                            step="50"
                            value={currentQty}
                            onChange={(e) => {
                              const val = Math.max(0, parseFloat(e.target.value) || 0);
                              setServingSeasonalItems(prev => ({ ...prev, [sp.product_id]: val }));
                            }}
                            className="w-20 text-center text-xs font-bold py-1 border border-gray-200 rounded-md focus:border-fresh-500 focus:outline-none"
                          />
                          <span className="text-xs text-gray-500">{sp.unit || 'gm'}</span>
                          <button
                            type="button"
                            onClick={() => setServingSeasonalItems(prev => ({
                              ...prev,
                              [sp.product_id]: (prev[sp.product_id] || 0) + 50
                            }))}
                            className="w-7 h-7 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold flex items-center justify-center text-sm cursor-pointer"
                          >
                            +
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            {(() => {
              const budget = editingPackage.seasonal_config?.per_service_budget || 0;
              const totalCost = calcTotalServingCost();
              const isOverBudget = totalCost - budget > 0.05;

              return (
                <div className="p-4 border-t border-gray-100 bg-gray-50 flex items-center justify-between shrink-0">
                  <button
                    type="button"
                    onClick={() => { setEditingServing(null); setEditingPackage(null); }}
                    className="btn-secondary text-xs px-4 py-2"
                  >
                    Cancel
                  </button>

                  <button
                    type="button"
                    onClick={handleSaveServingItems}
                    disabled={savingServingItems || isOverBudget}
                    className={`btn-primary text-xs px-6 py-2 flex items-center gap-2 ${
                      isOverBudget ? 'bg-gray-400 cursor-not-allowed opacity-60' : 'bg-fresh-600 hover:bg-fresh-500 cursor-pointer'
                    }`}
                  >
                    {savingServingItems ? (
                      <span>Saving...</span>
                    ) : isOverBudget ? (
                      <span>⚠️ Jyada Quantity Ho Gaya (Kam Karein)</span>
                    ) : (
                      <span>💾 Save Products & Quantities</span>
                    )}
                  </button>
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* RESCHEDULE SERVING MODAL */}
      {rescheduleModal.isOpen && rescheduleModal.serving && rescheduleModal.pkg && (() => {
        const totalServings = rescheduleModal.pkg.servings?.length || 0;
        const currentServingNo = rescheduleModal.servingIndex + 1;
        const subsequentCount = Math.max(0, totalServings - currentServingNo);
        const currentRawDate = rescheduleModal.serving.scheduled_date || rescheduleModal.serving.actual_delivery_date;
        const currentFormatted = currentRawDate ? new Date(currentRawDate).toLocaleDateString("en-IN", {
          weekday: 'short', day: 'numeric', month: 'short', year: 'numeric'
        }) : "N/A";
        
        const isSundaySelected = rescheduleModal.newDate ? (new Date(rescheduleModal.newDate + 'T00:00:00').getDay() === 0) : false;

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 overflow-y-auto">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-slide-up my-8 flex flex-col">
              {/* Header */}
              <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gradient-to-r from-blue-700 to-indigo-600 text-white shrink-0">
                <div>
                  <h2 className="text-lg font-bold flex items-center gap-2">
                    <span>📅</span> Reschedule Serving #{currentServingNo}
                  </h2>
                  <p className="text-xs text-blue-100 mt-0.5">
                    {rescheduleModal.pkg.name} &bull; Current: {currentFormatted}
                  </p>
                </div>
                <button
                  onClick={() => setRescheduleModal(prev => ({ ...prev, isOpen: false, error: '' }))}
                  className="text-white hover:bg-white/20 p-1.5 rounded-full transition-colors cursor-pointer"
                >
                  ✕
                </button>
              </div>

              {/* Body */}
              <div className="p-6 space-y-4">
                {rescheduleModal.error && (
                  <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center gap-2">
                    <span>⚠️</span> {rescheduleModal.error}
                  </div>
                )}

                <div className="bg-blue-50/70 border border-blue-200 rounded-xl p-3.5 text-xs text-blue-900 space-y-1.5">
                  <p className="font-bold flex items-center gap-1.5">
                    <span>ℹ️</span> Cascading Reschedule Rule:
                  </p>
                  <p className="leading-relaxed text-blue-800">
                    Is serving ki nayi date chunte hi, iske aage ki <strong>{subsequentCount} servings</strong> ki delivery dates package ke gap rule ke anusar automatic calculate hokar aage ya piche ho jayengi.
                  </p>
                  <p className="leading-relaxed text-blue-800 font-medium">
                    📌 <strong>Sunday Rule:</strong> Agar nayi date ya koi agla serving Sunday ko aata hai, toh package ke business rule ke mutabik wo date automatic Saturday (ya Monday) par shift ho jayegi.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                    Select New Delivery Date *
                  </label>
                  <input
                    type="date"
                    value={rescheduleModal.newDate}
                    onChange={(e) => setRescheduleModal(prev => ({ ...prev, newDate: e.target.value, error: '' }))}
                    className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  {rescheduleModal.newDate && (
                    <p className="text-xs text-gray-500 mt-1">
                      Chuni gayi date: <strong>{new Date(rescheduleModal.newDate + 'T00:00:00').toLocaleDateString("en-IN", { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</strong>
                    </p>
                  )}
                </div>

                {isSundaySelected && (
                  <div className="p-3 bg-amber-50 border border-amber-300 text-amber-800 text-xs rounded-xl flex items-start gap-2">
                    <span className="text-base leading-none">⚠️</span>
                    <div>
                      <p className="font-bold">Chuni gayi date Sunday hai!</p>
                      <p className="mt-0.5 text-amber-700">
                        Package ke Sunday rule ke anusar yeh serving Saturday ko shift kar di jayegi aur agle servings bhi usi hisab se calculate honge.
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="p-4 bg-gray-50 border-t border-gray-100 flex justify-end items-center gap-3">
                <button
                  type="button"
                  onClick={() => setRescheduleModal(prev => ({ ...prev, isOpen: false, error: '' }))}
                  className="btn-secondary text-xs px-4 py-2"
                  disabled={rescheduleModal.loading}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmReschedule}
                  disabled={rescheduleModal.loading || !rescheduleModal.newDate}
                  className="btn-primary text-xs px-5 py-2 bg-blue-600 hover:bg-blue-500 flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {rescheduleModal.loading ? (
                    <span>Rescheduling...</span>
                  ) : (
                    <span>📅 Confirm & Reschedule ({subsequentCount + 1} Servings)</span>
                  )}
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {loading && (
        <div className="flex items-center justify-center py-20 text-gray-600 card">
          <span className="animate-pulse flex items-center gap-2">
            <span className="text-2xl">⏳</span> Fetching user analytics...
          </span>
        </div>
      )}

      {analytics && !loading && (
        <div className="space-y-6">
          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="card bg-gradient-to-br from-blue-50 to-white border border-blue-100">
              <p className="text-blue-600 text-xs font-bold uppercase tracking-wider">Packages Subscribed</p>
              <p className="text-3xl font-extrabold text-gray-900 mt-2">{analytics.packages.length}</p>
            </div>
            <div className="card bg-gradient-to-br from-purple-50 to-white border border-purple-100">
              <p className="text-purple-600 text-xs font-bold uppercase tracking-wider">Retail Orders Placed</p>
              <p className="text-3xl font-extrabold text-gray-900 mt-2">{analytics.retailHistory.length}</p>
            </div>
            <div className="card bg-gradient-to-br from-fresh-50 to-white border border-fresh-100">
              <p className="text-fresh-600 text-xs font-bold uppercase tracking-wider">Unique Products Bought</p>
              <p className="text-3xl font-extrabold text-gray-900 mt-2">{analytics.totalProducts.length}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* 1. Package History */}
            <div className="card flex flex-col h-full">
              <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                📦 Subscribed Packages
              </h2>
              {analytics.packages.length === 0 ? (
                <p className="text-gray-500 text-sm italic py-4">No packages subscribed yet.</p>
              ) : (
                <div className="space-y-4 overflow-y-auto max-h-[500px] scrollbar-thin pr-2">
                  {analytics.packages.map((pkg, idx) => (
                    <div key={idx} className="border border-gray-200 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                      <div className="bg-gray-50 p-3 border-b border-gray-200 flex justify-between items-center">
                        <div>
                          <div className="flex items-center gap-2 flex-wrap mb-0.5">
                            <p className="font-bold text-gray-900 text-base">
                              {pkg.name}
                            </p>
                            {pkg.package_price > 0 && (
                              <span className="text-xs font-bold text-purple-700 bg-purple-50 border border-purple-200 px-2 py-0.5 rounded-md">
                                ₹{pkg.package_price.toFixed(2)}
                              </span>
                            )}
                            {pkg.per_service_price > 0 && (
                              <span className="text-[11px] font-semibold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-md">
                                ₹{pkg.per_service_price.toFixed(2)} / serving
                              </span>
                            )}
                            {pkg.status && (
                              <span className={`text-[9px] px-1.5 py-0.5 rounded-full ${
                                pkg.status === 'active' ? 'bg-green-100 text-green-700' :
                                pkg.status === 'completed' ? 'bg-gray-200 text-gray-700' :
                                'bg-yellow-100 text-yellow-700'
                              }`}>
                                {pkg.status}
                              </span>
                            )}
                          </div>
                          <p className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold">
                            {pkg.type}
                            {pkg.status === 'active' && (
                              <>
                                &nbsp;• Batch: {pkg.batch || 'None'}
                                <button
                                  type="button"
                                  className="ml-2 text-blue-500 underline"
                                  onClick={() => {
                                    setBatchFormData({ sub_id: pkg.sub_id, is_water: pkg.is_water, batch_id: pkg.batch_id || "" });
                                    setShowBatchModal(true);
                                  }}
                                >
                                  Edit Batch
                                </button>
                              </>
                            )}
                          </p>
                        </div>
                        <div className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-xs font-bold border border-blue-200">
                          Renewed {pkg.renewals} {pkg.renewals === 1 ? 'Time' : 'Times'}
                        </div>
                      </div>
                      <div className="p-3 bg-white">
                        {pkg.is_water && (
                          <div className="flex gap-2 mb-2">
                             <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded text-[10px] font-bold border border-blue-200">
                               Container: {pkg.container}
                             </span>
                             <span className="bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded text-[10px] font-bold border border-indigo-200">
                               Frequency: {pkg.frequency}
                             </span>
                          </div>
                        )}
                        <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Package Services (Products)</p>
                        {pkg.items && pkg.items.length > 0 ? (
                          <div className="flex flex-wrap gap-2">
                            {pkg.items.map((item, i) => (
                              <span key={i} className="bg-gray-100 border border-gray-200 text-gray-700 text-[11px] px-2 py-1 rounded-md flex items-center gap-1 font-medium">
                                {item.name} <span className="text-gray-400">|</span> <span className="text-fresh-600">{formatQuantity(item.qtyPerService, item.unit)}</span>
                              </span>
                            ))}
                          </div>
                        ) : (
                          <p className="text-gray-400 text-xs italic">No specific products tracked for this package type.</p>
                        )}

                        <div className="mt-4 pt-3 border-t border-gray-100">
                          <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Subscription Timeline</p>
                          <ul className="text-[11px] text-gray-600 space-y-1 list-disc list-inside ml-1">
                            {pkg.history && pkg.history.length > 0 ? (
                               pkg.history.map((hDate, hi) => (
                                 <li key={hi}>
                                   {hi === 0 ? <span className="font-semibold text-gray-800">First Subscribed:</span> : <span className="font-semibold text-blue-700">Renewed ({hi}):</span>} {new Date(hDate).toLocaleDateString("en-IN", { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute:'2-digit' })}
                                 </li>
                               ))
                            ) : (
                               <li>No history available</li>
                            )}
                          </ul>
                        </div>

                        {/* Package Servings & Delivery Management */}
                        {pkg.servings && pkg.servings.length > 0 && (
                          <div className="mt-4 pt-3 border-t border-gray-100 space-y-2.5">
                            <div className="flex items-center justify-between flex-wrap gap-2">
                              <div>
                                <p className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center gap-1.5">
                                  <span>📦</span> Package Servings / Deliveries ({pkg.servings.length})
                                </p>
                                <p className="text-[11px] text-gray-400">
                                  Har serving ka status badlein aur sabji / quantities customize karein.
                                </p>
                              </div>
                              {(() => {
                                const margin = parseFloat(pkg.margin_percent || pkg.seasonal_config?.margin_percent || 0);
                                const budget = parseFloat(pkg.seasonal_config?.per_service_budget || 0);
                                const perServiceWithMargin = parseFloat(pkg.per_service_price || pkg.seasonal_config?.per_service_price || (budget * (1 + margin / 100)) || 0);
                                const pkgPrice = parseFloat(pkg.package_price || pkg.seasonal_config?.package_price || (perServiceWithMargin * (pkg.services_per_month || pkg.servings?.length || 1)) || 0);

                                return (
                                  <div className="flex items-center gap-2 flex-wrap">
                                    {pkgPrice > 0 && (
                                      <span className="text-[11px] font-semibold px-2.5 py-1 rounded-md bg-purple-50 text-purple-800 border border-purple-200 flex items-center gap-1" title="Customer package total price">
                                        <span>🏷️</span> Package Price: <strong>₹{pkgPrice.toFixed(2)}</strong>
                                      </span>
                                    )}
                                    {perServiceWithMargin > 0 && (
                                      <span className="text-[11px] font-semibold px-2.5 py-1 rounded-md bg-blue-50 text-blue-800 border border-blue-200 flex items-center gap-1" title="Customer selling price per serving with margin included">
                                        <span>💰</span> Per Serving (With Margin): <strong>₹{perServiceWithMargin.toFixed(2)}</strong>
                                        {margin > 0 && <span className="text-[10px] text-blue-600 font-normal">({margin}% margin)</span>}
                                      </span>
                                    )}
                                    {budget > 0 && (
                                      <span className="text-[11px] font-semibold px-2.5 py-1 rounded-md bg-fresh-50 text-fresh-800 border border-fresh-200 flex items-center gap-1" title="Base Purchase Cost Budget per serving without margin">
                                        <span>🥦</span> Budget / Serving: <strong>₹{budget.toFixed(2)}</strong>
                                      </span>
                                    )}
                                  </div>
                                );
                              })()}
                            </div>

                            <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                              {pkg.servings.map((serving, sIdx) => {
                                const rawDate = serving.scheduled_date || serving.actual_delivery_date;
                                const formattedDate = rawDate ? new Date(rawDate).toLocaleDateString("en-IN", {
                                  weekday: 'short', day: 'numeric', month: 'short', year: 'numeric'
                                }) : "Date N/A";

                                const sMargin = parseFloat(pkg.margin_percent || pkg.seasonal_config?.margin_percent || 0);
                                const sBudget = parseFloat(pkg.seasonal_config?.per_service_budget || 0);
                                const sPerServiceWithMargin = parseFloat(pkg.per_service_price || pkg.seasonal_config?.per_service_price || (sBudget * (1 + sMargin / 100)) || 0);

                                return (
                                  <div
                                    key={serving.id || sIdx}
                                    className="p-3 rounded-xl border border-gray-200 bg-gray-50/70 hover:bg-white hover:border-gray-300 transition-all space-y-2"
                                  >
                                    <div className="flex items-center justify-between flex-wrap gap-2">
                                      <div className="flex items-center gap-2 flex-wrap">
                                        <span className="text-xs font-bold text-gray-800 bg-gray-200/80 px-2 py-0.5 rounded">
                                          Serving #{sIdx + 1}
                                        </span>
                                        <span className="text-xs font-medium text-gray-700">
                                          📅 {formattedDate}
                                        </span>
                                        {serving.delivery_time_slot && (
                                          <span className="text-[10px] text-gray-500 bg-white px-1.5 py-0.5 rounded border border-gray-200">
                                            🕒 {serving.delivery_time_slot}
                                          </span>
                                        )}
                                        <button
                                          type="button"
                                          onClick={() => openRescheduleModal(pkg, serving, sIdx)}
                                          className="text-[11px] font-semibold text-blue-700 hover:text-blue-900 bg-blue-50 hover:bg-blue-100 border border-blue-200 px-2 py-0.5 rounded-md flex items-center gap-1 transition-colors cursor-pointer"
                                          title="Reschedule this serving and subsequent deliveries"
                                        >
                                          <span>📅</span> Reschedule
                                        </button>

                                        {/* Wallet Deduct button */}
                                        {serving.is_debited ? (
                                          <button
                                            type="button"
                                            disabled={deductingServingId === serving.id}
                                            onClick={() => handleDeductServingWallet(serving, pkg, sIdx)}
                                            className="text-[11px] font-bold text-emerald-800 bg-emerald-100 hover:bg-emerald-200 border border-emerald-300 px-2.5 py-0.5 rounded-md flex items-center gap-1 transition-all cursor-pointer shadow-2xs"
                                            title={`Debited: ₹${parseFloat(serving.debited_amount || sPerServiceWithMargin).toFixed(2)} on serving date (${serving.scheduled_date}). Click to re-deduct.`}
                                          >
                                            <span>✅</span>
                                            {deductingServingId === serving.id ? "Deducting..." : `Debited (₹${parseFloat(serving.debited_amount || sPerServiceWithMargin).toFixed(2)})`}
                                          </button>
                                        ) : (
                                          <button
                                            type="button"
                                            disabled={deductingServingId === serving.id}
                                            onClick={() => handleDeductServingWallet(serving, pkg, sIdx)}
                                            className="text-[11px] font-bold text-rose-800 bg-rose-50 hover:bg-rose-100 border border-rose-300 px-2.5 py-0.5 rounded-md flex items-center gap-1 transition-all cursor-pointer shadow-2xs"
                                            title={`Serving date (${serving.scheduled_date}) par user ke wallet se ₹${sPerServiceWithMargin.toFixed(2)} deduct karein`}
                                          >
                                            <span>💳</span>
                                            {deductingServingId === serving.id ? "Deducting..." : `Wallet Deduct (₹${sPerServiceWithMargin.toFixed(2)})`}
                                          </button>
                                        )}
                                      </div>

                                      <div className="flex items-center gap-2">
                                        {/* Status selector */}
                                        <select
                                          value={serving.status}
                                          disabled={statusUpdatingId === serving.id}
                                          onChange={(e) => handleUpdateServingStatus(serving.id, e.target.value)}
                                          className={`text-xs font-semibold px-2 py-1 rounded-lg border cursor-pointer ${
                                            serving.status === 'delivered' ? 'bg-green-50 text-green-700 border-green-300' :
                                            serving.status === 'ready_for_delivery' ? 'bg-blue-50 text-blue-700 border-blue-300' :
                                            serving.status === 'skipped' ? 'bg-gray-100 text-gray-600 border-gray-300' :
                                            'bg-amber-50 text-amber-700 border-amber-300'
                                          }`}
                                        >
                                          <option value="pending">⏳ Pending</option>
                                          <option value="ready_for_delivery">🚚 Ready for Delivery</option>
                                          <option value="delivered">✅ Delivered</option>
                                          <option value="skipped">⏭ Skipped</option>
                                        </select>

                                        {/* Edit Sabji button */}
                                        <button
                                          type="button"
                                          onClick={() => openEditServingModal(pkg, serving)}
                                          className="btn-secondary text-[11px] py-1 px-2.5 flex items-center gap-1 border-fresh-300 text-fresh-700 bg-fresh-50 hover:bg-fresh-100 cursor-pointer"
                                        >
                                          <span>🥦</span> Edit Sabji
                                        </button>
                                      </div>
                                    </div>

                                    {/* Products in this serving */}
                                    <div className="pt-1.5 border-t border-gray-200/60">
                                      <div className="flex flex-wrap gap-1.5 items-center">
                                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mr-1">Products:</span>
                                        {/* Fixed items */}
                                        {serving.fixed_items && serving.fixed_items.length > 0 ? (
                                          serving.fixed_items.map((fi, fIdx) => (
                                            <span
                                              key={`fi_${fIdx}`}
                                              className="bg-white border border-gray-200 text-gray-700 text-[10px] px-2 py-0.5 rounded-md font-medium"
                                            >
                                              {fi.name} <strong className="text-gray-900">{fi.qty_gm >= 1000 ? `${(fi.qty_gm/1000).toFixed(2)}kg` : `${fi.qty_gm}${fi.unit || 'g'}`}</strong>
                                            </span>
                                          ))
                                        ) : null}

                                        {/* Seasonal items */}
                                        {serving.seasonal_items && serving.seasonal_items.length > 0 ? (
                                          serving.seasonal_items.map((si, sIdx2) => (
                                            <span
                                              key={`si_${sIdx2}`}
                                              className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-[10px] px-2 py-0.5 rounded-md font-medium flex items-center gap-1"
                                            >
                                              <span className="text-emerald-500">🌿</span> {si.name} <strong className="text-emerald-900">{si.qty_gm >= 1000 ? `${(si.qty_gm/1000).toFixed(2)}kg` : `${si.qty_gm}${si.unit || 'g'}`}</strong>
                                            </span>
                                          ))
                                        ) : (
                                          <span className="text-[10px] text-gray-400 italic">No seasonal items selected yet</span>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {pkg.deliveries && pkg.deliveries.length > 0 && (
                          <div className="mt-4 pt-3 border-t border-gray-100">
                            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Delivery History</p>
                            <div className="flex flex-wrap gap-2">
                              {pkg.deliveries.map((del, di) => {
                                const rawDate = del?.scheduled_date || del?.date || del?.actual_delivery_date;
                                const parsed = rawDate ? new Date(rawDate) : null;
                                const isValid = parsed && !isNaN(parsed.getTime());
                                return (
                                  <span key={di} className="bg-green-50 border border-green-200 text-green-700 text-[10px] px-1.5 py-0.5 rounded-md font-medium">
                                    ✅ {isValid ? parsed.toLocaleDateString("en-IN", { day: 'numeric', month: 'short' }) : "Delivered"}
                                  </span>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 2. Retail History */}
            <div className="card flex flex-col h-full">
              <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                🛒 Retail Purchases
              </h2>
              {analytics.retailHistory.length === 0 ? (
                <p className="text-gray-500 text-sm italic py-4">No retail orders found.</p>
              ) : (
                <div className="space-y-4 overflow-y-auto max-h-[500px] scrollbar-thin pr-2">
                  {analytics.retailHistory.map((order, idx) => (
                    <div key={idx} className="border-l-4 border-purple-500 bg-white shadow-sm rounded-r-xl border-y border-r border-gray-200 p-4 relative">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                            {new Date(order.date).toLocaleDateString("en-IN", { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute:'2-digit' })}
                          </p>
                          <p className="text-[10px] text-gray-400 mt-0.5">Order #{order.orderId}</p>
                        </div>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                          order.status === 'delivered' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                        }`}>
                          {order.status}
                        </span>
                      </div>
                      
                      <div className="bg-gray-50 rounded-lg p-2.5 border border-gray-100">
                        <div className="flex flex-col gap-1.5">
                          {order.items.map((item, i) => (
                            <div key={i} className="flex justify-between items-center text-sm">
                              <span className="flex items-center gap-1.5 font-medium text-gray-800">
                                <span className="text-xs">{getCategoryEmoji(item.category)}</span>
                                {item.name}
                              </span>
                              <span className="font-bold text-purple-600">{formatQuantity(item.qty, item.unit)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div className="mt-3 flex justify-between items-end border-t border-gray-100 pt-2.5">
                        <div>
                          {parseFloat(order.discount_percent || 0) > 0 ? (
                            <div>
                              <span className="inline-flex items-center gap-1 bg-purple-50 text-purple-700 border border-purple-200 text-[10px] font-bold px-2 py-0.5 rounded-full">
                                🏷️ {parseFloat(order.discount_percent)}% Discount (-₹{parseFloat(order.discount_amount || 0).toFixed(2)})
                              </span>
                              {order.subtotal && (
                                <p className="text-[10px] text-gray-400 line-through mt-0.5">
                                  Subtotal: ₹{parseFloat(order.subtotal).toFixed(2)}
                                </p>
                              )}
                            </div>
                          ) : (
                            <span className="text-[10px] text-gray-400 font-medium">Standard Retail Order</span>
                          )}
                        </div>
                        <div className="text-right">
                          <p className="text-[11px] text-gray-500 font-medium">Total Paid</p>
                          <p className="font-bold text-gray-900 text-base">₹{order.totalAmount}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* 3. Total Aggregated Quantities */}
          <div className="card">
            <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              📊 Total Product Quantities Purchased
            </h2>
            <p className="text-sm text-gray-500 mb-4">
              A complete aggregation of every product this user has received, broken down by source (Retail vs. Packages).
            </p>
            
            {analytics.totalProducts.length === 0 ? (
              <p className="text-gray-500 text-sm italic py-4">No product quantities recorded.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead>
                    <tr className="table-header">
                      <th className="p-3 rounded-tl-xl w-1/3">Product</th>
                      <th className="p-3 text-center">Retail Qty (🛒)</th>
                      <th className="p-3 text-center">Package Qty (📦)</th>
                      <th className="p-3 text-right rounded-tr-xl">Total Quantity</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {analytics.totalProducts.map((p, idx) => (
                      <tr key={idx} className="hover:bg-gray-50 transition-colors">
                        <td className="p-3">
                          <div className="flex items-center gap-2">
                            <span className="bg-white text-xs px-2 py-1 rounded border border-gray-200 shadow-sm">
                              {getCategoryEmoji(p.category)}
                            </span>
                            <span className="text-gray-900 font-semibold">{p.name}</span>
                          </div>
                        </td>
                        <td className="p-3 text-center">
                          {p.retailQty > 0 ? (
                            <span className="text-purple-600 font-bold bg-purple-50 px-2 py-1 rounded border border-purple-100">
                              {formatQuantity(p.retailQty, p.unit)}
                            </span>
                          ) : (
                            <span className="text-gray-300">-</span>
                          )}
                        </td>
                        <td className="p-3 text-center">
                          {p.packageQty > 0 ? (
                            <span className="text-blue-600 font-bold bg-blue-50 px-2 py-1 rounded border border-blue-100">
                              {formatQuantity(p.packageQty, p.unit)}
                            </span>
                          ) : (
                            <span className="text-gray-300">-</span>
                          )}
                        </td>
                        <td className="p-3 text-right text-lg font-black text-fresh-600">
                          {formatQuantity(p.totalQty, p.unit)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* 4. Wallet Transactions */}
          <div className="card lg:col-span-2">
            <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              💳 Wallet Transaction History
            </h2>
            {walletTransactions.length === 0 ? (
              <p className="text-gray-500 text-sm italic py-4">No wallet transactions found.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead>
                    <tr className="table-header">
                      <th className="p-3 rounded-tl-xl">Date & Time</th>
                      <th className="p-3">Type</th>
                      <th className="p-3">Amount</th>
                      <th className="p-3">Reason</th>
                      <th className="p-3 rounded-tr-xl">Photo Attachment</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {walletTransactions.map((wt, idx) => (
                      <tr key={idx} className="hover:bg-gray-50 transition-colors">
                        <td className="p-3 whitespace-nowrap text-xs text-gray-500 font-medium">
                          {new Date(wt.created_at).toLocaleString("en-IN")}
                        </td>
                        <td className="p-3">
                          <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${wt.type === 'credit' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                            {wt.type === 'credit' ? '+ Credit' : '- Debit'}
                          </span>
                        </td>
                        <td className={`p-3 font-bold ${wt.type === 'credit' ? 'text-emerald-600' : 'text-rose-600'}`}>
                          ₹{parseFloat(wt.amount).toFixed(2)}
                        </td>
                        <td className="p-3 text-gray-700 max-w-xs truncate" title={wt.reason}>
                          {wt.reason}
                        </td>
                        <td className="p-3">
                          {wt.photo_url ? (
                            <a href={`http://localhost:5000${wt.photo_url}`} target="_blank" rel="noreferrer" className="text-blue-500 underline text-xs">
                              View Photo
                            </a>
                          ) : (
                            <span className="text-gray-400 text-xs italic">N/A</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

        </div>
      )}

      <AdjustWalletModal 
        isOpen={showWalletModal} 
        onClose={() => setShowWalletModal(false)}
        user={selectedUser}
        onSuccess={() => {
          // Re-fetch transactions & user data
          api.get(`/admin/users/${selectedUserId}/wallet/transactions`).then(res => {
            setWalletTransactions(res.data.transactions);
          });
          api.get(`/admin/user-analytics/${selectedUserId}`).then(res => {
            setAnalytics(res.data.analytics);
            setCurrentUserInfo(res.data.user);
          });
          api.get("/admin/users").then(res => {
            setUsers(res.data.users);
          });
        }}
      />

      {/* ADD ADDRESS MODAL */}
      {showAddressModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden animate-slide-up">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center">
              <h2 className="text-xl font-bold text-gray-900">Add New Address</h2>
              <button onClick={() => setShowAddressModal(false)} className="text-gray-400 hover:text-gray-600">✖</button>
            </div>
            <form onSubmit={handleAddAddress} className="p-6 space-y-4">
              <div>
                <label className="label text-xs uppercase tracking-wider mb-1 block">Address Line</label>
                <textarea 
                  className="input w-full text-sm" 
                  rows="2"
                  value={addressForm.address_line} 
                  onChange={e => setAddressForm({...addressForm, address_line: e.target.value})}
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label text-xs uppercase tracking-wider mb-1 block">City</label>
                  <input type="text" className="input w-full text-sm" value={addressForm.city} onChange={e => setAddressForm({...addressForm, city: e.target.value})} required />
                </div>
                <div>
                  <label className="label text-xs uppercase tracking-wider mb-1 block">Pincode</label>
                  <input type="text" className="input w-full text-sm" value={addressForm.pincode} onChange={e => setAddressForm({...addressForm, pincode: e.target.value})} required />
                </div>
              </div>
              <div>
                <label className="label text-xs uppercase tracking-wider mb-1 block">Landmark (Optional)</label>
                <input type="text" className="input w-full text-sm" value={addressForm.landmark} onChange={e => setAddressForm({...addressForm, landmark: e.target.value})} />
              </div>
              <button type="submit" disabled={saving} className="btn-primary w-full py-3">
                {saving ? "Saving..." : "Add Address"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
