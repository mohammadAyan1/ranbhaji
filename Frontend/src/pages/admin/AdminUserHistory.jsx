import React, { useEffect, useState } from "react";
import api from "../../api/axios";

export default function AdminUserHistory() {
  const [users, setUsers] = useState([]);
  const [packages, setPackages] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");

  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showRenewModal, setShowRenewModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [actionMsg, setActionMsg] = useState("");

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
        const [usersRes, pkgRes] = await Promise.all([
          api.get("/admin/users"),
          api.get("/packages")
        ]);
        setUsers(usersRes.data.users || []);
        setPackages(pkgRes.data.packages || []);
      } catch (err) {
        setMsg(`❌ Failed to load data: ${err.response?.data?.message || err.message}`);
      }
    };
    fetchData();
  }, []);

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
        const res = await api.get(`/admin/user-analytics/${selectedUserId}`);
        setAnalytics(res.data.analytics);
      } catch (err) {
        setMsg(`❌ Failed to load analytics for user: ${err.response?.data?.message || err.message}`);
      } finally {
        setLoading(false);
      }
    };
    fetchAnalytics();
  }, [selectedUserId]);

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
        <div className="flex gap-4 mb-4">
          <button onClick={() => setShowAssignModal(true)} className="btn-primary text-sm px-4 py-2 flex items-center gap-2">
            <span>🎁</span> Assign New Package
          </button>
          <button onClick={() => setShowRenewModal(true)} className="btn-secondary text-sm px-4 py-2 flex items-center gap-2 border-fresh-200 text-fresh-700 bg-fresh-50 hover:bg-fresh-100">
            <span>🔄</span> Renew Package
          </button>
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
                          <p className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold">{pkg.type}</p>
                        </div>
                        <div className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-xs font-bold border border-blue-200">
                          Renewed {pkg.renewals} {pkg.renewals === 1 ? 'Time' : 'Times'}
                        </div>
                      </div>
                      <div className="p-3 bg-white">
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
                      <div className="mt-3 text-right">
                        <p className="text-xs text-gray-500">Total Spent</p>
                        <p className="font-bold text-gray-900">₹{order.totalAmount}</p>
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

        </div>
      )}
    </div>
  );
}
