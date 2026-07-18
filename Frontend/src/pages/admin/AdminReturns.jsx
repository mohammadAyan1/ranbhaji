import { useEffect, useState } from "react";
import api from "../../api/axios";

export default function AdminReturns() {
  const [returns, setReturns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");
  const [selectedPhoto, setSelectedPhoto] = useState(null); // zoom modal

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
          const scheduleId = r.DeliverySchedule?.id || "unknown";
          if (!grouped[scheduleId]) {
              grouped[scheduleId] = {
                  schedule: r.DeliverySchedule,
                  items: []
              };
          }
          grouped[scheduleId].items.push(r);
      });
      
      const groupedArray = Object.values(grouped).sort((a,b) => {
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
    setMsg("");
    try {
      await api.patch(`/return-item/${id}/review`, { status });
      setMsg(`✅ Return request ${status} successfully.`);
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
              src={`http://localhost:3000${selectedPhoto}`}
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
        <div className="space-y-6">
          {returns.map(group => {
            const schedule = group.schedule || {};
            const customer = schedule.Subscription?.User || schedule.WaterSubscription?.User || {};
            const orderSource = schedule.Subscription 
              ? `Package: ${schedule.Subscription.Package?.name}`
              : `Water Subscription`;
            const formattedDate = schedule.actual_delivery_date 
              ? new Date(schedule.actual_delivery_date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
              : "Unknown Date";

            return (
              <div key={schedule.id || Math.random()} className="card p-5 border border-gray-200">
                <div className="flex justify-between items-start mb-4 border-b pb-4">
                  <div>
                    <h3 className="font-bold text-gray-900 text-lg">Order #{schedule.id} ({orderSource})</h3>
                    <p className="text-sm text-gray-500">Delivered on: {formattedDate}</p>
                    <p className="text-sm font-medium text-gray-700 mt-1">{customer.name} • {customer.phone}</p>
                  </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-sm mt-2">
                        <thead>
                            <tr className="table-header">
                                <th className="text-left p-3 rounded-tl-xl">Product</th>
                                <th className="text-left p-3">Return Reason</th>
                                <th className="text-left p-3">Proof Photo</th>
                                <th className="text-left p-3">Status</th>
                                <th className="text-right p-3 rounded-tr-xl">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {group.items.map(r => (
                                <tr key={r.id} className="table-row">
                                    <td className="p-3">
                                        <p className="text-gray-900 font-medium">{r.Product?.name}</p>
                                        <p className="text-gray-600 text-xs">
                                        Return: <span className="text-yellow-400 font-medium">{parseFloat(r.return_qty).toFixed(0)}{r.Product?.unit || 'g'}</span>
                                        </p>
                                        <p className="text-gray-600 text-[10px]">Delivered: {parseFloat(r.qty_gm).toFixed(0)}{r.Product?.unit || 'g'}</p>
                                    </td>
                                    <td className="p-3 text-gray-700 italic max-w-[200px] break-words">
                                        "{r.return_reason || "No reason specified"}"
                                    </td>
                                    <td className="p-3">
                                        {r.return_photo_url ? (
                                        <button
                                            onClick={() => setSelectedPhoto(r.return_photo_url)}
                                            className="group block relative w-16 h-12 rounded-lg overflow-hidden border border-gray-750 hover:border-fresh-500 transition-all bg-gray-50"
                                        >
                                            <img
                                            src={`http://localhost:3000${r.return_photo_url}`}
                                            alt="Return confirmation proof"
                                            className="w-full h-full object-cover group-hover:scale-105 transition-all"
                                            />
                                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-[10px] text-gray-900 font-medium transition-all">
                                            Zoom 🔍
                                            </div>
                                        </button>
                                        ) : (
                                        <span className="text-gray-600 text-xs italic">No photo</span>
                                        )}
                                    </td>
                                    <td className="p-3">
                                        {getStatusBadge(r.return_status)}
                                        {r.returned_by && (
                                        <div className="mt-2 text-[10px] text-gray-500 font-medium uppercase">
                                            By: {r.returned_by.replace('_', ' ')}
                                        </div>
                                        )}
                                    </td>
                                    <td className="p-3 text-right">
                                        {r.return_status === "requested" ? (
                                        <div className="flex justify-end gap-2">
                                            <button
                                            onClick={() => handleReview(r.id, "approved")}
                                            className="bg-green-600 hover:bg-green-500 text-gray-900 text-xs font-semibold py-1.5 px-3 rounded-lg shadow-md hover:shadow-lg transition-all"
                                            >
                                            Approve
                                            </button>
                                            <button
                                            onClick={() => handleReview(r.id, "rejected")}
                                            className="bg-red-650 hover:bg-red-550 text-gray-900 text-xs font-semibold py-1.5 px-3 rounded-lg shadow-md hover:shadow-lg transition-all"
                                            >
                                            Reject
                                            </button>
                                        </div>
                                        ) : (
                                        <span className="text-gray-600 text-xs italic">-</span>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
