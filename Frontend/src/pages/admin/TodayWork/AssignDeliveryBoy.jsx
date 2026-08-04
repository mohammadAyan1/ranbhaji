/* eslint-disable react-hooks/exhaustive-deps, react-hooks/set-state-in-effect, no-unused-vars */
import React, { useState, useEffect } from 'react';
import api from '../../../api/axios';
import useAuthStore from '../../../store/authStore';

export default function AssignDeliveryBoy() {
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

  const [expandedId, setExpandedId] = useState(null);

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

  const fetchDeliveryBoys = async () => {
    try {
      const res = await api.get('/admin/users');
      const boys = (res.data.users || []).filter(u => u.role === 'delivery');
      setDeliveryBoys(boys);
    } catch (err) {
      console.error('Failed to fetch delivery boys', err);
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
    fetchDeliveryBoys();
  }, []);

  useEffect(() => {
    fetchOrders();
  }, [date]);

  const handleAssignDeliveryBoy = async (scheduleIds, retailOrderIds, delivery_boy_id) => {
    try {
      await api.put('/admin/orders/assign-delivery-boy', { scheduleIds, retailOrderIds, delivery_boy_id: delivery_boy_id || null });
      alert('Delivery boy assigned successfully');
      fetchOrders();
    } catch (err) {
      alert('Failed to assign delivery boy');
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

  // Filter users to ONLY show those that have AT LEAST ONE address ready for delivery AND NOT assigned
  const readyUsers = users.map(u => ({
    ...u,
    addresses: u.addresses.filter(a => a.status === 'ready_for_delivery' && a.delivery_boy_id == null)
  })).filter(u => u.addresses.length > 0);

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-6 gap-4 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Assign Delivery Boy</h2>
          <p className="text-gray-500 text-sm">Assign delivery boys to ready orders</p>
        </div>
        <div className="w-full sm:w-auto flex gap-3">
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
      ) : readyUsers.length === 0 ? (
        <div className="bg-white p-8 text-center text-gray-500 font-medium rounded-2xl border border-gray-100">
          No unassigned ready orders found for this date.
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
                {readyUsers.map((u) => (
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
                                Ready Deliveries by Address
                              </h4>

                              <div className="grid grid-cols-1 gap-6">
                                {u.addresses.filter(a => a.status === 'ready_for_delivery').map((addrGrp, idx) => (
                                  <div key={idx} className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm">
                                    <div className="flex flex-col sm:flex-row justify-between items-start mb-5 gap-3">
                                      <div className="pr-4">
                                        <div className="flex flex-wrap items-center gap-2 mb-1.5">
                                          <p className="text-gray-500 uppercase tracking-wide text-xs font-semibold">Delivery Address</p>
                                          <span className="bg-green-50 text-green-600 text-[10px] px-2 py-0.5 rounded-md font-medium">
                                            Ready for Delivery
                                          </span>
                                        </div>
                                        <p className="font-medium text-gray-900 text-sm">{addrGrp.address}</p>
                                      </div>
                                      
                                      <div className="flex flex-col items-end gap-3">
                                        <div className="text-right">
                                          <p className="text-gray-500 uppercase tracking-wide text-[10px] font-semibold mb-1">Assigned Batch</p>
                                          <span className="text-fresh-700 font-medium bg-fresh-50 px-2.5 py-1 rounded-md text-sm">
                                            {addrGrp.batch_id ? batches.find(b => b.id === addrGrp.batch_id)?.name || 'Assigned' : 'Unassigned'}
                                          </span>
                                        </div>

                                        <div className="text-right">
                                          <p className="text-gray-500 uppercase tracking-wide text-[10px] font-semibold mb-1">Assign Delivery Boy</p>
                                          <select
                                            className="input-field py-1 text-sm bg-blue-50 border-blue-200 text-blue-900 rounded-lg outline-none focus:border-blue-500 min-w-[150px]"
                                            value={addrGrp.delivery_boy_id || ""}
                                            onChange={(e) => handleAssignDeliveryBoy(addrGrp.scheduleIds, addrGrp.retailOrderIds, e.target.value)}
                                          >
                                            <option value="">Unassigned</option>
                                            {deliveryBoys.map(boy => (
                                              <option key={boy.id} value={boy.id}>{boy.name}</option>
                                            ))}
                                          </select>
                                          <p className="text-[10px] text-gray-500 mt-1 text-right">
                                            {addrGrp.delivery_boy_id ? 'Assigned' : 'Select to assign'}
                                          </p>
                                        </div>
                                      </div>
                                    </div>

                                    {addrGrp.items.length > 0 && (
                                      <div className="overflow-x-auto rounded-lg border border-gray-100">
                                        <table className="w-full text-sm text-left min-w-[400px]">
                                          <thead className="bg-gray-50 text-gray-600 text-xs">
                                            <tr>
                                              <th className="p-3 pl-4">Item Name</th>
                                              <th className="p-3 text-purple-600">Package Qty</th>
                                              <th className="p-3 text-blue-600">Retail Qty</th>
                                              <th className="p-3 text-green-600 text-right pr-4">Packed Qty</th>
                                            </tr>
                                          </thead>
                                          <tbody className="divide-y divide-gray-50">
                                            {addrGrp.items.map((item, i) => (
                                              <tr key={i} className="hover:bg-gray-50 transition-colors text-gray-700">
                                                <td className="p-3 pl-4 font-medium text-gray-900">
                                                  {item.name} {item.hindi_name ? <span className="text-gray-500 font-normal text-xs ml-1">({item.hindi_name})</span> : ""}
                                                </td>
                                                <td className="p-3 text-purple-600 font-medium">
                                                  {item.packageQty > 0 ? formatQuantity(item.packageQty, item.unit) : '-'}
                                                </td>
                                                <td className="p-3 text-blue-600 font-medium">
                                                  {item.retailQty > 0 ? formatQuantity(item.retailQty, item.unit) : '-'}
                                                </td>
                                                <td className="p-3 text-right pr-4 font-bold text-green-600">
                                                  {formatQuantity(item.packedQty, item.unit)}
                                                </td>
                                              </tr>
                                            ))}
                                          </tbody>
                                        </table>
                                      </div>
                                    )}
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
