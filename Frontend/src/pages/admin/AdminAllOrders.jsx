/* eslint-disable react-hooks/exhaustive-deps, react-hooks/set-state-in-effect, no-unused-vars */
import React, { useState, useEffect } from 'react';
import api from '../../api/axios';
import useAuthStore from '../../store/authStore';

export default function AdminAllOrders() {
  const { user: currentUser } = useAuthStore();
  const [users, setUsers] = useState([]);
  const [batches, setBatches] = useState([]);
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

  const [expandedId, setExpandedId] = useState(null);
  const [packedQuantities, setPackedQuantities] = useState({});
  const [uncheckedItems, setUncheckedItems] = useState({}); // { `${userId}-${addrIdx}-${itemId}`: boolean }

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
  }, []);

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

  const toggleRow = (userId) => {
    setExpandedId(expandedId === userId ? null : userId);
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

  return (
    <div className="p-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-6 gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900">All Orders (Address-wise)</h2>
          <p className="text-gray-600 text-sm">Grouped orders by user and their specific addresses</p>
        </div>
        <div className="w-full sm:w-auto flex gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="input-field w-full sm:w-auto min-w-[150px]"
          >
            <option value="all">All Statuses</option>
            <option value="pending">Not Ready (Pending)</option>
            <option value="ready">Ready (Unassigned)</option>
          </select>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="input-field w-full sm:w-auto"
          />
        </div>
      </div>

      {loading ? (
        <div className="text-center text-gray-600 py-10">Loading users...</div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left min-w-[700px]">
              <thead className="bg-gray-100 text-gray-600">
                <tr>
                  <th className="p-4 w-12 font-medium"></th>
                  <th className="p-4 font-medium">User</th>
                  <th className="p-4 font-medium">Package Assigned</th>
                  <th className="p-4 font-medium">Total Items</th>
                  <th className="p-4 font-medium text-right">Assign All</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800 text-gray-700">
                {users.filter(u => {
                  if (statusFilter === 'all') return true;
                  // status is nested in addresses
                  if (statusFilter === 'pending') return u.addresses.some(a => a.status === 'pending');
                  if (statusFilter === 'ready') return u.addresses.some(a => a.status === 'ready' || a.status === 'ready_for_delivery');
                  return true;
                }).map((u) => (
                  <React.Fragment key={u.user.id}>
                    <tr className="hover:bg-white transition-colors">
                      <td className="p-4 text-gray-500 cursor-pointer" onClick={() => toggleRow(u.user.id)}>
                        {expandedId === u.user.id ? '▼' : '▶'}
                      </td>
                      <td className="p-4 cursor-pointer" onClick={() => toggleRow(u.user.id)}>
                        <div className="font-semibold text-gray-900">{u.user.name}</div>
                        <div className="text-xs text-gray-500">{u.user.phone}</div>
                      </td>
                      <td className="p-4 cursor-pointer" onClick={() => toggleRow(u.user.id)}>
                        <span className={`px-2 py-1 text-xs rounded-lg ${u.hasPackage ? 'bg-blue-500/20 text-blue-400' : 'bg-gray-500/20 text-gray-600'}`}>
                          {u.hasPackage ? 'Yes' : 'No'}
                        </span>
                      </td>
                      <td className="p-4 cursor-pointer" onClick={() => toggleRow(u.user.id)}>
                        <span className="bg-gray-100 px-2.5 py-1 rounded-full text-xs border border-gray-300">
                          {u.totalItems.length} items
                        </span>
                      </td>
                      <td className="p-4 text-right">
                        {currentUser?.role === 'admin' ? (
                          <select
                            value={u.batch_id || ''}
                            onChange={(e) => handleAssignBatch(u.allScheduleIds, u.allRetailOrderIds, e.target.value)}
                            className="input-field py-1.5 px-3 text-sm min-w-[150px] inline-block bg-gray-100"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <option value="">Unassigned</option>
                            {batches.map(b => (
                              <option key={b.id} value={b.id}>{b.name}</option>
                            ))}
                          </select>
                        ) : (
                          <span className="text-gray-600 text-sm">
                            {u.batch_id ? batches.find(b => b.id === u.batch_id)?.name || 'Assigned' : 'Unassigned'}
                          </span>
                        )}
                      </td>
                    </tr>

                    {expandedId === u.user.id && (
                      <tr className="bg-white/50">
                        <td colSpan="5" className="p-0 border-l-2 border-fresh-500">
                          <div className="p-6 bg-gray-100/30">

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
                                            <span className="bg-green-500/20 text-green-400 text-[10px] px-2 py-0.5 rounded-full border border-green-500/30">
                                              Ready for Delivery
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
                                      <div className="flex flex-col items-start sm:items-end w-full sm:w-auto">
                                        <p className="text-sm text-gray-600 uppercase tracking-wide text-xs mb-1">Assign Batch</p>
                                        {currentUser?.role === 'admin' ? (
                                          <select
                                            value={addrGrp.batch_id || ''}
                                            onChange={(e) => handleAssignBatch(addrGrp.scheduleIds, addrGrp.retailOrderIds, e.target.value)}
                                            className="input-field py-1.5 px-3 text-sm bg-white border-gray-600 min-w-[150px]"
                                          >
                                            <option value="">Unassigned</option>
                                            {batches.map(b => (
                                              <option key={b.id} value={b.id}>{b.name}</option>
                                            ))}
                                          </select>
                                        ) : (
                                          <span className="text-gray-600 text-sm py-1.5 px-3 bg-white border border-gray-600 rounded">
                                            {addrGrp.batch_id ? batches.find(b => b.id === addrGrp.batch_id)?.name || 'Assigned' : 'Unassigned'}
                                          </span>
                                        )}
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
                                      <button
                                        onClick={() => handleMarkReady(u.user.id, idx, addrGrp.items, addrGrp.scheduleIds, addrGrp.retailOrderIds)}
                                        className="btn-primary py-1.5 px-4 text-sm font-semibold"
                                      >
                                        {addrGrp.status === 'ready_for_delivery' ? 'Update Ready for Delivery' : 'Mark Ready for Delivery'}
                                      </button>
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
                ))}
                {users.length === 0 && (
                  <tr>
                    <td colSpan="5" className="p-6 text-center text-gray-500">No user orders found for this date.</td>
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
