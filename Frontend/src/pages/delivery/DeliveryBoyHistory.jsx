import { useEffect, useState } from "react";
import api from "../../api/axios";

export default function DeliveryBoyHistory() {
  const [deliveries, setDeliveries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");

  // Return Modal State
  const [returningItem, setReturningItem] = useState(null);
  const [returnQty, setReturnQty] = useState("");
  const [returnPhoto, setReturnPhoto] = useState(null);
  const [returnRemark, setReturnRemark] = useState("");
  const [submittingReturn, setSubmittingReturn] = useState(false);

  const fetchHistory = () => {
    setLoading(true);
    api.get("/delivery/boy-history")
      .then(r => setDeliveries(r.data.deliveredItems || []))
      .catch(err => setMsg(`❌ Failed to fetch history: ${err.response?.data?.message || err.message}`))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const handleReturnSubmit = async (e) => {
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
      await api.post("/delivery/boy-return-item", formData, {
        headers: { "Content-Type": "multipart/form-data" }
      });
      setMsg("✅ Item returned successfully. User has been refunded.");
      setReturningItem(null);
      setReturnQty("");
      setReturnPhoto(null);
      setReturnRemark("");
      fetchHistory(); // Refresh to show updated return qty if backend provides it
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

  if (loading) return <div className="flex items-center justify-center h-64 text-gray-600">Loading your delivery history...</div>;

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="page-header">My Delivery History 🚚</h1>
        <p className="page-sub">View all the items you have successfully delivered.</p>
      </div>

      {msg && (
        <div className={`rounded-xl px-4 py-3 text-sm font-medium ${msg.startsWith('✅') ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
          {msg}
        </div>
      )}

      {deliveries.length === 0 ? (
        <div className="card text-center py-12">
          <p className="text-gray-500 mb-2 text-xl">No delivered items found.</p>
          <p className="text-sm text-gray-400">Complete your active deliveries to see them here.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {deliveries.map(item => {
            const product = item.Product || {};
            const unit = product.unit || 'g';
            
            const canReturn = item.delivery_status === 'delivered' && item.return_status !== 'approved';

            return (
              <div key={item.id} className="card p-4 flex flex-col justify-between border border-gray-200 hover:border-fresh-300 transition-colors">
                <div>
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-bold text-gray-900">{product.name}</h3>
                    <span className={`px-2 py-1 text-[10px] font-bold uppercase rounded-md border ${getStatusColor(item.delivery_status)}`}>
                      {item.delivery_status}
                    </span>
                  </div>
                  
                  <div className="text-sm text-gray-600 space-y-1 mb-4">
                    <p>Delivered Quantity: <span className="font-medium text-gray-900">{parseFloat(item.qty_gm).toFixed(1)}{unit}</span></p>
                    <p className="text-xs text-gray-500">Delivered on: {new Date(item.updatedAt).toLocaleString()}</p>
                    
                    {item.return_status && item.return_status !== 'none' && (
                      <p className="text-orange-600 text-xs font-semibold mt-2">
                        Return Status: <span className="uppercase">{item.return_status}</span> 
                        {item.returned_by && ` (by ${item.returned_by})`}
                      </p>
                    )}
                  </div>
                </div>

                {canReturn && (
                  <button 
                    onClick={() => {
                      setReturningItem(item);
                      setReturnQty(parseFloat(item.qty_gm));
                      setReturnPhoto(null);
                      setReturnRemark("");
                    }}
                    className="w-full py-2 bg-orange-50 text-orange-600 font-medium text-sm rounded-lg border border-orange-200 hover:bg-orange-100 transition-colors"
                  >
                    Initiate Return
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Return Modal */}
      {returningItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden flex flex-col">
            <div className="p-4 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
              <h3 className="font-bold text-gray-900">Return Item: {returningItem.Product?.name}</h3>
              <button onClick={() => setReturningItem(null)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>
            
            <form onSubmit={handleReturnSubmit} className="p-4 space-y-4">
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
                <input
                  type="file"
                  accept="image/*"
                  required
                  className="block w-full text-sm text-gray-600
                    file:mr-4 file:py-2 file:px-4
                    file:rounded-md file:border-0
                    file:text-sm file:font-semibold
                    file:bg-gray-100 file:text-gray-900
                    hover:file:bg-gray-200
                    cursor-pointer bg-white border border-gray-300 rounded-lg p-1.5 focus:border-fresh-500 focus:outline-none transition-colors"
                  onChange={e => setReturnPhoto(e.target.files[0])}
                />
                <p className="text-[10px] text-gray-500 mt-1">Please upload a clear photo showing the item.</p>
              </div>

              <div>
                <label className="label text-xs">Remark / Reason (Optional)</label>
                <textarea
                  className="input min-h-[80px]"
                  placeholder="e.g. Item was damaged..."
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
    </div>
  );
}
