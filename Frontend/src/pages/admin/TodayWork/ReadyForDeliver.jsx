/* eslint-disable react-hooks/exhaustive-deps, react-hooks/set-state-in-effect, no-unused-vars */
import React, { useState, useEffect } from 'react';
import api from '../../../api/axios';
import useAuthStore from '../../../store/authStore';
import { Search, X, Clock, Edit2 } from 'lucide-react';

export default function ReadyForDeliver() {
  const { user: currentUser } = useAuthStore();
  const [users, setUsers] = useState([]);
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [date, setDate] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("date") === "today") return new Date().toISOString().split('T')[0];
    return params.get("date") || new Date().toISOString().split('T')[0];
  });
  const [statusFilter, setStatusFilter] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get("status") || "all";
  });

  const [expandedId, setExpandedId] = useState(null);
  const [packedQuantities, setPackedQuantities] = useState({});
  const [uncheckedItems, setUncheckedItems] = useState({});

  // Requested Time editing state
  const [editingOrderTime, setEditingOrderTime] = useState(null);
  const [newTimeSlot, setNewTimeSlot] = useState("");
  const [savingTime, setSavingTime] = useState(false);

  const openEditTimeModal = (order) => {
    setEditingOrderTime(order);
    setNewTimeSlot(order.delivery_time_slot || "");
  };

  const handleSaveTimeSlot = async () => {
    if (!editingOrderTime) return;
    setSavingTime(true);
    try {
      const res = await api.put('/admin/orders/requested-time', {
        scheduleIds: editingOrderTime.allScheduleIds || (editingOrderTime.order_id ? [editingOrderTime.order_id] : []),
        retailOrderIds: editingOrderTime.allRetailOrderIds || (editingOrderTime.order_type === 'retail' ? [editingOrderTime.order_id] : []),
        delivery_time_slot: newTimeSlot
      });
      if (res.data.success) {
        setUsers(prev => prev.map(u => {
          if (u.uniqueId === editingOrderTime.uniqueId) {
            return { ...u, delivery_time_slot: newTimeSlot };
          }
          return u;
        }));
        setEditingOrderTime(null);
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update requested time');
    } finally {
      setSavingTime(false);
    }
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
      const { data } = await api.get(`/admin/orders?date=${date}&dispatch=true`);
      if (data.success) {
        const rawUsers = data.users || [];
        const processedUsers = rawUsers.map(u => {
          const filteredAddresses = (u.addresses || []).map(addrGrp => {
            const completedItems = (addrGrp.items || []).filter(item => item.is_production_completed === true);
            return {
              ...addrGrp,
              items: completedItems
            };
          });
          const allCompletedItems = filteredAddresses.flatMap(a => a.items);
          return {
            ...u,
            addresses: filteredAddresses,
            totalItems: allCompletedItems
          };
        }).filter(u => u.totalItems && u.totalItems.length > 0);

        setUsers(processedUsers);
        const initialUnchecked = {};
        processedUsers.forEach(u => {
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
  }, []);

  useEffect(() => {
    fetchOrders();
  }, [date]);

  const handlePackedQtyChange = (orderKey, addressIdx, itemId, val) => {
    setPackedQuantities(prev => ({
      ...prev,
      [`${orderKey}-${addressIdx}-${itemId}`]: val
    }));
  };

  const handleCheckChange = (orderKey, addressIdx, itemId, checked) => {
    setUncheckedItems(prev => ({
      ...prev,
      [`${orderKey}-${addressIdx}-${itemId}`]: !checked
    }));
  };

  const handleMarkReady = async (orderKey, addressIdx, itemsList, scheduleIds, retailOrderIds) => {
    try {
      const itemsPayload = itemsList.map(item => {
        const isUnchecked = uncheckedItems[`${orderKey}-${addressIdx}-${item.id}`];
        const packedQty = packedQuantities[`${orderKey}-${addressIdx}-${item.id}`] ?? item.packedQty ?? 0;
        return {
          id: item.id,
          packedQty: packedQty,
          isChecked: !isUnchecked
        };
      });

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

  const toggleRow = (orderKey) => {
    setExpandedId(expandedId === orderKey ? null : orderKey);
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

  // Filter users to ONLY show those that have AT LEAST ONE address with a batch assigned
  const assignedUsers = users.filter(u => {
    return u.batch_id != null || u.addresses.some(a => a.batch_id != null);
  });

  const filteredAssignedUsers = assignedUsers.filter(u => {
    // Status filter
    if (statusFilter === 'pending' && !u.addresses.some(a => a.status === 'pending')) return false;
    if (statusFilter === 'ready' && !u.addresses.some(a => a.status === 'ready' || a.status === 'ready_for_delivery')) return false;

    // Search query filter
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    const userName = (u.user?.name || "").toLowerCase();
    const userPhone = (u.user?.phone || "").toLowerCase();
    const timeSlot = (u.delivery_time_slot || "").toLowerCase();
    
    // Batch names from user or addresses
    const userBatchName = (u.batch_id ? batches.find(b => b.id === u.batch_id)?.name || "" : "").toLowerCase();
    const addressBatchNames = u.addresses.map(a => a.batch_id ? (batches.find(b => b.id === a.batch_id)?.name || "") : "").join(" ").toLowerCase();
    
    // Package / Items
    const itemsText = u.addresses.flatMap(a => (a.items || []).map(i => `${i.name || ''} ${i.hindi_name || ''}`)).join(" ").toLowerCase();
    const addressesText = u.addresses.map(a => a.address || "").join(" ").toLowerCase();
    const hasPackageText = u.hasPackage ? "package yes" : "no";

    return (
      userName.includes(q) ||
      userPhone.includes(q) ||
      timeSlot.includes(q) ||
      userBatchName.includes(q) ||
      addressBatchNames.includes(q) ||
      itemsText.includes(q) ||
      addressesText.includes(q) ||
      hasPackageText.includes(q)
    );
  });

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center mb-6 gap-4 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Dispatch</h2>
          <p className="text-gray-500 text-sm">Verify and pack batch-assigned orders</p>
        </div>
        <div className="w-full lg:w-auto flex flex-wrap items-center gap-3">
          {/* Live Search Bar */}
          <div className="relative min-w-[220px] max-w-xs">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search user, batch, items..."
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

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="input-field w-full sm:w-auto min-w-[150px] py-2 px-3 text-sm bg-gray-50 border border-gray-200 rounded-xl"
          >
            <option value="all">All Statuses</option>
            <option value="pending">Not Ready (Pending)</option>
            <option value="ready">Ready (Packed)</option>
          </select>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="input-field w-full sm:w-auto py-2 px-3 text-sm bg-gray-50 border border-gray-200 rounded-xl"
          />
        </div>
      </div>

      {loading ? (
        <div className="text-center text-gray-600 py-10">Loading orders...</div>
      ) : assignedUsers.length === 0 ? (
        <div className="bg-white p-8 text-center text-gray-500 font-medium rounded-2xl border border-gray-100">
          No batch-assigned orders found for this date. Go to 'Batch Assign' to assign batches first.
        </div>
      ) : filteredAssignedUsers.length === 0 ? (
        <div className="bg-white p-8 text-center text-gray-500 font-medium rounded-2xl border border-gray-100">
          No orders matching "<span className="text-gray-800 font-semibold">{searchQuery}</span>"
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left min-w-[700px]">
              <thead className="bg-gray-50/50 text-gray-600 border-b border-gray-100">
                <tr>
                  <th className="p-4 w-12 font-medium"></th>
                  <th className="p-4 font-semibold text-sm">User</th>
                  <th className="p-4 font-semibold text-sm">Package Assigned</th>
                  <th className="p-4 font-semibold text-sm">Requested Time</th>
                  <th className="p-4 font-semibold text-sm">Total Items</th>
                  <th className="p-4 font-semibold text-sm text-right">Batch</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-gray-700">
                {filteredAssignedUsers.map((u) => {
                  const orderKey = u.uniqueId || `${u.user.id}-${u.order_number || ''}`;
                  return (
                  <React.Fragment key={orderKey}>
                    <tr className="hover:bg-gray-50/50 transition-colors">
                      <td className="p-4 text-gray-400 cursor-pointer" onClick={() => toggleRow(orderKey)}>
                        {expandedId === orderKey ? '▼' : '▶'}
                      </td>
                      <td className="p-4 cursor-pointer" onClick={() => toggleRow(orderKey)}>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-semibold text-gray-900">{u.user.name}</span>
                          {u.order_number && (
                            <span className="text-[10px] bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded border border-blue-200 font-mono font-bold">
                              #{u.order_number}
                            </span>
                          )}
                          {u.order_type && (
                            <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${u.order_type === 'Subscription' ? 'bg-purple-50 text-purple-700' : 'bg-emerald-50 text-emerald-700'}`}>
                              {u.order_type}
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-gray-500 mt-0.5">{u.user.phone}</div>
                      </td>
                      <td className="p-4 cursor-pointer" onClick={() => toggleRow(orderKey)}>
                        <span className={`px-2.5 py-1 text-xs rounded-md font-medium ${u.hasPackage ? 'bg-purple-50 text-purple-600' : 'bg-gray-100 text-gray-600'}`}>
                          {u.hasPackage ? 'Yes' : 'No'}
                        </span>
                      </td>
                      <td className="p-4" onClick={(e) => e.stopPropagation()}>
                        {u.delivery_time_slot ? (
                          <div className="inline-flex items-center gap-1.5">
                            <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-800 border border-amber-200 px-2.5 py-1 rounded-lg text-xs font-bold shadow-sm">
                              ⏱ {u.delivery_time_slot}
                            </span>
                            <button
                              type="button"
                              onClick={() => openEditTimeModal(u)}
                              className="p-1 text-gray-400 hover:text-amber-700 hover:bg-amber-100 rounded-md transition-colors"
                              title="Change Requested Time"
                            >
                              <Edit2 size={12} />
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => openEditTimeModal(u)}
                            className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-medium hover:underline bg-blue-50/50 hover:bg-blue-100/50 px-2.5 py-1 rounded-lg border border-blue-200 transition-colors"
                          >
                            <Clock size={12} />
                            + Set Time
                          </button>
                        )}
                      </td>
                      <td className="p-4 cursor-pointer" onClick={() => toggleRow(orderKey)}>
                        <span className={`px-2.5 py-1 rounded-md text-xs font-medium ${u.totalItems.length > 0 ? 'bg-green-50 text-green-700 border border-green-200 font-semibold' : 'bg-gray-100 text-gray-500'}`}>
                          {u.totalItems.length} items
                        </span>
                      </td>
                      <td className="p-4 text-right">
                        <span className="text-fresh-700 font-medium bg-fresh-50 px-3 py-1.5 rounded-lg text-sm">
                          {u.batch_id ? batches.find(b => b.id === u.batch_id)?.name || 'Assigned' : 'Mixed Batches'}
                        </span>
                      </td>
                    </tr>

                    {expandedId === orderKey && (
                      <tr className="bg-gray-50/30">
                        <td colSpan="6" className="p-0 border-l-2 border-fresh-500">
                          <div className="p-6">
                            <div className="mb-6 space-y-6">
                              <h4 className="text-sm font-bold text-gray-700 flex items-center">
                                <span className="bg-fresh-100 text-fresh-600 p-1.5 rounded-lg mr-2">📍</span>
                                Deliveries by Address
                              </h4>

                              <div className="grid grid-cols-1 gap-6">
                                {u.addresses.map((addrGrp, idx) => (
                                  <div key={idx} className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm">
                                    <div className="flex flex-col sm:flex-row justify-between items-start mb-5 gap-3">
                                      <div className="pr-4">
                                        <div className="flex flex-wrap items-center gap-2 mb-1.5">
                                          <p className="text-gray-500 uppercase tracking-wide text-xs font-semibold">Delivery Address</p>
                                          {addrGrp.status === 'ready_for_delivery' && (
                                            <span className="bg-green-50 text-green-600 text-[10px] px-2 py-0.5 rounded-md font-medium">
                                              Ready for Delivery
                                            </span>
                                          )}
                                        </div>
                                        <p className="font-medium text-gray-900 text-sm">{addrGrp.address}</p>
                                      </div>
                                      <div className="text-right flex flex-col items-end gap-1">
                                        <p className="text-gray-500 uppercase tracking-wide text-[10px] font-semibold">Assigned Batch</p>
                                        <span className="text-fresh-700 font-medium bg-fresh-50 px-2.5 py-1 rounded-md text-sm">
                                          {addrGrp.batch_id ? batches.find(b => b.id === addrGrp.batch_id)?.name || 'Assigned' : 'Unassigned'}
                                        </span>
                                        {(addrGrp.delivery_time_slot || u.delivery_time_slot) && (
                                          <span className="text-amber-800 font-bold bg-amber-50 border border-amber-200 px-2 py-0.5 rounded text-xs">
                                            ⏱ {addrGrp.delivery_time_slot || u.delivery_time_slot}
                                          </span>
                                        )}
                                      </div>
                                    </div>

                                    {addrGrp.items.length > 0 ? (
                                      <div className="overflow-x-auto rounded-lg border border-gray-100">
                                        <table className="w-full text-sm text-left min-w-[500px]">
                                          <thead className="bg-gray-50 text-gray-600 text-xs">
                                            <tr>
                                              <th className="p-3 pl-4 w-10">Check</th>
                                              <th className="p-3">Item Name</th>
                                              <th className="p-3 text-purple-600">Package Qty</th>
                                              <th className="p-3 text-blue-600">Retail Qty</th>
                                              <th className="p-3 text-right">Total Needed</th>
                                              <th className="p-3 pl-4 w-32">Packed Qty</th>
                                            </tr>
                                          </thead>
                                          <tbody className="divide-y divide-gray-50">
                                            {addrGrp.items.map((item, i) => (
                                              <tr key={i} className={`hover:bg-gray-50 transition-colors text-gray-700 ${uncheckedItems[`${orderKey}-${idx}-${item.id}`] ? 'opacity-50 line-through' : ''}`}>
                                                <td className="p-3 pl-4">
                                                  <input
                                                    type="checkbox"
                                                    className="w-4 h-4 text-fresh-500 bg-gray-100 border-gray-300 rounded focus:ring-fresh-500 cursor-pointer"
                                                    checked={!uncheckedItems[`${orderKey}-${idx}-${item.id}`]}
                                                    onChange={(e) => handleCheckChange(orderKey, idx, item.id, e.target.checked)}
                                                  />
                                                </td>
                                                <td className="p-3 font-medium text-gray-900">
                                                  {item.name} {item.hindi_name ? <span className="text-gray-500 font-normal text-xs ml-1">({item.hindi_name})</span> : ""}
                                                </td>
                                                <td className="p-3 text-purple-600 font-medium">
                                                  {item.packageQty > 0 ? formatQuantity(item.packageQty, item.unit) : '-'}
                                                </td>
                                                <td className="p-3 text-blue-600 font-medium">
                                                  {item.retailQty > 0 ? formatQuantity(item.retailQty, item.unit) : '-'}
                                                </td>
                                                <td className="p-3 text-right font-bold text-gray-900">
                                                  {formatQuantity(item.totalQty, item.unit)}
                                                </td>
                                                <td className="p-3 pl-4 flex items-center gap-2">
                                                  <input
                                                    type="number"
                                                    className="input-field py-1 px-2 text-sm w-20 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:border-fresh-500"
                                                    value={packedQuantities[`${orderKey}-${idx}-${item.id}`] ?? (item.packedQty || 0)}
                                                    onChange={(e) => handlePackedQtyChange(orderKey, idx, item.id, e.target.value)}
                                                  />
                                                  <button
                                                    title="Auto-fill total required"
                                                    onClick={() => handlePackedQtyChange(orderKey, idx, item.id, item.totalQty)}
                                                    className="bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-md px-2 py-1 text-xs font-medium transition-colors border border-blue-100"
                                                  >
                                                    Fill
                                                  </button>
                                                </td>
                                              </tr>
                                            ))}
                                          </tbody>
                                        </table>
                                      </div>
                                    ) : (
                                      <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-4 text-center text-amber-800 text-xs sm:text-sm">
                                        <span className="font-semibold block mb-0.5">⏳ Production In Progress</span>
                                        <span>Worker has not completed all 5 states (weighing, soaking, cutting, drying, busket arrange) for products in this order yet.</span>
                                      </div>
                                    )}

                                    <div className="mt-5 flex justify-end">
                                      <button
                                        disabled={addrGrp.items.length === 0}
                                        onClick={() => handleMarkReady(orderKey, idx, addrGrp.items, addrGrp.scheduleIds, addrGrp.retailOrderIds)}
                                        className={`py-2 px-6 text-sm font-semibold rounded-xl transition-all ${
                                          addrGrp.items.length === 0
                                            ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                                            : "btn-primary"
                                        }`}
                                      >
                                        {addrGrp.status === 'ready_for_delivery' ? 'Update Ready for Delivery' : 'Mark Ready for Delivery'}
                                      </button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
      {/* Edit Requested Time Modal */}
      {editingOrderTime && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-gray-200 w-full max-w-md p-6 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100 mb-4">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-amber-50 text-amber-700 rounded-xl">
                  <Clock size={18} />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 text-base">Change Requested Time</h3>
                  <p className="text-xs text-gray-500">Order #{editingOrderTime.order_number} · {editingOrderTime.user?.name}</p>
                </div>
              </div>
              <button
                onClick={() => setEditingOrderTime(null)}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-lg"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-gray-700 uppercase tracking-wider block mb-2">Preset Time Slots</label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    "06:00 AM - 08:00 AM",
                    "07:00 AM - 09:00 AM",
                    "08:00 AM - 10:00 AM",
                    "10:00 AM - 12:00 PM",
                    "01:00 PM - 02:00 PM",
                    "03:00 PM - 05:00 PM",
                    "06:00 PM - 08:00 PM"
                  ].map((slot) => (
                    <button
                      key={slot}
                      type="button"
                      onClick={() => setNewTimeSlot(slot)}
                      className={`text-xs px-2.5 py-2 rounded-xl border font-medium text-left transition-all ${
                        newTimeSlot === slot
                          ? "bg-amber-50 text-amber-900 border-amber-400 font-bold shadow-xs"
                          : "bg-white text-gray-700 border-gray-200 hover:border-gray-300"
                      }`}
                    >
                      ⏱ {slot}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-700 uppercase tracking-wider block mb-1.5">Custom Slot / Value</label>
                <input
                  type="text"
                  placeholder="e.g. 02:00 PM - 04:00 PM or Morning"
                  value={newTimeSlot}
                  onChange={(e) => setNewTimeSlot(e.target.value)}
                  className="w-full bg-white border border-gray-200 rounded-xl px-3.5 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setNewTimeSlot("")}
                  className="px-3 py-2 text-xs text-gray-600 hover:bg-gray-100 rounded-xl font-medium"
                >
                  Clear Time
                </button>
                <div className="flex-1 flex gap-2 justify-end">
                  <button
                    type="button"
                    onClick={() => setEditingOrderTime(null)}
                    className="px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-xl"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={savingTime}
                    onClick={handleSaveTimeSlot}
                    className="px-5 py-2 text-xs font-bold text-white bg-green-600 hover:bg-green-500 active:bg-green-700 rounded-xl shadow-sm disabled:opacity-50"
                  >
                    {savingTime ? "Saving..." : "Save Time"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
