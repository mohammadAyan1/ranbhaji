/* eslint-disable react-hooks/exhaustive-deps, react-hooks/set-state-in-effect, no-unused-vars */
import React, { useState, useEffect } from 'react';
import api from '../../api/axios';
import useAuthStore from '../../store/authStore';
import { Package, Search, X } from 'lucide-react';

export default function AdminAllOrders() {
  const { user: currentUser } = useAuthStore();
  const [users, setUsers] = useState([]);
  const [batches, setBatches] = useState([]);
  const [deliveryBoys, setDeliveryBoys] = useState([]);
  const [loading, setLoading] = useState(true);
  const [date, setDate] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("date") === "today") return new Date().toISOString().split('T')[0];
    return params.get("date") || new Date().toISOString().split('T')[0];
  });
  const [statusFilter, setStatusFilter] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get("status") || "all";
  });
  const [typeFilter, setTypeFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  const [expandedId, setExpandedId] = useState(null);
  const [packedQuantities, setPackedQuantities] = useState({});
  const [uncheckedItems, setUncheckedItems] = useState({}); // { `${rowId}-${addrIdx}-${itemId}`: boolean }

  const getTypeConfig = (type) => {
    if (type === 'retail') {
      return {
        label: 'Retail',
        iconBox: 'bg-green-100 text-green-600 border border-green-200',
        badge: 'bg-green-100 text-green-700 border border-green-200',
        dot: 'bg-green-600',
        rowBorder: 'border-l-4 border-l-green-500',
        rowHover: 'hover:bg-green-50/25',
        expandedBorder: 'border-l-green-500',
        expandedBg: 'bg-green-50/20'
      };
    }
    if (type === 'water') {
      return {
        label: 'Water',
        iconBox: 'bg-purple-100 text-purple-600 border border-purple-200',
        badge: 'bg-purple-100 text-purple-700 border border-purple-200',
        dot: 'bg-purple-600',
        rowBorder: 'border-l-4 border-l-purple-500',
        rowHover: 'hover:bg-purple-50/25',
        expandedBorder: 'border-l-purple-500',
        expandedBg: 'bg-purple-50/20'
      };
    }
    // subscription / package
    return {
      label: 'Package',
      iconBox: 'bg-orange-100 text-orange-600 border border-orange-200',
      badge: 'bg-orange-100 text-orange-700 border border-orange-200',
      dot: 'bg-orange-600',
      rowBorder: 'border-l-4 border-l-orange-500',
      rowHover: 'hover:bg-orange-50/25',
      expandedBorder: 'border-l-orange-500',
      expandedBg: 'bg-orange-50/20'
    };
  };

  const fetchBatches = async () => {
    try {
      const { data } = await api.get('/admin/batches');
      if (data.success) {
        setBatches(data.batches);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const { data } = await api.get(`/admin/orders?date=${date}`);
      if (data.success) {
        setUsers(data.users);
        // Initialize unchecked items if packedQty is explicitly 0 but totalQty > 0
        const initialUnchecked = {};
        data.users.forEach(u => {
          u.addresses.forEach((addrGrp, idx) => {
            addrGrp.items.forEach(item => {
              if (item.isPackedSet && parseFloat(item.packedQty) === 0 && parseFloat(item.totalQty) > 0) {
                initialUnchecked[`${u.user.id}-${idx}-${item.id}`] = true;
              }
            });
          });
        });
        setUncheckedItems(initialUnchecked);
      }
    } catch (err) {
      alert('Failed to load orders');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBatches();
    fetchDeliveryBoys();
  }, []);

  const fetchDeliveryBoys = async () => {
    try {
      const res = await api.get('/admin/users');
      const boys = (res.data.users || []).filter(u => u.role === 'delivery');
      setDeliveryBoys(boys);
    } catch (err) {
      console.error('Failed to fetch delivery boys', err);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [date]);

  const handleAssignBatch = async (scheduleIds, retailOrderIds, batch_id) => {
    try {
      await api.put('/admin/orders/assign-batch', { scheduleIds, retailOrderIds, batch_id: batch_id || null });
      alert('Batch assigned successfully');
      fetchOrders();
    } catch (err) {
      alert('Failed to assign batch');
    }
  };

  const handleAssignDeliveryBoy = async (scheduleIds, retailOrderIds, delivery_boy_id) => {
    try {
      await api.put('/admin/orders/assign-delivery-boy', { scheduleIds, retailOrderIds, delivery_boy_id: delivery_boy_id || null });
      alert('Delivery boy assigned successfully');
      fetchOrders();
    } catch (err) {
      alert('Failed to assign delivery boy');
    }
  };

  const handlePackedQtyChange = (userId, addressIdx, itemId, val) => {
    setPackedQuantities(prev => ({
      ...prev,
      [`${userId}-${addressIdx}-${itemId}`]: val
    }));
  };

  const handleCheckChange = (userId, addressIdx, itemId, checked) => {
    setUncheckedItems(prev => ({
      ...prev,
      [`${userId}-${addressIdx}-${itemId}`]: !checked
    }));
  };

  const handleMarkReady = async (userId, addressIdx, itemsList, scheduleIds, retailOrderIds) => {
    try {
      // Build items array to send to backend
      const itemsPayload = itemsList.map(item => {
        const isUnchecked = uncheckedItems[`${userId}-${addressIdx}-${item.id}`];
        // Ensure default is 0 if empty
        const packedQty = packedQuantities[`${userId}-${addressIdx}-${item.id}`] ?? item.packedQty ?? 0;
        return {
          id: item.id, // product id
          packedQty: packedQty,
          isChecked: !isUnchecked
        };
      });

      // Validation: Check if any checked item has 0 packed quantity
      const hasInvalidItem = itemsPayload.some(item => item.isChecked && parseFloat(item.packedQty || 0) === 0);
      if (hasInvalidItem) {
        alert("Please enter a Packed Quantity for checked items, or uncheck the product.");
        return;
      }

      await api.put('/admin/orders/pack', {
        scheduleIds,
        retailOrderIds,
        items: itemsPayload
      });
      alert('Orders marked as Ready for Delivery');
      fetchOrders();
    } catch (err) {
      alert('Failed to mark as ready');
    }
  };

  const toggleRow = (id) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const formatQuantity = (qty, unit) => {
    const numericQty = parseFloat(qty);
    if (unit === "gm" || unit === "ml") {
      if (numericQty >= 1000) {
        return `${(numericQty / 1000).toFixed(1)} ${unit === "gm" ? "kg" : "L"}`;
      }
      return `${numericQty.toFixed(0)} ${unit}`;
    }
    return `${numericQty.toFixed(0)} ${unit || "pieces"}`;
  };

  const counts = {
    all: users.length,
    subscription: users.filter(u => (u.order_type || (u.hasPackage ? 'subscription' : 'retail')) === 'subscription').length,
    water: users.filter(u => (u.order_type || (u.hasPackage ? 'subscription' : 'retail')) === 'water').length,
    retail: users.filter(u => (u.order_type || (u.hasPackage ? 'subscription' : 'retail')) === 'retail').length,
  };

  const filteredUsers = users.filter(u => {
    if (statusFilter !== 'all') {
      if (statusFilter === 'pending' && !u.addresses?.some(a => a.status === 'pending')) return false;
      if (statusFilter === 'ready' && !u.addresses?.some(a => a.status === 'ready' || a.status === 'ready_for_delivery')) return false;
      if (statusFilter === 'delivered' && !u.addresses?.some(a => a.status === 'delivered')) return false;
    }

    const orderType = u.order_type || (u.hasPackage ? 'subscription' : 'retail');
    if (typeFilter !== 'all' && orderType !== typeFilter) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const matchName = u.user?.name?.toLowerCase().includes(q);
      const matchPhone = u.user?.phone?.toLowerCase().includes(q);
      const matchOrderNum = u.order_number?.toLowerCase().includes(q);
      const matchDesc = u.description?.toLowerCase().includes(q);
      if (!matchName && !matchPhone && !matchOrderNum && !matchDesc) return false;
    }

    return true;
  });

  return (
    <div className="p-6">
      <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center mb-6 gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight">All Orders (Address-wise)</h2>
          <p className="text-gray-500 text-sm mt-0.5">Grouped orders by user and their specific addresses</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          {/* Live Search Bar */}
          <div className="relative min-w-[200px] max-w-xs">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search user, order #..."
              className="w-full pl-10 pr-8 py-2 text-sm bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 text-gray-800 placeholder-gray-400 shadow-sm"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                title="Clear search"
              >
                <X size={14} />
              </button>
            )}
          </div>

          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="input-field py-2 px-3 text-sm w-38 shadow-sm"
          />
        </div>
      </div>

      {/* Type Filter Pills (All, Package, Water, Retail) */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <button
          onClick={() => setTypeFilter('all')}
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
            typeFilter === 'all'
              ? 'bg-gray-900 text-white shadow-sm'
              : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
          }`}
        >
          All Orders ({counts.all})
        </button>
        <button
          onClick={() => setTypeFilter('subscription')}
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 ${
            typeFilter === 'subscription'
              ? 'bg-orange-500 text-white shadow-sm'
              : 'bg-orange-50 text-orange-700 border border-orange-200 hover:bg-orange-100'
          }`}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-orange-600"></span>
          Package ({counts.subscription})
        </button>
        <button
          onClick={() => setTypeFilter('water')}
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 ${
            typeFilter === 'water'
              ? 'bg-purple-600 text-white shadow-sm'
              : 'bg-purple-50 text-purple-700 border border-purple-200 hover:bg-purple-100'
          }`}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-purple-600"></span>
          Water ({counts.water})
        </button>
        <button
          onClick={() => setTypeFilter('retail')}
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 ${
            typeFilter === 'retail'
              ? 'bg-green-600 text-white shadow-sm'
              : 'bg-green-50 text-green-700 border border-green-200 hover:bg-green-100'
          }`}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-green-600"></span>
          Retail ({counts.retail})
        </button>
      </div>

      {loading ? (
        <div className="text-center text-gray-600 py-10">Loading users...</div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left min-w-[700px]">
              <thead className="bg-gray-50/80 border-b border-gray-200 text-gray-600 text-sm font-semibold">
                <tr>
                  <th className="p-4 w-12 font-semibold"></th>
                  <th className="p-4 font-semibold">Order Details & Customer</th>
                  <th className="p-4 font-semibold">Order Type</th>
                  <th className="p-4 font-semibold">Total Items</th>
                  <th className="p-4 font-semibold text-right">Assign All</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-gray-700">
                {filteredUsers.map((u, rIdx) => {
                  const rowId = u.uniqueId || `${u.order_type}_${u.order_id}` || `${u.user?.id}_${rIdx}`;
                  const orderType = u.order_type || (u.hasPackage ? 'subscription' : 'retail');
                  const typeConfig = getTypeConfig(orderType);
                  const isExpanded = expandedId === rowId;

                  return (
                  <React.Fragment key={rowId}>
                    <tr className={`transition-colors ${typeConfig.rowBorder} ${typeConfig.rowHover} ${isExpanded ? 'bg-gray-50/70' : 'bg-white'}`}>
                      <td className="p-4 text-gray-400 hover:text-gray-700 cursor-pointer text-center font-bold" onClick={() => toggleRow(rowId)}>
                        {isExpanded ? '▼' : '▶'}
                      </td>
                      <td className="p-4 cursor-pointer" onClick={() => toggleRow(rowId)}>
                        <div className="flex items-center gap-3">
                          <div className={`p-2.5 rounded-xl shrink-0 ${typeConfig.iconBox}`}>
                            <Package size={18} />
                          </div>
                          <div>
                            <div className="font-semibold text-gray-900 text-sm">{u.user?.name || "Unknown"}</div>
                            <div className="text-xs text-gray-500 flex items-center gap-1.5 flex-wrap mt-0.5">
                              <span>{u.user?.phone}</span>
                              {u.order_number && (
                                <span className="font-mono text-[11px] font-semibold text-gray-600 bg-gray-100 px-1.5 py-0.5 rounded border border-gray-200">
                                  #{u.order_number}
                                </span>
                              )}
                              {u.status === 'delivered' ? (
                                <span className="text-[10px] bg-green-100 text-green-800 px-1.5 py-0.5 rounded border border-green-200 font-bold">
                                  Delivered
                                </span>
                              ) : u.status === 'ready_for_delivery' || u.status === 'ready' ? (
                                <span className="text-[10px] bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded border border-blue-200 font-bold">
                                  Ready
                                </span>
                              ) : (
                                <span className="text-[10px] bg-amber-50 text-amber-700 px-1.5 py-0.5 rounded border border-amber-200 font-bold">
                                  Pending
                                </span>
                              )}
                              {u.description && (
                                <span className="text-gray-500 text-xs font-medium">
                                  • {u.description}
                                </span>
                              )}
                            </div>
                            {u.delivery_time_slot && (
                              <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-800 border border-amber-200 px-2 py-0.5 rounded text-[10px] font-bold mt-1">
                                ⏱ Requested: {u.delivery_time_slot}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="p-4 cursor-pointer" onClick={() => toggleRow(rowId)}>
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-lg ${typeConfig.badge}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${typeConfig.dot}`}></span>
                          {typeConfig.label}
                        </span>
                      </td>
                      <td className="p-4 cursor-pointer" onClick={() => toggleRow(rowId)}>
                        <span className="bg-gray-100 px-2.5 py-1 rounded-full text-xs border border-gray-300 font-medium text-gray-700">
                          {u.totalItems?.length || 0} items
                        </span>
                      </td>
                      <td className="p-4 text-right">
                        {currentUser?.role === 'admin' ? (
                          <div className="text-right flex flex-col items-end gap-2">
                            <div>
                              <p className="text-sm text-gray-600 uppercase tracking-wide text-xs mb-1">Assign Batch</p>
                              {/* <select
                                className="input-field py-1 text-sm bg-gray-50 border-gray-200"
                                value={u.batch_id || ""}
                                onChange={(e) => handleAssignBatch(u.allScheduleIds, u.allRetailOrderIds, e.target.value)}
                              >
                                <option value="">Unassigned</option>
                                {batches.map(b => (
                                  <option key={b.id} value={b.id}>{b.name}</option>
                                ))}
                              </select> */}
                              <p className="text-xs text-gray-500 mt-1">
                                {u.batch_id ? batches.find(b => b.id === u.batch_id)?.name || 'Assigned' : 'Unassigned'}
                              </p>
                            </div>

                            <div>
                              <p className="text-sm text-gray-600 uppercase tracking-wide text-xs mb-1">Assign Boy</p>
                              {/* <select
                                className="input-field py-1 text-sm bg-gray-50 border-gray-200"
                                value={u.delivery_boy_id || ""}
                                onChange={(e) => handleAssignDeliveryBoy(u.allScheduleIds, u.allRetailOrderIds, e.target.value)}
                              >
                                <option value="">Unassigned</option>
                                {deliveryBoys.map(boy => (
                                  <option key={boy.id} value={boy.id}>{boy.name}</option>
                                ))}
                              </select> */}
                              <p className="text-xs text-gray-500 mt-1">
                                {u.delivery_boy_id ? deliveryBoys.find(b => b.id === u.delivery_boy_id)?.name || 'Assigned' : 'Unassigned'}
                              </p>
                            </div>
                          </div>
                        ) : (
                          <span className="text-gray-600 text-sm">
                            {u.batch_id ? batches.find(b => b.id === u.batch_id)?.name || 'Assigned' : 'Unassigned'}
                          </span>
                        )}
                      </td>
                    </tr>

                    {isExpanded && (
                      <tr className="bg-white/50">
                        <td colSpan="5" className={`p-0 border-l-4 ${typeConfig.expandedBorder}`}>
                          <div className={`p-6 ${typeConfig.expandedBg}`}>
                            {/* Order summary banner in expanded view */}
                            <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-200/80">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-lg ${typeConfig.badge}`}>
                                  <span className={`w-1.5 h-1.5 rounded-full ${typeConfig.dot}`}></span>
                                  {typeConfig.label}
                                </span>
                                {u.order_number && (
                                  <span className="font-mono text-xs font-bold text-gray-700 bg-white px-2 py-0.5 rounded border border-gray-200">
                                    #{u.order_number}
                                  </span>
                                )}
                                {u.description && (
                                  <span className="text-sm font-medium text-gray-700">
                                    — {u.description}
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Address-wise breakdown */}
                            <div className="mb-6 space-y-4">
                              <h4 className="text-sm font-bold text-gray-700 uppercase tracking-wider flex items-center">
                                <span className="bg-fresh-500/20 text-fresh-600 p-1.5 rounded mr-2">📍</span>
                                Deliveries by Address
                              </h4>

                              <div className="grid grid-cols-1 gap-4">
                                {u.addresses.map((addrGrp, idx) => (
                                  <div key={idx} className="bg-gray-100 rounded-lg p-4 border border-gray-300">
                                    <div className="flex flex-col sm:flex-row justify-between items-start mb-4 gap-3">
                                      <div className="pr-4">
                                        <div className="flex flex-wrap items-center gap-2 mb-1">
                                          <p className="text-gray-600 uppercase tracking-wide text-xs">Delivery Address</p>
                                          {addrGrp.status === 'ready_for_delivery' && (
                                            <span className="bg-blue-100 text-blue-700 text-[10px] px-2 py-0.5 rounded-full border border-blue-200 font-semibold">
                                              Ready for Delivery
                                            </span>
                                          )}
                                          {addrGrp.status === 'delivered' && (
                                            <span className="bg-green-100 text-green-700 text-[10px] px-2 py-0.5 rounded-full border border-green-200 font-semibold">
                                              Delivered
                                            </span>
                                          )}
                                          {addrGrp.status === 'pending' && (
                                            <span className="bg-amber-100 text-amber-700 text-[10px] px-2 py-0.5 rounded-full border border-amber-200 font-semibold">
                                              Pending
                                            </span>
                                          )}
                                          {addrGrp.is_returned_serving && (
                                            <span className="bg-red-500/20 text-red-500 text-[10px] px-2 py-0.5 rounded-full border border-red-500/30">
                                              Returned Serving
                                            </span>
                                          )}
                                        </div>
                                        <p className="font-medium text-gray-900">{addrGrp.address}</p>
                                      </div>
                                      <div className="text-right flex flex-col items-end gap-2">
                                        <div>
                                          <p className="text-sm text-gray-600 uppercase tracking-wide text-xs mb-1">Assign Batch</p>
                                          <select
                                            className="input-field py-1 text-sm bg-gray-50 border-gray-200"
                                            value={addrGrp.batch_id || ""}
                                            onChange={(e) => handleAssignBatch(addrGrp.scheduleIds, addrGrp.retailOrderIds, e.target.value)}
                                          >
                                            <option value="">Unassigned</option>
                                            {batches.map(b => (
                                              <option key={b.id} value={b.id}>{b.name}</option>
                                            ))}
                                          </select>
                                          <p className="text-xs text-gray-500 mt-1">
                                            {addrGrp.batch_id ? batches.find(b => b.id === addrGrp.batch_id)?.name || 'Assigned' : 'Unassigned'}
                                          </p>
                                        </div>

                                        <div>
                                          <p className="text-sm text-gray-600 uppercase tracking-wide text-xs mb-1">Assign Boy</p>
                                          <select
                                            className="input-field py-1 text-sm bg-gray-50 border-gray-200"
                                            value={addrGrp.delivery_boy_id || ""}
                                            onChange={(e) => handleAssignDeliveryBoy(addrGrp.scheduleIds, addrGrp.retailOrderIds, e.target.value)}
                                          >
                                            <option value="">Unassigned</option>
                                            {deliveryBoys.map(boy => (
                                              <option key={boy.id} value={boy.id}>{boy.name}</option>
                                            ))}
                                          </select>
                                          <p className="text-xs text-gray-500 mt-1">
                                            {addrGrp.delivery_boy_id ? deliveryBoys.find(b => b.id === addrGrp.delivery_boy_id)?.name || 'Assigned' : 'Unassigned'}
                                          </p>
                                        </div>
                                      </div>
                                    </div>

                                    {addrGrp.items.length > 0 && (
                                      <div className="overflow-x-auto rounded border border-gray-300/50">
                                        <table className="w-full text-sm text-left min-w-[500px]">
                                          <thead className="bg-white/50 text-gray-600 text-xs">
                                            <tr>
                                              <th className="p-2 pl-4 w-8"></th>
                                              <th className="p-2">Item Name</th>
                                              <th className="p-2 text-blue-400">Package Qty</th>
                                              <th className="p-2 text-purple-400">Retail Qty</th>
                                              <th className="p-2 text-right">Total</th>
                                              <th className="p-2 pl-4 w-24">Packed Qty</th>
                                            </tr>
                                          </thead>
                                          <tbody className="divide-y divide-gray-700/50">
                                            {addrGrp.items.map((item, i) => (
                                              <tr key={i} className={`hover:bg-gray-700/20 text-gray-700 ${uncheckedItems[`${u.user.id}-${idx}-${item.id}`] ? 'opacity-50 line-through' : ''}`}>
                                                <td className="p-2 pl-4">
                                                  <input
                                                    type="checkbox"
                                                    className="w-4 h-4 text-fresh-500 bg-gray-100 border-gray-600 rounded focus:ring-fresh-500 cursor-pointer"
                                                    checked={!uncheckedItems[`${u.user.id}-${idx}-${item.id}`]}
                                                    onChange={(e) => handleCheckChange(u.user.id, idx, item.id, e.target.checked)}
                                                  />
                                                </td>
                                                <td className="p-2 font-medium">
                                                  {item.name} {item.hindi_name ? <span className="text-gray-500 font-normal text-xs">({item.hindi_name})</span> : ""}
                                                </td>
                                                <td className="p-2 text-blue-600">
                                                  <div className="flex items-center gap-1 group relative">
                                                    <span>{item.packageQty > 0 ? formatQuantity(item.packageQty, item.unit) : '-'}</span>
                                                    {(item.missedQty > 0 || item.returnedQty > 0) && (
                                                      <div className="cursor-help text-blue-500 font-bold ml-1">
                                                        ⓘ
                                                        <div className="absolute left-full ml-2 top-[-10px] hidden group-hover:block bg-gray-800 text-white text-xs p-2 rounded w-max z-10 shadow-lg border border-gray-600">
                                                          <p>Total Package Qty: {formatQuantity(item.packageQty, item.unit)}</p>
                                                          <hr className="my-1 border-gray-600" />
                                                          <p>Base: {formatQuantity(item.packageQty - item.missedQty - item.returnedQty, item.unit)}</p>
                                                          {item.missedQty > 0 && <p className="text-orange-300">Missed Added: {formatQuantity(item.missedQty, item.unit)}</p>}
                                                          {item.returnedQty > 0 && <p className="text-red-300">Returned Added: {formatQuantity(item.returnedQty, item.unit)}</p>}
                                                        </div>
                                                      </div>
                                                    )}
                                                  </div>
                                                </td>
                                                <td className="p-2 text-purple-300">
                                                  {item.retailQty > 0 ? formatQuantity(item.retailQty, item.unit) : '-'}
                                                </td>
                                                <td className="p-2 text-right font-medium">
                                                  {formatQuantity(item.totalQty, item.unit)}
                                                </td>
                                                <td className="p-2 pl-4 flex items-center gap-1">
                                                  <input
                                                    type="number"
                                                    className="input-field py-1 px-2 text-xs w-20"
                                                    value={packedQuantities[`${u.user.id}-${idx}-${item.id}`] ?? (item.packedQty || 0)}
                                                    onChange={(e) => handlePackedQtyChange(u.user.id, idx, item.id, e.target.value)}
                                                  />
                                                  <button
                                                    title="Auto-fill total required"
                                                    onClick={() => handlePackedQtyChange(u.user.id, idx, item.id, item.totalQty)}
                                                    className="bg-blue-100 hover:bg-blue-200 text-blue-600 rounded px-1.5 py-1 text-[10px] transition-colors border border-blue-200"
                                                  >
                                                    Fill
                                                  </button>
                                                </td>
                                              </tr>
                                            ))}
                                          </tbody>
                                        </table>
                                      </div>
                                    )}

                                    <div className="mt-4 flex justify-end">
                                      {/* <button
                                        onClick={() => handleMarkReady(u.user.id, idx, addrGrp.items, addrGrp.scheduleIds, addrGrp.retailOrderIds)}
                                        className="btn-primary py-1.5 px-4 text-sm font-semibold"
                                      >
                                        {addrGrp.status === 'ready_for_delivery' ? 'Update Ready for Delivery' : 'Mark Ready for Delivery'}
                                      </button> */}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>

                            {/* Overall Total Breakdown */}
                            <div className="mt-8 border-t border-gray-300 pt-6">
                              <h4 className="text-sm font-bold text-gray-600 mb-3 uppercase tracking-wider">Overall Total for User</h4>
                              {u.totalItems.length > 0 ? (
                                <div className="overflow-x-auto rounded-lg border border-gray-300/50">
                                  <table className="w-full text-sm text-left opacity-75 min-w-[300px]">
                                    <thead className="bg-white text-gray-500">
                                      <tr>
                                        <th className="p-2 pl-4">Item Name</th>
                                        <th className="p-2 text-right">Total Qty (All Addresses)</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-800">
                                      {u.totalItems.map((item, idx) => (
                                        <tr key={idx} className="hover:bg-white text-gray-600">
                                          <td className="p-2 pl-4 font-medium">{item.name}</td>
                                          <td className="p-2 pr-4 text-right font-medium">
                                            {formatQuantity(item.totalQty, item.unit)}
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              ) : (
                                <p className="text-gray-600 text-sm italic">No items found.</p>
                              )}
                            </div>

                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                  );
                })}
                {filteredUsers.length === 0 && (
                  <tr>
                    <td colSpan="5" className="p-8 text-center text-gray-500 font-medium">
                      {users.length === 0 
                        ? "No orders found for this date." 
                        : "No orders found matching the selected filter/search."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
