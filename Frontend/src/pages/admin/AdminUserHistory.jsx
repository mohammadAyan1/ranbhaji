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
  const [waterDiscountForm, setWaterDiscountForm] = useState({ discount_percentage: "", bottles_count: "1" });
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

  // Fetch all users & packages on mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [usersRes, pkgRes, batchesRes] = await Promise.all([
          api.get("/admin/users"),
          api.get("/packages"),
          api.get("/user/batches")
        ]);
        setUsers(usersRes.data.users || []);
        setPackages(pkgRes.data.packages || []);
        setBatches(batchesRes.data.batches || []);
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
        const [res, transRes] = await Promise.all([
          api.get(`/admin/user-analytics/${selectedUserId}`),
          api.get(`/admin/users/${selectedUserId}/wallet/transactions`)
        ]);
        setAnalytics(res.data.analytics);
        setCurrentUserInfo(res.data.user);
        setDiscountPercent(res.data.user?.discount_percentage ?? "0");
        setWaterDiscounts(res.data.waterDiscounts || []);
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

    const bottles = parseInt(waterDiscountForm.bottles_count, 10);
    const percent = parseFloat(waterDiscountForm.discount_percentage);

    if (isNaN(bottles) || bottles < 1) {
      setWaterDiscountError("Bottles count must be an integer of at least 1");
      return;
    }
    if (isNaN(percent) || percent < 0 || percent > 100) {
      setWaterDiscountError("Discount percentage must be between 0% and 100%");
      return;
    }

    // Check duplicate
    const alreadyExists = waterDiscounts.some(d => parseInt(d.bottles_count) === bottles);
    if (alreadyExists) {
      setWaterDiscountError(`⚠️ Discount for ${bottles} bottle${bottles > 1 ? 's' : ''} already exists! Duplicate tiers for the same bottle count are not allowed.`);
      return;
    }

    setSavingWaterDiscount(true);
    try {
      const res = await api.post(`/admin/user-analytics/users/${selectedUserId}/water-discounts`, {
        bottles_count: bottles,
        discount_percentage: percent
      });
      setWaterDiscounts(res.data.discounts || []);
      setWaterDiscountForm({ discount_percentage: "", bottles_count: "1" });
      setActionMsg(`✅ Water discount (${percent}% for ${bottles} bottle(s)) created successfully!`);
    } catch (err) {
      setWaterDiscountError(err.response?.data?.message || err.message);
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
              setWaterDiscountForm({ discount_percentage: "", bottles_count: "1" });
              setShowWaterDiscountModal(true);
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
                  setWaterDiscountForm({ discount_percentage: "", bottles_count: "1" });
                  setShowWaterDiscountModal(true);
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
                    {waterDiscounts.map((tier, idx) => {
                      const bottles = parseInt(tier.bottles_count);
                      const percent = parseFloat(tier.discount_percentage);
                      const isHighest = idx === waterDiscounts.length - 1;
                      const exampleBase = bottles * 20 * 30; // ₹20 bottle, 30 days
                      const exampleOff = (exampleBase * percent) / 100;
                      const exampleFinal = exampleBase - exampleOff;

                      return (
                        <div 
                          key={tier.id} 
                          className="flex items-center justify-between p-3 rounded-xl border border-sky-100 bg-gradient-to-r from-sky-50/60 to-white hover:border-sky-300 transition-all shadow-2xs"
                        >
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="px-2.5 py-0.5 rounded-lg text-xs font-extrabold bg-blue-600 text-white shadow-xs">
                                🍼 {bottles} Bottle{bottles > 1 ? 's' : ''} / day
                              </span>
                              <span className="px-2 py-0.5 rounded-lg text-xs font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-300">
                                🏷️ {percent}% OFF
                              </span>
                              {isHighest && (
                                <span className="text-[10px] font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full border border-amber-200">
                                  ⭐ Highest Tier (Applies to {bottles}+ bottles)
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-gray-500">
                              Example (₹20/bottle, 30 days): ₹{exampleBase} → <span className="font-bold text-emerald-600">₹{exampleFinal}</span> (Save ₹{exampleOff})
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
                      const alreadyUsed = waterDiscounts.some(d => parseInt(d.bottles_count) === b);
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
                          title={alreadyUsed ? `${b} bottle tier already exists` : ""}
                        >
                          {b} Bottle{b > 1 ? 's' : ''} {alreadyUsed ? '(Exists)' : ''}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Live Preview Box */}
                {(() => {
                  const b = parseInt(waterDiscountForm.bottles_count) || 1;
                  const p = parseFloat(waterDiscountForm.discount_percentage) || 0;
                  const approxTotal = b * 20 * 30;
                  const approxOff = (approxTotal * p) / 100;
                  const approxFinal = approxTotal - approxOff;

                  return (
                    <div className="p-3 bg-white rounded-lg border border-sky-200 text-xs text-gray-700 space-y-1">
                      <p className="font-bold text-sky-800 flex items-center gap-1">
                        <span>💡</span> Live Calculation Preview:
                      </p>
                      <p className="text-[11px] text-gray-600">
                        At ₹20/bottle for 30 days ({b * 30} bottles):
                      </p>
                      <div className="flex items-center justify-between text-xs pt-1 border-t border-gray-100">
                        <span>Original: <span className="font-semibold">₹{approxTotal}</span></span>
                        <span>Discount ({p}%): <span className="font-bold text-emerald-600">-₹{approxOff.toFixed(1)}</span></span>
                        <span>Customer Pays: <span className="font-extrabold text-blue-700">₹{approxFinal.toFixed(1)}</span></span>
                      </div>
                    </div>
                  );
                })()}

                <button
                  type="submit"
                  disabled={savingWaterDiscount}
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
                    <strong>Duplicate Rule:</strong> Ek bottle count ke liye sirf 1 discount tier ban sakta hai (e.g. 1 bottle ke liye ek baar create hone ke baad dobara nahi ban sakta).
                  </li>
                  <li>
                    <strong>Highest Tier Rule:</strong> Agar user sabse highest bottle tier se zyada bottles order karta hai (e.g., tier is 2 bottles @ 15% and user orders 3 or 4 bottles), toh usko automatically highest tier (15%) discount apply hoga.
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
                          <p className="font-bold text-gray-900 flex items-center gap-2">
                            {pkg.name}
                            {pkg.status && (
                              <span className={`text-[9px] px-1.5 py-0.5 rounded-full ${
                                pkg.status === 'active' ? 'bg-green-100 text-green-700' :
                                pkg.status === 'completed' ? 'bg-gray-200 text-gray-700' :
                                'bg-yellow-100 text-yellow-700'
                              }`}>
                                {pkg.status}
                              </span>
                            )}
                          </p>
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

                        {pkg.deliveries && pkg.deliveries.length > 0 && (
                          <div className="mt-4 pt-3 border-t border-gray-100">
                            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Delivery History</p>
                            <div className="flex flex-wrap gap-2">
                              {pkg.deliveries.map((del, di) => (
                                <span key={di} className="bg-green-50 border border-green-200 text-green-700 text-[10px] px-1.5 py-0.5 rounded-md font-medium">
                                  ✅ {new Date(del.date).toLocaleDateString("en-IN", { day: 'numeric', month: 'short' })}
                                </span>
                              ))}
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
          // Re-fetch transactions
          api.get(`/admin/users/${selectedUserId}/wallet/transactions`).then(res => {
            setWalletTransactions(res.data.transactions);
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
