import React, { useEffect, useState } from "react";
import api from "../../api/axios";

export default function AdminDeliveries() {
  const [deliveries, setDeliveries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPhoto, setSelectedPhoto] = useState(null); // for zoom view modal

  // Filters
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [orderId, setOrderId] = useState("");
  const [allTime, setAllTime] = useState(false);

  // Admin Return State
  const [msg, setMsg] = useState("");
  const [returningItem, setReturningItem] = useState(null);
  const [returnQty, setReturnQty] = useState("");
  const [returnRemark, setReturnRemark] = useState("");
  const [submittingReturn, setSubmittingReturn] = useState(false);

  // Return Modal State (Order)
  const [returningOrder, setReturningOrder] = useState(null);
  const [orderReturnRemark, setOrderReturnRemark] = useState("");

  // Accordion State
  const [expandedId, setExpandedId] = useState(null);

  const fetchDeliveries = () => {
    setLoading(true);
    let params = {};
    if (orderId) params.order_id = orderId;
    if (fromDate && toDate) {
      params.from_date = fromDate;
      params.to_date = toDate;
    }
    if (allTime) params.all_time = true;

    api.get("/admin/deliveries", { params })
      .then(r => setDeliveries(r.data.deliveries || []))
      .catch(err => setMsg(`❌ Failed to fetch deliveries: ${err.message}`))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchDeliveries();
  }, []);

  useEffect(() => {
    if (!selectedPhoto) return;
    const handleKeyDown = (e) => {
      if (e.key === "Escape") setSelectedPhoto(null);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedPhoto]);

  const handleAdminReturn = async (e) => {
    e.preventDefault();
    setSubmittingReturn(true);
    setMsg("");
    try {
      await api.post("/admin/return-item", {
        delivery_item_id: returningItem.id,
        return_qty: returnQty,
        return_reason: returnRemark
      });
      setMsg("✅ Return initiated successfully.");
      setReturningItem(null);
      setReturnQty("");
      setReturnRemark("");
      fetchDeliveries();
    } catch (err) {
      setMsg(`❌ ${err.response?.data?.message || "Return failed"}`);
    } finally {
      setSubmittingReturn(false);
    }
  };

  const handleReturnOrderSubmit = async (e) => {
    e.preventDefault();
    setSubmittingReturn(true);
    setMsg("");

    try {
      await api.post("/admin/return-order", {
        schedule_id: returningOrder.id,
        return_reason: orderReturnRemark
      });
      setMsg("✅ Full order returned successfully and pushed to next schedule.");
      setReturningOrder(null);
      setOrderReturnRemark("");
      fetchDeliveries();
    } catch (err) {
      setMsg(`❌ ${err.response?.data?.message || "Return failed"}`);
    } finally {
      setSubmittingReturn(false);
    }
  };

  if (loading) return <div className="flex items-center justify-center h-64 text-gray-600">Loading delivery logs...</div>;

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="page-header">Delivery Logs 🚚</h1>
        <p className="page-sub">View confirmation details for all completed deliveries</p>
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
            <button className="btn-primary flex-1" onClick={fetchDeliveries}>Filter</button>
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

      {/* Zoom Photo Modal */}
      {selectedPhoto && (
        <div
          onClick={() => setSelectedPhoto(null)}
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 cursor-pointer"
        >
          <div
            onClick={e => e.stopPropagation()}
            className="relative max-w-3xl max-h-[85vh] overflow-hidden rounded-2xl border border-gray-300 bg-gray-50 flex flex-col cursor-default"
          >
            <button
              onClick={() => setSelectedPhoto(null)}
              className="absolute top-4 right-4 bg-white/80 hover:bg-gray-100 text-gray-900 rounded-full w-10 h-10 flex items-center justify-center text-xl z-50 transition-all"
            >
              &times;
            </button>
            <img
              src={`${import.meta.env.VITE_API_URL}${selectedPhoto}`}
              alt="Delivery confirmation zoom"
              className="object-contain max-h-[75vh]"
            />
            <div className="p-4 bg-white text-center text-gray-600 text-sm border-t border-gray-850">
              Delivery Confirmation Photo
            </div>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="card">
        {deliveries.length === 0 ? (
          <p className="text-center text-gray-500 py-12">No completed deliveries found.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="table-header">
                  <th className="text-left p-3 rounded-tl-xl">Date & Time</th>
                  <th className="text-left p-3">Customer</th>
                  <th className="text-left p-3">Delivery Person</th>
                  <th className="text-left p-3">Package / Plan</th>
                  <th className="text-right p-3 rounded-tr-xl">Actions</th>
                </tr>
              </thead>
              <tbody>
                {deliveries.map(d => {
                  const customer = d.Subscription?.User || d.WaterSubscription?.User || {};
                  const packageName = d.Subscription?.Package?.name ||
                    (d.WaterSubscription ? `${d.WaterSubscription.water_type} Water (${d.WaterSubscription.container})` : "Water Plan");

                  const formattedDate = d.actual_delivery_date
                    ? new Date(d.actual_delivery_date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
                    : "No date";

                  const items = d.DeliveryItems || [];
                  const hasUnreturnedItems = items.some(i => i.return_status === 'none' && parseFloat(i.packed_qty ?? i.delivered_qty ?? i.qty_gm) > 0);

                  const isExpanded = expandedId === d.id;

                  return (
                    <React.Fragment key={d.id}>
                      <tr 
                        className="table-row cursor-pointer transition-colors hover:bg-gray-50"
                        onClick={() => setExpandedId(isExpanded ? null : d.id)}
                      >
                        <td className="p-3">
                          <span className="font-semibold text-gray-900">{formattedDate}</span>
                        </td>
                        <td className="p-3">
                          <p className="text-gray-900 font-medium">{customer.name}</p>
                          <p className="text-gray-500 text-xs">📞 {customer.phone}</p>
                        </td>
                        <td className="p-3">
                          {d.DeliveryBoy ? (
                            <>
                              <p className="text-gray-900 font-medium">{d.DeliveryBoy.name}</p>
                              <p className="text-gray-500 text-xs">📞 {d.DeliveryBoy.phone}</p>
                            </>
                          ) : (
                            <span className="text-gray-500 text-xs italic">Not assigned</span>
                          )}
                        </td>
                        <td className="p-3 text-gray-700 font-medium">
                          {packageName}
                        </td>
                        <td className="p-3 text-right text-gray-500" onClick={(e) => e.stopPropagation()}>
                          <div className="flex flex-col items-end gap-2">
                            <span>#{d.id}</span>
                            <div className="flex items-center gap-2">
                              {hasUnreturnedItems && (
                                <button
                                  onClick={() => {
                                    setReturningOrder(d);
                                    setOrderReturnRemark("");
                                  }}
                                  className="px-3 py-1.5 bg-red-50 text-red-600 font-medium text-xs rounded-lg border border-red-200 hover:bg-red-100 transition-colors"
                                >
                                  Return Order
                                </button>
                              )}
                              <button
                                onClick={() => setExpandedId(isExpanded ? null : d.id)}
                                className="p-1 text-gray-500 hover:text-fresh-600 transition-colors rounded-full hover:bg-fresh-50"
                              >
                                {isExpanded ? (
                                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                                  </svg>
                                ) : (
                                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                  </svg>
                                )}
                              </button>
                            </div>
                          </div>
                        </td>
                      </tr>

                      {isExpanded && (
                        <tr className="bg-gray-50/50 border-b border-gray-100">
                          <td colSpan="5" className="p-4">
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                              {/* Items List */}
                              <div className="lg:col-span-2">
                                <h4 className="text-sm font-semibold text-gray-900 mb-3 border-b pb-2">Delivered Items</h4>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                  {items.map((item, idx) => {
                                    const demanded = parseFloat(item.qty_gm) || 0;
                                    const delivered = parseFloat(item.packed_qty ?? item.delivered_qty ?? item.qty_gm) || 0;
                                    const isMissed = delivered === 0 && demanded > 0;
                                    const canReturn = !isMissed && delivered > 0 && item.return_status !== 'approved';

                                    return (
                                      <div key={idx} className={`text-[11px] px-3 py-2 rounded-lg border flex flex-col ${isMissed ? 'bg-red-900/20 border-red-800/50 text-red-300' : 'bg-gray-100/80 border-gray-300 text-gray-700'}`}>
                                        <span className="font-semibold text-gray-900 mb-1">
                                          {item.Product?.name} {item.Product?.hindi_name ? <span className="text-gray-500 font-normal">({item.Product.hindi_name})</span> : ""}
                                        </span>
                                        <div className="flex justify-between items-center mt-1">
                                          {isMissed ? (
                                            <>
                                              <span className="text-red-600 font-bold">Missed</span>
                                              <span className="opacity-70 text-[10px]">
                                                Demanded: {item.carried_over_qty ? `${(demanded - item.carried_over_qty).toFixed(0)} + ${parseFloat(item.carried_over_qty).toFixed(0)} (Carry)` : demanded.toFixed(0)}{item.Product?.unit || 'g'}
                                              </span>
                                            </>
                                          ) : (
                                            <>
                                              <span className="text-fresh-600 font-medium">Delivered: {delivered.toFixed(0)}{item.Product?.unit || 'g'}</span>
                                              <span className="text-gray-500 text-[10px]">
                                                Req: {item.carried_over_qty ? `${(demanded - item.carried_over_qty).toFixed(0)} + ${parseFloat(item.carried_over_qty).toFixed(0)} (Carry)` : demanded.toFixed(0)}{item.Product?.unit || 'g'}
                                              </span>
                                            </>
                                          )}
                                        </div>
                                        {item.return_status && item.return_status !== 'none' && (
                                          <p className="text-orange-600 text-xs font-semibold mt-2 bg-orange-100/50 px-2 py-1 rounded inline-block w-fit">
                                            Returned {item.return_qty ? `${parseFloat(item.return_qty).toFixed(0)}${item.Product?.unit || 'g'}` : ''} <span className="uppercase text-[10px]">({item.return_status})</span>
                                            {item.returned_by && <span className="text-[10px]"> by {item.returned_by.replace('_', ' ')}</span>}
                                          </p>
                                        )}
                                        {canReturn && (
                                          <button
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              setReturningItem(item);
                                              setReturnQty(delivered);
                                              setReturnRemark("");
                                            }}
                                            className="mt-2 text-[10px] w-fit text-orange-600 border border-orange-300 bg-orange-50 hover:bg-orange-100 py-1 px-3 rounded font-medium transition-colors"
                                          >
                                            Return Item
                                          </button>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>

                              {/* Photo & Remark */}
                              <div>
                                <h4 className="text-sm font-semibold text-gray-900 mb-3 border-b pb-2">Delivery Proof & Remarks</h4>
                                <div className="space-y-4">
                                  {d.delivery_remark && (
                                    <div>
                                      <span className="block text-xs font-medium text-gray-500 mb-1">Remarks:</span>
                                      <p className="text-gray-700 text-sm bg-gray-100/40 border border-gray-200/60 p-3 rounded-lg italic">
                                        "{d.delivery_remark}"
                                      </p>
                                    </div>
                                  )}
                                  
                                  <div>
                                    <span className="block text-xs font-medium text-gray-500 mb-1">Photo:</span>
                                    {d.delivery_photo_url ? (
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setSelectedPhoto(d.delivery_photo_url);
                                        }}
                                        className="group block relative w-full h-32 rounded-xl overflow-hidden border border-gray-200 hover:border-fresh-500 transition-all bg-gray-50"
                                      >
                                        <img
                                          src={`${import.meta.env.VITE_API_URL}${d.delivery_photo_url}`}
                                          alt="Delivery confirmation"
                                          className="w-full h-full object-cover group-hover:scale-105 transition-all"
                                        />
                                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-xs text-gray-900 font-medium transition-all">
                                          Zoom 🔍
                                        </div>
                                      </button>
                                    ) : (
                                      <div className="w-full h-20 border border-dashed border-gray-300 rounded-xl bg-gray-50 flex items-center justify-center">
                                        <span className="text-gray-500 text-sm italic">No photo attached</span>
                                      </div>
                                    )}
                                  </div>
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
        )}
      </div>

      {/* Admin Item Return Modal */}
      {returningItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden flex flex-col">
            <div className="p-4 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
              <h3 className="font-bold text-gray-900">Admin Return: {returningItem.Product?.name}</h3>
              <button onClick={() => setReturningItem(null)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>

            <form onSubmit={handleAdminReturn} className="p-4 space-y-4">
              <div>
                <label className="label text-xs">Return Quantity ({returningItem.Product?.unit || 'g'})</label>
                <input
                  type="number"
                  step="0.1"
                  min="0.1"
                  required
                  className="input"
                  value={returnQty}
                  onChange={e => setReturnQty(e.target.value)}
                />
              </div>

              <div>
                <label className="label text-xs">Remark / Reason (Required for Admin)</label>
                <textarea
                  required
                  className="input min-h-[80px]"
                  placeholder="e.g. Returned manually by Admin..."
                  value={returnRemark}
                  onChange={e => setReturnRemark(e.target.value)}
                ></textarea>
              </div>

              <div className="pt-2 flex gap-3">
                <button type="button" onClick={() => setReturningItem(null)} className="flex-1 py-2 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 font-medium transition-colors">
                  Cancel
                </button>
                <button type="submit" disabled={submittingReturn} className="flex-1 py-2 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-medium shadow-md shadow-orange-600/20 disabled:opacity-50 transition-all">
                  {submittingReturn ? "Processing..." : "Process Return"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Admin Order Return Modal */}
      {returningOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden flex flex-col">
            <div className="p-4 border-b border-gray-100 bg-red-50 flex justify-between items-center">
              <h3 className="font-bold text-red-900">Return Entire Order #{returningOrder.id}</h3>
              <button onClick={() => setReturningOrder(null)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>

            <form onSubmit={handleReturnOrderSubmit} className="p-4 space-y-4">
              <p className="text-sm text-gray-600">This will mark all unreturned items in this order as returned by Admin, and schedule a new delivery.</p>

              <div>
                <label className="label text-xs">Remark / Reason (Required for Admin)</label>
                <textarea
                  required
                  className="input min-h-[80px]"
                  placeholder="e.g. Full order returned due to customer complaint..."
                  value={orderReturnRemark}
                  onChange={e => setOrderReturnRemark(e.target.value)}
                ></textarea>
              </div>

              <div className="pt-2 flex gap-3">
                <button type="button" onClick={() => setReturningOrder(null)} className="flex-1 py-2 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 font-medium transition-colors">
                  Cancel
                </button>
                <button type="submit" disabled={submittingReturn} className="flex-1 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-medium shadow-md shadow-red-600/20 disabled:opacity-50 transition-all">
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
