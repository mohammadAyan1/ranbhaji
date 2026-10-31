import { useEffect, useState } from "react";
import api from "../../../api/axios";
import { Search, X, Filter, AlertCircle, CheckCircle, Package, User } from "lucide-react";

export default function BatchAssign() {
  const [orders, setOrders] = useState([]);
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");
  
  // Filters
  const [selectedBatchFilter, setSelectedBatchFilter] = useState("all");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  
  // Selection
  const [selectedOrders, setSelectedOrders] = useState([]);
  const [assignBatchId, setAssignBatchId] = useState("");

  const fetchOrders = () => {
    setLoading(true);
    let url = `/today-work/orders-for-batch?batch_id=${selectedBatchFilter}`;
    if (fromDate) url += `&fromDate=${fromDate}`;
    if (toDate) url += `&toDate=${toDate}`;
    
    api.get(url)
      .then(res => {
        setOrders(res.data.orders || []);
        setBatches(res.data.batches || []);
        setSelectedOrders([]); // reset selection
      })
      .catch(err => {
        setMsg(`❌ Failed to load orders: ${err.message}`);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchOrders();
  }, [selectedBatchFilter, fromDate, toDate]);

  const filteredOrders = orders.filter(o => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    const userName = (o.user?.name || "").toLowerCase();
    const userPhone = (o.user?.phone || "").toLowerCase();
    const desc = (o.description || "").toLowerCase(); // Contains Package name or items
    const batchName = (o.batch?.name || (o.batch_id ? "" : "unassigned")).toLowerCase();
    const orderId = String(o.order_id || "");
    const orderType = (o.type || "").toLowerCase();
    const timeSlot = (o.delivery_time_slot || "").toLowerCase();

    return (
      userName.includes(q) ||
      userPhone.includes(q) ||
      desc.includes(q) ||
      batchName.includes(q) ||
      orderId.includes(q) ||
      orderType.includes(q) ||
      timeSlot.includes(q)
    );
  });

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedOrders(filteredOrders.map(o => ({ type: o.type, id: o.order_id })));
    } else {
      setSelectedOrders([]);
    }
  };

  const handleSelectOrder = (order, checked) => {
    if (checked) {
      setSelectedOrders(prev => [...prev, { type: order.type, id: order.order_id }]);
    } else {
      setSelectedOrders(prev => prev.filter(o => !(o.type === order.type && o.id === order.order_id)));
    }
  };

  const handleAssignBatch = async () => {
    if (selectedOrders.length === 0) {
      setMsg("⚠️ Please select at least one order.");
      return;
    }
    if (!assignBatchId) {
      setMsg("⚠️ Please select a batch to assign to.");
      return;
    }

    try {
      setMsg("");
      await api.post("/today-work/assign-batch", {
        batch_id: assignBatchId,
        orders: selectedOrders
      });
      setMsg("✅ Batches assigned successfully!");
      fetchOrders();
    } catch (err) {
      setMsg(`❌ Failed to assign batch: ${err.message}`);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Batch Assign</h1>
          <p className="text-gray-500 text-sm mt-1">Assign today's retail orders and subscriptions to processing batches.</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          {/* Live Search Bar */}
          <div className="relative min-w-[220px] max-w-xs">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search user, package, batch..."
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

          <div className="flex items-center gap-2">
            <input 
              type="date" 
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="input-field py-2 px-3 text-sm w-36" 
            />
            <span className="text-gray-400 font-medium">to</span>
            <input 
              type="date" 
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="input-field py-2 px-3 text-sm w-36" 
            />
          </div>
          <div className="flex items-center gap-2 bg-gray-50 px-3 py-2 rounded-xl border border-gray-200">
            <Filter size={16} className="text-gray-400" />
            <select 
              value={selectedBatchFilter}
              onChange={(e) => setSelectedBatchFilter(e.target.value)}
              className="bg-transparent border-none text-sm font-medium focus:ring-0 text-gray-700 p-0"
            >
              <option value="all">All Orders</option>
              <option value="unassigned">Unassigned Only</option>
              {batches.map(b => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {msg && (
        <div className={`p-4 rounded-xl text-sm font-medium border flex items-center gap-2 ${msg.startsWith("✅") ? "bg-green-50 text-green-700 border-green-200" : "bg-red-50 text-red-700 border-red-200"}`}>
          {msg.startsWith("✅") ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
          {msg}
        </div>
      )}

      {/* Bulk Action Bar */}
      {selectedOrders.length > 0 && (
        <div className="bg-blue-50 border border-blue-100 p-4 rounded-2xl flex items-center justify-between animate-fade-in">
          <div className="text-blue-800 font-semibold text-sm">
            {selectedOrders.length} order(s) selected
          </div>
          <div className="flex items-center gap-3">
            <select
              value={assignBatchId}
              onChange={e => setAssignBatchId(e.target.value)}
              className="input-field py-2 text-sm w-48"
            >
              <option value="" disabled>Select Batch to Assign</option>
              <option value="unassigned">Remove Batch (Unassign)</option>
              {batches.map(b => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
            <button 
              onClick={handleAssignBatch}
              className="btn-primary py-2 px-6 shadow-blue-500/20"
            >
              Apply Batch
            </button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-gray-400 font-medium">Loading orders...</div>
        ) : orders.length === 0 ? (
          <div className="p-12 text-center text-gray-400 font-medium">No orders found for this filter.</div>
        ) : filteredOrders.length === 0 ? (
          <div className="p-12 text-center text-gray-500 font-medium">
            No orders matching "<span className="text-gray-800 font-semibold">{searchQuery}</span>"
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50/80 border-b border-gray-100 text-sm font-semibold text-gray-600">
                  <th className="px-6 py-4 w-10">
                    <input 
                      type="checkbox" 
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                      onChange={handleSelectAll}
                      checked={filteredOrders.length > 0 && filteredOrders.every(o => selectedOrders.some(sel => sel.type === o.type && sel.id === o.order_id))}
                    />
                  </th>
                  <th className="px-6 py-4">Order Details</th>
                  <th className="px-6 py-4">Customer</th>
                  <th className="px-6 py-4">Current Batch</th>
                  <th className="px-6 py-4">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredOrders.map((o) => {
                  const isSelected = selectedOrders.some(sel => sel.type === o.type && sel.id === o.order_id);
                  return (
                    <tr key={o.id} className={`hover:bg-gray-50/50 transition-colors ${isSelected ? "bg-blue-50/30" : ""}`}>
                      <td className="px-6 py-4">
                        <input 
                          type="checkbox" 
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                          checked={isSelected}
                          onChange={(e) => handleSelectOrder(o, e.target.checked)}
                        />
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-lg ${
                            o.type === 'retail'
                              ? 'bg-green-100 text-green-600'
                              : o.type === 'water'
                              ? 'bg-purple-100 text-purple-600'
                              : 'bg-orange-100 text-orange-600'
                          }`}>
                            <Package size={18} />
                          </div>
                          <div>
                            <p className="font-semibold text-gray-900 text-sm capitalize">{o.type} #{o.order_id}</p>
                            <p className="text-xs text-gray-500">{o.description}</p>
                            {o.delivery_time_slot && (
                              <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-800 border border-amber-200 px-2 py-0.5 rounded text-[11px] font-bold mt-1">
                                ⏱ Requested: {o.delivery_time_slot}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center">
                            <User size={12} className="text-gray-500" />
                          </div>
                          <div>
                            <span className="text-sm font-medium text-gray-700 block">{o.user?.name || "Unknown"}</span>
                            {o.user?.phone && <span className="text-xs text-gray-400 block">{o.user.phone}</span>}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {o.batch ? (
                          <span className="px-3 py-1 bg-green-50 text-green-700 rounded-md text-xs font-bold border border-green-200 inline-block">
                            {o.batch.name}
                          </span>
                        ) : (
                          <span className="px-3 py-1 bg-gray-100 text-gray-500 rounded-md text-xs font-semibold inline-block">
                            Unassigned
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {new Date(o.date).toLocaleDateString()}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
