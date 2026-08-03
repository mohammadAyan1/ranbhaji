/* eslint-disable react-hooks/exhaustive-deps, react-hooks/set-state-in-effect, no-unused-vars */
import React, { useState, useEffect } from 'react';
import api from '../../../api/axios';
import useAuthStore from '../../../store/authStore';

export default function ReadyForDeliver() {
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
  const [uncheckedItems, setUncheckedItems] = useState({});

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
      const itemsPayload = itemsList.map(item => {
        const isUnchecked = uncheckedItems[`${userId}-${addressIdx}-${item.id}`];
        const packedQty = packedQuantities[`${userId}-${addressIdx}-${item.id}`] ?? item.packedQty ?? 0;
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

  // Filter users to ONLY show those that have AT LEAST ONE address with a batch assigned
  const assignedUsers = users.filter(u => {
    return u.batch_id != null || u.addresses.some(a => a.batch_id != null);
  });

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-6 gap-4 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Ready For Delivery (Packaging)</h2>
          <p className="text-gray-500 text-sm">Verify and pack batch-assigned orders</p>
        </div>
        <div className="w-full sm:w-auto flex gap-3">
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
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left min-w-[700px]">
              <thead className="bg-gray-50/50 text-gray-600 border-b border-gray-100">
                <tr>
                  <th className="p-4 w-12 font-medium"></th>
                  <th className="p-4 font-semibold text-sm">User</th>
                  <th className="p-4 font-semibold text-sm">Package Assigned</th>
                  <th className="p-4 font-semibold text-sm">Total Items</th>
                  <th className="p-4 font-semibold text-sm text-right">Batch</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-gray-700">
                {assignedUsers.filter(u => {
                  if (statusFilter === 'all') return true;
                  if (statusFilter === 'pending') return u.addresses.some(a => a.status === 'pending');
                  if (statusFilter === 'ready') return u.addresses.some(a => a.status === 'ready' || a.status === 'ready_for_delivery');
                  return true;
                }).map((u) => (
                  <React.Fragment key={u.user.id}>
                    <tr className="hover:bg-gray-50/50 transition-colors">
                      <td className="p-4 text-gray-400 cursor-pointer" onClick={() => toggleRow(u.user.id)}>
                        {expandedId === u.user.id ? '▼' : '▶'}
                      </td>
                      <td className="p-4 cursor-pointer" onClick={() => toggleRow(u.user.id)}>
                        <div className="font-semibold text-gray-900">{u.user.name}</div>
                        <div className="text-xs text-gray-500">{u.user.phone}</div>
                      </td>
                      <td className="p-4 cursor-pointer" onClick={() => toggleRow(u.user.id)}>
                        <span className={`px-2.5 py-1 text-xs rounded-md font-medium ${u.hasPackage ? 'bg-purple-50 text-purple-600' : 'bg-gray-100 text-gray-600'}`}>
                          {u.hasPackage ? 'Yes' : 'No'}
                        </span>
                      </td>
                      <td className="p-4 cursor-pointer" onClick={() => toggleRow(u.user.id)}>
                        <span className="bg-gray-100 px-2.5 py-1 rounded-md text-xs font-medium text-gray-700">
                          {u.totalItems.length} items
                        </span>
                      </td>
                      <td className="p-4 text-right">
                        <span className="text-fresh-700 font-medium bg-fresh-50 px-3 py-1.5 rounded-lg text-sm">
                          {u.batch_id ? batches.find(b => b.id === u.batch_id)?.name || 'Assigned' : 'Mixed Batches'}
                        </span>
                      </td>
                    </tr>

                    {expandedId === u.user.id && (
                      <tr className="bg-gray-50/30">
                        <td colSpan="5" className="p-0 border-l-2 border-fresh-500">
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
                                      <div className="text-right">
                                        <p className="text-gray-500 uppercase tracking-wide text-[10px] font-semibold mb-1">Assigned Batch</p>
                                        <span className="text-fresh-700 font-medium bg-fresh-50 px-2.5 py-1 rounded-md text-sm">
                                          {addrGrp.batch_id ? batches.find(b => b.id === addrGrp.batch_id)?.name || 'Assigned' : 'Unassigned'}
                                        </span>
                                      </div>
                                    </div>

                                    {addrGrp.items.length > 0 && (
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
                                              <tr key={i} className={`hover:bg-gray-50 transition-colors text-gray-700 ${uncheckedItems[`${u.user.id}-${idx}-${item.id}`] ? 'opacity-50 line-through' : ''}`}>
                                                <td className="p-3 pl-4">
                                                  <input
                                                    type="checkbox"
                                                    className="w-4 h-4 text-fresh-500 bg-gray-100 border-gray-300 rounded focus:ring-fresh-500 cursor-pointer"
                                                    checked={!uncheckedItems[`${u.user.id}-${idx}-${item.id}`]}
                                                    onChange={(e) => handleCheckChange(u.user.id, idx, item.id, e.target.checked)}
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
                                                    value={packedQuantities[`${u.user.id}-${idx}-${item.id}`] ?? (item.packedQty || 0)}
                                                    onChange={(e) => handlePackedQtyChange(u.user.id, idx, item.id, e.target.value)}
                                                  />
                                                  <button
                                                    title="Auto-fill total required"
                                                    onClick={() => handlePackedQtyChange(u.user.id, idx, item.id, item.totalQty)}
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
                                    )}

                                    <div className="mt-5 flex justify-end">
                                      <button
                                        onClick={() => handleMarkReady(u.user.id, idx, addrGrp.items, addrGrp.scheduleIds, addrGrp.retailOrderIds)}
                                        className="btn-primary py-2 px-6 text-sm font-semibold"
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
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
