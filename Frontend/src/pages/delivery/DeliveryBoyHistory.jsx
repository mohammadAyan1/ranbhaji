import { useEffect, useState } from "react";
import api from "../../api/axios";

export default function DeliveryBoyHistory() {
  const [schedules, setSchedules] = useState([]);
  const [retailOrders, setRetailOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");

  // Filters
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [orderId, setOrderId] = useState("");
  const [allTime, setAllTime] = useState(false);

  // Return Modal State (Item)
  const [returningItem, setReturningItem] = useState(null);
  const [returnQty, setReturnQty] = useState("");
  const [returnPhoto, setReturnPhoto] = useState(null);
  const [returnRemark, setReturnRemark] = useState("");
  const [submittingReturn, setSubmittingReturn] = useState(false);

  // Return Modal State (Order)
  const [returningOrder, setReturningOrder] = useState(null);
  const [orderReturnPhoto, setOrderReturnPhoto] = useState(null);
  const [orderReturnRemark, setOrderReturnRemark] = useState("");

  const fetchHistory = () => {
    setLoading(true);
    let params = {};
    if (orderId) params.order_id = orderId;
    if (fromDate && toDate) {
        params.from_date = fromDate;
        params.to_date = toDate;
    }
    if (allTime) params.all_time = true;

    api.get("/boy-history", { params })
      .then(r => {
        setSchedules(r.data.schedules || []);
        setRetailOrders(r.data.retailOrders || []);
      })
      .catch(err => setMsg(`❌ Failed to fetch history: ${err.response?.data?.message || err.message}`))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchHistory();
  }, []); // Initial load

  const handleReturnItemSubmit = async (e) => {
    e.preventDefault();
    if (!returnPhoto) {
      setMsg("❌ Return proof photo is required.");
      return;
    }

    setSubmittingReturn(true);
    setMsg("");
    
    const formData = new FormData();
    formData.append("delivery_item_id", returningItem.id);
    formData.append("return_qty", returnQty);
    formData.append("photo", returnPhoto);
    if (returnRemark) formData.append("return_reason", returnRemark);

    try {
      await api.post("/boy-return-item", formData, {
        headers: { "Content-Type": "multipart/form-data" }
      });
      setMsg("✅ Item returned successfully.");
      setReturningItem(null);
      setReturnQty("");
      setReturnPhoto(null);
      setReturnRemark("");
      fetchHistory(); 
    } catch (err) {
      setMsg(`❌ ${err.response?.data?.message || "Return failed"}`);
    } finally {
      setSubmittingReturn(false);
    }
  };

  const handleReturnOrderSubmit = async (e) => {
    e.preventDefault();
    if (!orderReturnPhoto) {
      setMsg("❌ Return proof photo is required.");
      return;
    }

    setSubmittingReturn(true);
    setMsg("");
    
    const formData = new FormData();
    formData.append("schedule_id", returningOrder.id);
    formData.append("photo", orderReturnPhoto);
    if (orderReturnRemark) formData.append("return_reason", orderReturnRemark);

    try {
      await api.post("/boy-return-order", formData, {
        headers: { "Content-Type": "multipart/form-data" }
      });
      setMsg("✅ Full order returned successfully and pushed to next schedule.");
      setReturningOrder(null);
      setOrderReturnPhoto(null);
      setOrderReturnRemark("");
      fetchHistory(); 
    } catch (err) {
      setMsg(`❌ ${err.response?.data?.message || "Return failed"}`);
    } finally {
      setSubmittingReturn(false);
    }
  };

  const getStatusColor = (status) => {
    if (status === 'delivered') return 'text-green-600 bg-green-100 border-green-200';
    if (status === 'returned') return 'text-orange-600 bg-orange-100 border-orange-200';
    if (status === 'missed') return 'text-red-600 bg-red-100 border-red-200';
    return 'text-gray-600 bg-gray-100 border-gray-200';
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="page-header">My Delivery History 🚚</h1>
        <p className="page-sub">View and filter your delivered orders.</p>
      </div>

      <div className="card p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
            <div>
                <label className="label">Order ID</label>
                <input type="text" className="input" placeholder="e.g. 102" value={orderId} onChange={e => setOrderId(e.target.value)} />
            </div>
            <div>
                <label className="label">From Date</label>
                <input type="date" className="input" value={fromDate} onChange={e => setFromDate(e.target.value)} disabled={allTime || orderId} />
            </div>
            <div>
                <label className="label">To Date</label>
                <input type="date" className="input" value={toDate} onChange={e => setToDate(e.target.value)} disabled={allTime || orderId} />
            </div>
            <div className="flex gap-2">
                <button className="btn-primary flex-1" onClick={fetchHistory}>Filter</button>
                <button 
                    className={`btn flex-1 ${allTime ? 'bg-fresh-500 text-white' : 'bg-gray-100 text-gray-700'}`} 
                    onClick={() => {
                        setAllTime(!allTime);
                        setOrderId("");
                        setFromDate("");
                        setToDate("");
                    }}
                >
                    {allTime ? "All Time: ON" : "All Time"}
                </button>
            </div>
        </div>
      </div>

      {msg && (
        <div className={`rounded-xl px-4 py-3 text-sm font-medium ${msg.startsWith('✅') ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
          {msg}
        </div>
      )}

      {loading ? (
          <div className="flex items-center justify-center h-64 text-gray-600">Loading your delivery history...</div>
      ) : schedules.length === 0 && retailOrders.length === 0 ? (
        <div className="card text-center py-12">
          <p className="text-gray-500 mb-2 text-xl">No delivered orders found.</p>
          <p className="text-sm text-gray-400">Try adjusting your filters.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {schedules.map(schedule => {
            const user = schedule.Subscription?.User || {};
            const items = schedule.DeliveryItems || [];
            const hasUnreturnedItems = items.some(i => i.return_status === 'none');

            return (
              <div key={schedule.id} className="card p-5 border border-gray-200">
                <div className="flex justify-between items-start mb-4 border-b pb-4">
                  <div>
                    <h3 className="font-bold text-gray-900 text-lg">Order #{schedule.id} (Subscription)</h3>
                    <p className="text-sm text-gray-500">Delivered on: {schedule.actual_delivery_date}</p>
                    <p className="text-sm font-medium text-gray-700 mt-1">{user.name} • {user.phone}</p>
                  </div>
                  {hasUnreturnedItems && (
                      <button 
                          onClick={() => {
                              setReturningOrder(schedule);
                              setOrderReturnPhoto(null);
                              setOrderReturnRemark("");
                          }}
                          className="px-4 py-2 bg-red-50 text-red-600 font-medium text-sm rounded-lg border border-red-200 hover:bg-red-100 transition-colors"
                      >
                          Return Entire Order
                      </button>
                  )}
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {items.map(item => {
                        const product = item.Product || {};
                        const unit = product.unit || 'g';
                        const canReturn = item.return_status === 'none';

                        return (
                            <div key={item.id} className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                                <div className="flex justify-between items-start mb-2">
                                    <h4 className="font-bold text-gray-800">{product.name}</h4>
                                </div>
                                <p className="text-sm text-gray-600">Qty: {parseFloat(item.qty_gm).toFixed(1)}{unit}</p>
                                
                                {item.return_status !== 'none' && (
                                    <p className="text-orange-600 text-xs font-semibold mt-2">
                                        Return: <span className="uppercase">{item.return_status}</span> 
                                        {item.returned_by && ` (by ${item.returned_by})`}
                                    </p>
                                )}

                                {canReturn && (
                                    <button 
                                        onClick={() => {
                                            setReturningItem(item);
                                            setReturnQty(parseFloat(item.qty_gm));
                                            setReturnPhoto(null);
                                            setReturnRemark("");
                                        }}
                                        className="mt-3 w-full py-1.5 bg-orange-50 text-orange-600 font-medium text-xs rounded-lg border border-orange-200 hover:bg-orange-100 transition-colors"
                                    >
                                        Return Item
                                    </button>
                                )}
                            </div>
                        )
                    })}
                </div>
              </div>
            );
          })}

          {/* Retail Orders Map here if needed... */}
        </div>
      )}

      {/* Item Return Modal */}
      {returningItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden flex flex-col">
            <div className="p-4 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
              <h3 className="font-bold text-gray-900">Return Item: {returningItem.Product?.name}</h3>
              <button onClick={() => setReturningItem(null)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>
            
            <form onSubmit={handleReturnItemSubmit} className="p-4 space-y-4">
              <div>
                <label className="label text-xs">Delivered Quantity ({returningItem.Product?.unit || 'g'})</label>
                <input 
                  type="text" 
                  disabled 
                  value={parseFloat(returningItem.qty_gm).toFixed(1)} 
                  className="input bg-gray-50 text-gray-500 cursor-not-allowed" 
                />
              </div>
              
              <div>
                <label className="label text-xs">Return Quantity ({returningItem.Product?.unit || 'g'})</label>
                <input
                  type="number"
                  step="0.1"
                  max={parseFloat(returningItem.qty_gm)}
                  min="0.1"
                  required
                  className="input"
                  value={returnQty}
                  onChange={e => setReturnQty(e.target.value)}
                />
              </div>

              <div>
                <label className="label text-xs">Proof Photo (Required)</label>
                <input type="file" accept="image/*" required className="input p-1.5" onChange={e => setReturnPhoto(e.target.files[0])} />
              </div>

              <div>
                <label className="label text-xs">Remark / Reason (Optional)</label>
                <textarea className="input min-h-[80px]" value={returnRemark} onChange={e => setReturnRemark(e.target.value)}></textarea>
              </div>

              <div className="pt-2 flex gap-3">
                <button type="button" onClick={() => setReturningItem(null)} className="flex-1 py-2 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 font-medium transition-colors">Cancel</button>
                <button type="submit" disabled={submittingReturn} className="flex-1 py-2 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-medium">
                  {submittingReturn ? "Processing..." : "Process Return"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Full Order Return Modal */}
      {returningOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden flex flex-col">
            <div className="p-4 border-b border-gray-100 bg-red-50 flex justify-between items-center">
              <h3 className="font-bold text-red-900">Return Entire Order #{returningOrder.id}</h3>
              <button onClick={() => setReturningOrder(null)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>
            
            <form onSubmit={handleReturnOrderSubmit} className="p-4 space-y-4">
              <p className="text-sm text-gray-600">This will mark all items in this order as returned and schedule a new delivery.</p>

              <div>
                <label className="label text-xs">Proof Photo (Required)</label>
                <input type="file" accept="image/*" required className="input p-1.5" onChange={e => setOrderReturnPhoto(e.target.files[0])} />
              </div>

              <div>
                <label className="label text-xs">Remark / Reason (Optional)</label>
                <textarea className="input min-h-[80px]" value={orderReturnRemark} onChange={e => setOrderReturnRemark(e.target.value)}></textarea>
              </div>

              <div className="pt-2 flex gap-3">
                <button type="button" onClick={() => setReturningOrder(null)} className="flex-1 py-2 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 font-medium transition-colors">Cancel</button>
                <button type="submit" disabled={submittingReturn} className="flex-1 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-medium">
                  {submittingReturn ? "Processing..." : "Process Full Return"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
