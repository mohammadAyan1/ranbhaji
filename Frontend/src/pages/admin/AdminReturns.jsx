import React, { useEffect, useState } from "react";
import api from "../../api/axios";

export default function AdminReturns() {
  const [returns, setReturns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");
  const [selectedPhoto, setSelectedPhoto] = useState(null); // zoom modal
  const [expandedId, setExpandedId] = useState(null);

  // Modal State for Review
  const [reviewModalData, setReviewModalData] = useState(null);
  const [isScheduled, setIsScheduled] = useState(true);
  const [isWaste, setIsWaste] = useState(false);

  const toggleRow = (id) => {
    setExpandedId(expandedId === id ? null : id);
  };

  // Filters
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [orderId, setOrderId] = useState("");
  const [allTime, setAllTime] = useState(false);

  const fetchReturns = async () => {
    setLoading(true);
    try {
      let params = {};
      if (orderId) params.order_id = orderId;
      if (fromDate && toDate) {
        params.from_date = fromDate;
        params.to_date = toDate;
      }
      if (allTime) params.all_time = true;

      const res = await api.get("/admin/returns", { params });

      // Group returns by order
      const grouped = {};
      (res.data.returns || []).forEach(r => {
        if (!r.is_full_return) return; // Only show FULL returns here
        const scheduleId = r.DeliverySchedule?.id || "unknown";
        if (!grouped[scheduleId]) {
          grouped[scheduleId] = {
            schedule: r.DeliverySchedule,
            items: []
          };
        }
        grouped[scheduleId].items.push(r);
      });

      const groupedArray = Object.values(grouped).sort((a, b) => {
        if (!a.schedule || !b.schedule) return 0;
        return new Date(b.schedule.actual_delivery_date) - new Date(a.schedule.actual_delivery_date) || b.schedule.id - a.schedule.id;
      });

      setReturns(groupedArray);
    } catch (err) {
      setMsg(`❌ Failed to fetch returns: ${err.response?.data?.message || err.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReturns();
  }, []);

  // Listen for Escape key to close the photo zoom modal
  useEffect(() => {
    if (!selectedPhoto) return;
    const handleKeyDown = (e) => {
      if (e.key === "Escape") setSelectedPhoto(null);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedPhoto]);

  const handleReview = async (id, status) => {
    if (status === 'rejected') {
      submitReview(id, 'rejected', false, false);
      return;
    }
    // If approved, open modal
    setReviewModalData({ id, status });
    setIsScheduled(true);
    setIsWaste(false);
  };

  const submitReview = async (id, status, scheduled, waste) => {
    setMsg("");
    try {
      await api.patch(`/return-item/${id}/review`, { 
        status, 
        is_scheduled_for_pickup: scheduled,
        is_waste: waste 
      });
      setMsg(`✅ Return request ${status} successfully.`);
      setReviewModalData(null);
      fetchReturns();
    } catch (err) {
      setMsg(`❌ ${err.response?.data?.message || "Action failed"}`);
    }
  };

  const getStatusBadge = (status) => {
    return {
      requested: <span className="bg-yellow-900/30 text-yellow-400 border border-yellow-800 text-xs px-2.5 py-1 rounded-full font-medium">Pending Review</span>,
      approved: <span className="bg-green-900/30 text-green-400 border border-green-800 text-xs px-2.5 py-1 rounded-full font-medium">Approved & Refunded</span>,
      rejected: <span className="bg-red-900/30 text-red-600 border border-red-800 text-xs px-2.5 py-1 rounded-full font-medium">Rejected</span>,
    }[status] || null;
  };

  if (loading) return <div className="flex items-center justify-center h-64 text-gray-600">Loading returns...</div>;

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="page-header">Returns Queue ↩️</h1>
        <p className="page-sub">Review and process customer product return and refund requests</p>
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
            <button className="btn-primary flex-1" onClick={fetchReturns}>Filter</button>
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
        <div className={`rounded-xl px-4 py-3 text-sm ${msg.startsWith("✅") ? "bg-fresh-100/30 text-fresh-600 border border-fresh-700/50" : "bg-red-900/30 text-red-600 border border-red-700/50"}`}>
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
              alt="Return verification zoom"
              className="object-contain max-h-[75vh]"
            />
            <div className="p-4 bg-white text-center text-gray-600 text-sm border-t border-gray-850">
              Return Proof Verification Photo
            </div>
          </div>
        </div>
      )}

      {/* Returns List */}
      {returns.length === 0 ? (
        <div className="card text-center py-16 text-gray-500">
          <p className="text-5xl mb-4">🎉</p>
          <p className="text-lg font-medium text-gray-900">All caught up!</p>
          <p>No return requests are in the queue.</p>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left min-w-[700px]">
              <thead className="bg-gray-50/50 text-gray-600 border-b border-gray-100">
                <tr>
                  <th className="p-4 w-12 font-medium"></th>
                  <th className="p-4 font-semibold text-sm">Order ID</th>
                  <th className="p-4 font-semibold text-sm">Customer</th>
                  <th className="p-4 font-semibold text-sm text-right">Items Returned</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-gray-700">
                {returns.map(group => {
                  const schedule = group.schedule || {};
                  const customer = schedule.Subscription?.User || schedule.WaterSubscription?.User || {};
                  const orderSource = schedule.Subscription
                    ? `Package: ${schedule.Subscription.Package?.name}`
                    : `Water Subscription`;
                  const formattedDate = schedule.actual_delivery_date
                    ? new Date(schedule.actual_delivery_date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
                    : "Unknown Date";
                  const scheduleId = schedule.id || Math.random();
                  const isExpanded = expandedId === scheduleId;

                  return (
                    <React.Fragment key={scheduleId}>
                      <tr className="hover:bg-gray-50/50 transition-colors cursor-pointer" onClick={() => toggleRow(scheduleId)}>
                        <td className="p-4 text-gray-400">
                          {isExpanded ? '▼' : '▶'}
                        </td>
                        <td className="p-4">
                          <div className="font-bold text-gray-900 text-base">Order #{schedule.id}</div>
                          <div className="text-xs text-gray-500 font-medium">Delivered: {formattedDate}</div>
                        </td>
                        <td className="p-4">
                          <div className="font-medium text-gray-900">{customer.name}</div>
                          <div className="text-xs text-gray-500">{customer.phone}</div>
                        </td>
                        <td className="p-4 text-right">
                          <span className="bg-red-50 text-red-600 px-3 py-1 rounded-full text-xs font-bold border border-red-100">
                            {group.items.length} items
                          </span>
                        </td>
                      </tr>

                      {isExpanded && (
                        <tr className="bg-gray-50/30">
                          <td colSpan="4" className="p-0 border-l-2 border-red-500">
                            <div className="p-6">
                              <h4 className="text-sm font-bold text-gray-700 flex items-center mb-4">
                                <span className="bg-red-100 text-red-600 p-1.5 rounded-lg mr-2">📦</span>
                                Full Order Return ({orderSource})
                              </h4>
                              <div className="overflow-x-auto rounded-lg border border-gray-100">
                                <table className="w-full text-sm mt-2 bg-white">
                                  <thead>
                                    <tr className="bg-gray-50/50 text-gray-600 text-xs border-b border-gray-100">
                                      <th className="text-left p-3 pl-4">Product</th>
                                      <th className="text-left p-3">Return Reason</th>
                                      <th className="text-left p-3">Proof Photo</th>
                                      <th className="text-left p-3">Status</th>
                                      <th className="text-right p-3 pr-4">Actions</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-gray-50">
                                    {group.items.map(r => (
                                      <tr key={r.id} className="hover:bg-gray-50 transition-colors text-gray-700">
                                        <td className="p-3 pl-4">
                                          <p className="text-gray-900 font-bold">{r.Product?.name}</p>
                                          <p className="text-gray-600 text-xs mt-0.5">
                                            Return: <span className="text-red-500 font-bold">{parseFloat(r.return_qty).toFixed(0)}{r.Product?.unit || 'g'}</span>
                                          </p>
                                          <p className="text-gray-500 text-[10px]">Delivered: {parseFloat(r.qty_gm).toFixed(0)}{r.Product?.unit || 'g'}</p>
                                          {r.next_schedule_date && (
                                            <p className="mt-1 text-xs text-fresh-600 font-medium">
                                              Next Delivery: {new Date(r.next_schedule_date).toLocaleDateString("en-IN", { day: 'numeric', month: 'short' })}
                                            </p>
                                          )}
                                        </td>
                                        <td className="p-3 text-gray-700 italic max-w-[200px] break-words text-xs">
                                          "{r.return_reason || "No reason specified"}"
                                        </td>
                                        <td className="p-3">
                                          {r.return_photo_url ? (
                                            <button
                                              onClick={() => setSelectedPhoto(r.return_photo_url)}
                                              className="group block relative w-16 h-12 rounded-lg overflow-hidden border border-gray-200 hover:border-fresh-500 transition-all bg-gray-100"
                                            >
                                              <img
                                                src={`${import.meta.env.VITE_API_URL}${r.return_photo_url}`}
                                                alt="Return confirmation proof"
                                                className="w-full h-full object-cover group-hover:scale-105 transition-all"
                                              />
                                              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-[10px] text-white font-medium transition-all">
                                                Zoom
                                              </div>
                                            </button>
                                          ) : (
                                            <span className="text-gray-400 text-xs italic">No photo</span>
                                          )}
                                        </td>
                                        <td className="p-3">
                                          {getStatusBadge(r.return_status)}
                                          {r.returned_by && (
                                            <div className="mt-1.5 text-[9px] text-gray-400 font-bold uppercase tracking-wider">
                                              By: {r.returned_by.replace('_', ' ')}
                                            </div>
                                          )}
                                        </td>
                                        <td className="p-3 text-right pr-4">
                                          {r.return_status === "requested" ? (
                                            <div className="flex justify-end gap-2">
                                              <button
                                                onClick={() => handleReview(r.id, "approved")}
                                                className="bg-green-50 text-green-700 hover:bg-green-100 hover:text-green-800 text-xs font-bold py-1.5 px-3 rounded-lg border border-green-200 transition-all"
                                              >
                                                Approve
                                              </button>
                                              <button
                                                onClick={() => handleReview(r.id, "rejected")}
                                                className="bg-red-50 text-red-700 hover:bg-red-100 hover:text-red-800 text-xs font-bold py-1.5 px-3 rounded-lg border border-red-200 transition-all"
                                              >
                                                Reject
                                              </button>
                                            </div>
                                          ) : (
                                            <span className="text-gray-400 text-xs italic">-</span>
                                          )}
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
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

      {/* Review Modal */}
      {reviewModalData && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl border border-gray-200">
            <h3 className="font-bold text-xl text-gray-900 mb-2">Accept Return</h3>
            <p className="text-sm text-gray-500 mb-6">Please configure how this return should be handled.</p>

            <div className="space-y-4">
              <label className="flex items-start gap-3 p-3 border border-gray-200 rounded-xl cursor-pointer hover:bg-gray-50 transition-colors">
                <input
                  type="checkbox"
                  checked={isScheduled}
                  onChange={(e) => setIsScheduled(e.target.checked)}
                  className="mt-1 w-4 h-4 text-fresh-600 rounded focus:ring-fresh-500 border-gray-300"
                />
                <div>
                  <span className="block font-semibold text-gray-800 text-sm">Schedule for delivery boy pickup?</span>
                  <span className="block text-xs text-gray-500 mt-1">If unchecked, it will be added to your inventory immediately (meaning you already have it physically).</span>
                </div>
              </label>

              {isScheduled && (
                <label className="flex items-start gap-3 p-3 border border-gray-200 rounded-xl cursor-pointer hover:bg-gray-50 transition-colors">
                  <input
                    type="checkbox"
                    checked={isWaste}
                    onChange={(e) => setIsWaste(e.target.checked)}
                    className="mt-1 w-4 h-4 text-red-600 rounded focus:ring-red-500 border-gray-300"
                  />
                  <div>
                    <span className="block font-semibold text-gray-800 text-sm">Is this returned product considered WASTE?</span>
                    <span className="block text-xs text-gray-500 mt-1">If checked, it will be logged as waste and not added to your inventory when returned.</span>
                  </div>
                </label>
              )}
            </div>

            <div className="flex justify-end gap-3 mt-8 pt-4 border-t border-gray-100">
              <button
                onClick={() => setReviewModalData(null)}
                className="px-4 py-2 text-sm font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => submitReview(reviewModalData.id, reviewModalData.status, isScheduled, isScheduled ? isWaste : false)}
                className="px-4 py-2 text-sm font-semibold text-white bg-fresh-600 hover:bg-fresh-700 rounded-lg shadow-sm transition-all active:scale-95"
              >
                Confirm & Accept
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
