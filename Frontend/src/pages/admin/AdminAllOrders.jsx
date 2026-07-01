/* eslint-disable react-hooks/exhaustive-deps, react-hooks/set-state-in-effect, no-unused-vars */
import React, { useState, useEffect } from 'react';
import api from '../../api/axios';

export default function AdminAllOrders() {
  const [users, setUsers] = useState([]);
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [date, setDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });
  const [expandedId, setExpandedId] = useState(null);
  const [packedQuantities, setPackedQuantities] = useState({});

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

  const handleMarkReady = async (scheduleIds, retailOrderIds) => {
    try {
      await api.put('/admin/orders/pack', { scheduleIds, retailOrderIds, items: [] });
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
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-white">All Orders (Address-wise)</h2>
          <p className="text-gray-400 text-sm">Grouped orders by user and their specific addresses</p>
        </div>
        <div>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="input-field"
          />
        </div>
      </div>

      {loading ? (
        <div className="text-center text-gray-400 py-10">Loading users...</div>
      ) : (
        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-gray-800 text-gray-400">
              <tr>
                <th className="p-4 w-12 font-medium"></th>
                <th className="p-4 font-medium">User</th>
                <th className="p-4 font-medium">Package Assigned</th>
                <th className="p-4 font-medium">Total Items</th>
                <th className="p-4 font-medium text-right">Assign All</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800 text-gray-300">
              {users.map((u) => (
                <React.Fragment key={u.user.id}>
                  <tr className="hover:bg-gray-800/50 transition-colors">
                    <td className="p-4 text-gray-500 cursor-pointer" onClick={() => toggleRow(u.user.id)}>
                      {expandedId === u.user.id ? '▼' : '▶'}
                    </td>
                    <td className="p-4 cursor-pointer" onClick={() => toggleRow(u.user.id)}>
                      <div className="font-semibold text-white">{u.user.name}</div>
                      <div className="text-xs text-gray-500">{u.user.phone}</div>
                    </td>
                    <td className="p-4 cursor-pointer" onClick={() => toggleRow(u.user.id)}>
                      <span className={`px-2 py-1 text-xs rounded-lg ${u.hasPackage ? 'bg-blue-500/20 text-blue-400' : 'bg-gray-500/20 text-gray-400'}`}>
                        {u.hasPackage ? 'Yes' : 'No'}
                      </span>
                    </td>
                    <td className="p-4 cursor-pointer" onClick={() => toggleRow(u.user.id)}>
                      <span className="bg-gray-800 px-2.5 py-1 rounded-full text-xs border border-gray-700">
                        {u.totalItems.length} items
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <select
                        value={u.batch_id || ''}
                        onChange={(e) => handleAssignBatch(u.allScheduleIds, u.allRetailOrderIds, e.target.value)}
                        className="input-field py-1.5 px-3 text-sm min-w-[150px] inline-block bg-gray-800"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <option value="">Unassigned</option>
                        {batches.map(b => (
                          <option key={b.id} value={b.id}>{b.name}</option>
                        ))}
                      </select>
                    </td>
                  </tr>

                  {expandedId === u.user.id && (
                    <tr className="bg-gray-900/50">
                      <td colSpan="5" className="p-0 border-l-2 border-fresh-500">
                        <div className="p-6 bg-gray-800/30">
                          
                          {/* Address-wise breakdown */}
                          <div className="mb-6 space-y-4">
                            <h4 className="text-sm font-bold text-gray-300 uppercase tracking-wider flex items-center">
                              <span className="bg-fresh-500/20 text-fresh-400 p-1.5 rounded mr-2">📍</span>
                              Deliveries by Address
                            </h4>
                            
                            <div className="grid grid-cols-1 gap-4">
                              {u.addresses.map((addrGrp, idx) => (
                                <div key={idx} className="bg-gray-800 rounded-lg p-4 border border-gray-700">
                                  <div className="flex justify-between items-start mb-4">
                                    <div className="pr-4">
                                      <p className="text-sm text-gray-400 uppercase tracking-wide text-xs mb-1">Delivery Address</p>
                                      <p className="font-medium text-white">{addrGrp.address}</p>
                                    </div>
                                    <div className="flex flex-col items-end">
                                      <p className="text-sm text-gray-400 uppercase tracking-wide text-xs mb-1">Assign Batch</p>
                                      <select
                                        value={addrGrp.batch_id || ''}
                                        onChange={(e) => handleAssignBatch(addrGrp.scheduleIds, addrGrp.retailOrderIds, e.target.value)}
                                        className="input-field py-1.5 px-3 text-sm bg-gray-900 border-gray-600 min-w-[150px]"
                                      >
                                        <option value="">Unassigned</option>
                                        {batches.map(b => (
                                          <option key={b.id} value={b.id}>{b.name}</option>
                                        ))}
                                      </select>
                                    </div>
                                  </div>
                                  
                                  {addrGrp.items.length > 0 && (
                                    <div className="overflow-x-auto rounded border border-gray-700/50">
                                      <table className="w-full text-sm text-left">
                                        <thead className="bg-gray-900/50 text-gray-400 text-xs">
                                          <tr>
                                            <th className="p-2 pl-4">Item Name</th>
                                            <th className="p-2 text-blue-400">Package Qty</th>
                                            <th className="p-2 text-purple-400">Retail Qty</th>
                                            <th className="p-2 text-right">Total</th>
                                            <th className="p-2 pl-4 w-24">Packed Qty</th>
                                          </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-700/50">
                                          {addrGrp.items.map((item, i) => (
                                            <tr key={i} className="hover:bg-gray-700/20 text-gray-300">
                                              <td className="p-2 pl-4 font-medium">{item.name}</td>
                                              <td className="p-2 text-blue-300">
                                                {item.packageQty > 0 ? formatQuantity(item.packageQty, item.unit) : '-'}
                                              </td>
                                              <td className="p-2 text-purple-300">
                                                {item.retailQty > 0 ? formatQuantity(item.retailQty, item.unit) : '-'}
                                              </td>
                                              <td className="p-2 text-right font-medium">
                                                {formatQuantity(item.totalQty, item.unit)}
                                              </td>
                                              <td className="p-2 pl-4">
                                                <input 
                                                  type="number" 
                                                  className="input-field py-1 px-2 text-xs w-20"
                                                  value={packedQuantities[`${u.user.id}-${idx}-${item.id}`] ?? item.totalQty}
                                                  onChange={(e) => handlePackedQtyChange(u.user.id, idx, item.id, e.target.value)}
                                                />
                                              </td>
                                            </tr>
                                          ))}
                                        </tbody>
                                      </table>
                                    </div>
                                  )}

                                  <div className="mt-4 flex justify-end">
                                    <button 
                                      onClick={() => handleMarkReady(addrGrp.scheduleIds, addrGrp.retailOrderIds)}
                                      className="btn-primary py-1.5 px-4 text-sm font-semibold"
                                    >
                                      Mark Ready for Delivery
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Overall Total Breakdown */}
                          <div className="mt-8 border-t border-gray-700 pt-6">
                            <h4 className="text-sm font-bold text-gray-400 mb-3 uppercase tracking-wider">Overall Total for User</h4>
                            {u.totalItems.length > 0 ? (
                              <div className="overflow-hidden rounded-lg border border-gray-700/50">
                                <table className="w-full text-sm text-left opacity-75">
                                  <thead className="bg-gray-900 text-gray-500">
                                    <tr>
                                      <th className="p-2 pl-4">Item Name</th>
                                      <th className="p-2 text-right">Total Qty (All Addresses)</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-gray-800">
                                    {u.totalItems.map((item, idx) => (
                                      <tr key={idx} className="hover:bg-gray-800/50 text-gray-400">
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
      )}
    </div>
  );
}
