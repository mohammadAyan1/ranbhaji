import { useEffect, useState } from "react";
import api from "../../api/axios";

export default function DeliveryHistory() {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedSchedule, setSelectedSchedule] = useState(null);
  const [returnType, setReturnType] = useState("all"); // 'all' or 'specific'
  const [selectedItems, setSelectedItems] = useState({}); // { [id]: { checked: true, return_qty: val } }
  const [returnForm, setReturnForm] = useState({ return_reason: "" });
  const [returnPhoto, setReturnPhoto] = useState(null);
  const [submittingReturn, setSubmittingReturn] = useState(false);
  const [msg, setMsg] = useState("");

  const fetchHistory = () => {
    api.get("/delivery-history")
      .then(r => setHistory(r.data.history || []))
      .finally(() => setLoading(false));
  };
  useEffect(fetchHistory, []);

  // Initialize return items when a schedule is selected
  useEffect(() => {
    if (selectedSchedule) {
      const initial = {};
      selectedSchedule.DeliveryItems?.filter(i => i.return_status === "none").forEach(item => {
        initial[item.id] = { checked: true, return_qty: item.qty_gm };
      });
      setSelectedItems(initial);
      setReturnType("all");
      setReturnForm({ return_reason: "" });
      setReturnPhoto(null);
    } else {
      setSelectedItems({});
    }
  }, [selectedSchedule]);

  const handleReturnSubmit = async (e) => {
    e.preventDefault();

    const itemsToReturn = [];
    if (returnType === "all") {
      selectedSchedule.DeliveryItems?.filter(i => i.return_status === "none").forEach(item => {
        itemsToReturn.push({
          delivery_item_id: item.id,
          return_qty: item.qty_gm
        });
      });
    } else {
      Object.keys(selectedItems).forEach(id => {
        const itemInfo = selectedItems[id];
        if (itemInfo.checked) {
          itemsToReturn.push({
            delivery_item_id: parseInt(id),
            return_qty: parseFloat(itemInfo.return_qty)
          });
        }
      });
    }

    if (itemsToReturn.length === 0) {
      setMsg("❌ Please select at least one item to return");
      return;
    }

    setSubmittingReturn(true);
    setMsg("");
    const fd = new FormData();
    fd.append("items", JSON.stringify(itemsToReturn));
    fd.append("return_reason", returnForm.return_reason);
    if (returnPhoto) fd.append("photo", returnPhoto);

    try {
      await api.post("/return-item", fd, { headers: { "Content-Type": "multipart/form-data" } });
      setMsg("✅ Return request submitted successfully!");
      setSelectedSchedule(null);
      fetchHistory();
    } catch (err) {
      setMsg(`❌ ${err.response?.data?.message || "Something went wrong"}`);
    } finally {
      setSubmittingReturn(false);
    }
  };

  const returnStatusBadge = (s) => ({
    none: <span className="badge badge-gray">No Return</span>,
    requested: <span className="badge badge-yellow">Return Pending</span>,
    approved: <span className="badge badge-green">Returned ✓</span>,
    rejected: <span className="badge badge-red">Rejected</span>,
  }[s] || null);

  if (loading) return <div className="flex items-center justify-center h-64 text-gray-400">Loading history...</div>;

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="page-header">Delivery History 📦</h1>
        <p className="page-sub">{history.length} past deliveries</p>
      </div>

      {msg && (
        <div className={`rounded-xl px-4 py-3 text-sm ${msg.startsWith("✅") ? "bg-fresh-900/30 text-fresh-400 border border-fresh-700/50" : "bg-red-900/30 text-red-400 border border-red-700/50"}`}>
          {msg}
        </div>
      )}

      {/* Return Modal */}
      {selectedSchedule && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 w-full max-w-md animate-slide-up max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-white">Request Return ↩️</h3>
              <button onClick={() => setSelectedSchedule(null)} className="text-gray-400 hover:text-white text-2xl">&times;</button>
            </div>
            
            {/* Return Type Selector */}
            <div className="flex gap-2 p-1 bg-gray-800 rounded-xl mb-4">
              <button
                type="button"
                onClick={() => setReturnType("all")}
                className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${returnType === "all" ? "bg-fresh-600 text-white shadow" : "text-gray-400 hover:text-white"}`}
              >
                Whole Order
              </button>
              <button
                type="button"
                onClick={() => setReturnType("specific")}
                className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${returnType === "specific" ? "bg-fresh-600 text-white shadow" : "text-gray-400 hover:text-white"}`}
              >
                Specific Products
              </button>
            </div>

            <form onSubmit={handleReturnSubmit} className="space-y-4">
              {returnType === "all" ? (
                <div className="bg-gray-800/30 border border-gray-800 p-3 rounded-xl space-y-1">
                  <p className="text-xs text-gray-400 mb-2">The following items will be returned in full:</p>
                  {selectedSchedule.DeliveryItems?.filter(i => i.return_status === "none").map(item => (
                    <p key={item.id} className="text-white text-xs font-medium">• {item.Product?.name} ({item.qty_gm}{item.Product?.unit || 'g'})</p>
                  ))}
                </div>
              ) : (
                <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1">
                  {selectedSchedule.DeliveryItems?.filter(i => i.return_status === "none").map(item => {
                    const info = selectedItems[item.id] || { checked: false, return_qty: item.qty_gm };
                    return (
                      <div key={item.id} className="flex items-center justify-between gap-3 p-2.5 bg-gray-800/40 rounded-xl border border-gray-850">
                        <label className="flex items-center gap-3 cursor-pointer flex-1 min-w-0">
                          <input
                            type="checkbox"
                            checked={info.checked}
                            onChange={e => setSelectedItems({
                              ...selectedItems,
                              [item.id]: { ...info, checked: e.target.checked }
                            })}
                            className="checkbox"
                          />
                          <div className="min-w-0">
                            <p className="text-white font-medium text-xs truncate">{item.Product?.name}</p>
                            <p className="text-gray-500 text-[10px]">Delivered: {item.qty_gm}{item.Product?.unit || 'g'}</p>
                          </div>
                        </label>
                        {info.checked && (
                          <div className="flex items-center gap-1 shrink-0">
                            <input
                              type="number"
                              min="1"
                              max={item.qty_gm}
                              value={info.return_qty}
                              onChange={e => setSelectedItems({
                                ...selectedItems,
                                [item.id]: { ...info, return_qty: e.target.value }
                              })}
                              className="input py-1 px-1.5 text-xs w-16 text-center"
                              required
                            />
                            <span className="text-gray-500 text-[10px]">{item.Product?.unit || 'g'}</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              <div>
                <label className="label text-xs">Reason for Return</label>
                <textarea
                  className="input text-sm"
                  rows={3}
                  placeholder="Describe the issue..."
                  value={returnForm.return_reason}
                  onChange={e => setReturnForm({...returnForm, return_reason: e.target.value})}
                  required
                />
              </div>

              <div>
                <label className="label text-xs">Upload Photo (optional)</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={e => setReturnPhoto(e.target.files[0])}
                  className="block text-xs text-gray-400 file:btn-secondary file:text-xs file:mr-3 file:border-0"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={submittingReturn} className="btn-primary flex-1">
                  {submittingReturn ? "Submitting..." : "Submit Return"}
                </button>
                <button type="button" onClick={() => setSelectedSchedule(null)} className="btn-secondary">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {history.length === 0 ? (
        <div className="card text-center py-12 text-gray-500">
          <p className="text-4xl mb-3">📦</p>
          <p>No deliveries received yet. Your history will appear here after the first delivery.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {history.map(sched => (
            <div key={sched.id} className="card">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="font-semibold text-white">{sched.Subscription?.Package?.name}</p>
                  <p className="text-gray-400 text-sm">Delivered: {sched.actual_delivery_date || sched.scheduled_date}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="badge badge-green">Delivered ✓</span>
                  {sched.DeliveryItems?.some(i => i.return_status === "none") && (
                    <button onClick={() => setSelectedSchedule(sched)} className="text-xs text-yellow-400 hover:text-yellow-300 font-medium">↩️ Return</button>
                  )}
                </div>
              </div>
              {sched.DeliveryItems?.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {sched.DeliveryItems.map(item => (
                    <div key={item.id} className="flex items-center gap-1.5">
                      <span className="bg-gray-800 text-gray-300 text-xs px-2.5 py-1 rounded-lg border border-gray-700">
                        {item.Product?.name} ({item.qty_gm}g)
                      </span>
                      {returnStatusBadge(item.return_status)}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
