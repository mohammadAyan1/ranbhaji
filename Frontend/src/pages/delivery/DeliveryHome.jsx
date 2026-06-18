import { useEffect, useState } from "react";
import api from "../../api/axios";

export default function DeliveryHome() {
  const [deliveries, setDeliveries] = useState([]);
  const [selected, setSelected] = useState(null);
  const [photo, setPhoto] = useState(null);
  const [remark, setRemark] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState("");

  const fetchDeliveries = () => {
    api.get("/today-deliveries").then(r => setDeliveries(r.data.deliveries || [])).finally(() => setLoading(false));
  };
  useEffect(fetchDeliveries, []);

  const handleMarkDelivered = async (schedule_id) => {
    if (!photo && !remark) { setMsg("❌ Please add a photo or remark"); return; }
    setSubmitting(true); setMsg("");
    const formData = new FormData();
    formData.append("schedule_id", schedule_id);
    if (photo) formData.append("photo", photo);
    if (remark) formData.append("remark", remark);
    try {
      await api.post("/mark-delivered", formData, { headers: { "Content-Type": "multipart/form-data" } });
      setMsg("✅ Delivery marked complete!");
      setSelected(null); setPhoto(null); setRemark("");
      fetchDeliveries();
    } catch (err) { setMsg(`❌ ${err.response?.data?.message}`); }
    finally { setSubmitting(false); }
  };

  if (loading) return <div className="flex items-center justify-center h-64 text-gray-400">Loading deliveries...</div>;

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="page-header">Today's Deliveries 🚚</h1>
        <p className="page-sub">{new Date().toLocaleDateString("en-IN", { dateStyle: "full" })}</p>
      </div>

      {msg && (
        <div className={`rounded-xl px-4 py-3 text-sm ${msg.startsWith("✅") ? "bg-fresh-900/30 text-fresh-400 border border-fresh-700/50" : "bg-red-900/30 text-red-400 border border-red-700/50"}`}>
          {msg}
        </div>
      )}

      {deliveries.length === 0 ? (
        <div className="card text-center py-16 text-gray-500">
          <p className="text-5xl mb-4">🎉</p>
          <p className="text-lg font-medium text-white">All done!</p>
          <p>No deliveries scheduled for today.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {deliveries.map(delivery => (
            <div key={delivery.user.id} className="card">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="font-bold text-white text-lg">{delivery.user.name}</h3>
                  <p className="text-gray-400 text-sm">📞 {delivery.user.phone}</p>
                  <p className="text-gray-400 text-sm mt-1">📍 {delivery.user.address}</p>
                </div>
                <span className="badge-blue badge">{delivery.schedules.length} pkg(s)</span>
              </div>

              {delivery.schedules.map(sched => (
                <div key={sched.schedule_id} className="bg-gray-800/50 rounded-xl p-4 mb-3 border border-gray-700/50">
                  <div className="flex items-center justify-between mb-3">
                    <p className="font-medium text-white">{sched.package}</p>
                    <span className="text-gray-500 text-xs">#{sched.schedule_id}</span>
                  </div>
                  <div className="flex flex-wrap gap-2 mb-3">
                    {sched.items.map((item, idx) => (
                      <span key={idx} className="bg-gray-800 text-gray-300 text-xs px-2.5 py-1 rounded-lg border border-gray-700">
                        {item.product}: {item.qty_gm}{item.unit}
                      </span>
                    ))}
                  </div>

                  {selected === sched.schedule_id ? (
                    <div className="space-y-3 pt-3 border-t border-gray-700">
                      <div>
                        <label className="label text-xs">Upload Photo</label>
                        <input type="file" accept="image/*" onChange={e => setPhoto(e.target.files[0])} className="block text-xs text-gray-400 file:btn-secondary file:text-xs file:mr-3 file:border-0" />
                      </div>
                      <div>
                        <label className="label text-xs">Remark</label>
                        <input type="text" className="input text-sm" placeholder="Delivery remark..." value={remark} onChange={e => setRemark(e.target.value)} />
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => handleMarkDelivered(sched.schedule_id)} disabled={submitting} className="btn-primary text-sm py-2 px-4 flex-1">
                          {submitting ? "Submitting..." : "✅ Confirm Delivery"}
                        </button>
                        <button onClick={() => setSelected(null)} className="btn-secondary text-sm py-2 px-4">Cancel</button>
                      </div>
                    </div>
                  ) : (
                    <button onClick={() => setSelected(sched.schedule_id)} className="btn-primary w-full text-sm py-2">
                      Mark as Delivered
                    </button>
                  )}
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
