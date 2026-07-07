/* eslint-disable react-hooks/exhaustive-deps, react-hooks/set-state-in-effect, no-unused-vars */
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
  const [taggingLocation, setTaggingLocation] = useState(false);
  const [acceptedDetails, setAcceptedDetails] = useState(null);

  const [activeTab, setActiveTab] = useState("mine"); // "mine" or "available"
  const [availableOrders, setAvailableOrders] = useState({ schedules: [], retailOrders: [] });
  const [loadingAvailable, setLoadingAvailable] = useState(false);

  const fetchDeliveries = () => {
    api.get("/today-deliveries").then(r => setDeliveries(r.data.deliveries || [])).finally(() => setLoading(false));
  };

  const fetchAvailable = () => {
    setLoadingAvailable(true);
    api.get("/available-orders")
      .then(r => setAvailableOrders({ schedules: r.data.schedules || [], retailOrders: r.data.retailOrders || [] }))
      .catch(err => setMsg(`❌ Error fetching available orders: ${err.message}`))
      .finally(() => setLoadingAvailable(false));
  };

  useEffect(() => {
    let active = true;
    if (activeTab === "mine") {
      fetchDeliveries();
    } else {
      fetchAvailable();
    }
    return () => { active = false; };
  }, [activeTab]);

  const handleMarkDelivered = async (schedule_id, type) => {
    if (!photo && !remark) { setMsg("❌ Please add a photo or remark"); return; }
    setSubmitting(true); setMsg("");
    const formData = new FormData();
    formData.append("schedule_id", schedule_id);
    if (type) formData.append("type", type);
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

  const handleTagLocation = (address_id) => {
    if (!address_id) {
      setMsg("❌ Cannot tag location: No valid address ID found for this user.");
      return;
    }

    if (!navigator.geolocation) {
      setMsg("❌ Geolocation is not supported by your browser");
      return;
    }

    setTaggingLocation(true);
    setMsg("📍 Fetching live location...");

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          await api.patch(`/addresses/${address_id}/location`, {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          });
          setMsg("✅ Location tagged successfully!");
        } catch (err) {
          setMsg(`❌ Failed to save location: ${err.response?.data?.message || err.message}`);
        } finally {
          setTaggingLocation(false);
        }
      },
      (error) => {
        setMsg(`❌ Location error: ${error.message}`);
        setTaggingLocation(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  if (loading) return <div className="flex items-center justify-center h-64 text-gray-600">Loading deliveries...</div>;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
        <div>
          <h1 className="page-header">Delivery Dashboard 🚚</h1>
          <p className="page-sub">{new Date().toLocaleDateString("en-IN", { dateStyle: "full" })}</p>
        </div>
        <div className="flex bg-white rounded-lg p-1 border border-gray-200 self-start">
          <button
            onClick={() => setActiveTab("mine")}
            className={`px-4 py-2 rounded-md text-sm font-semibold transition-all ${activeTab === "mine" ? "bg-gray-100 text-gray-900 shadow" : "text-gray-600 hover:text-gray-800"}`}
          >
            My Deliveries
          </button>
          <button
            onClick={() => setActiveTab("available")}
            className={`px-4 py-2 rounded-md text-sm font-semibold transition-all ${activeTab === "available" ? "bg-gray-100 text-gray-900 shadow" : "text-gray-600 hover:text-gray-800"}`}
          >
            Available Orders
          </button>
        </div>
      </div>

      {msg && (
        <div className={`rounded-xl px-4 py-3 text-sm ${msg.startsWith("✅") ? "bg-fresh-100/30 text-fresh-600 border border-fresh-700/50" : "bg-red-900/30 text-red-600 border border-red-700/50"}`}>
          {msg}
        </div>
      )}

      {activeTab === "mine" ? (
        deliveries.length === 0 ? (
          <div className="card text-center py-16 text-gray-500">
            <p className="text-5xl mb-4">🎉</p>
            <p className="text-lg font-medium text-gray-900">All done!</p>
            <p>No deliveries scheduled for today.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {deliveries.map(delivery => (
              <div key={delivery.user.id} className="card">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="font-bold text-gray-900 text-lg">{delivery.user.name}</h3>
                    <p className="text-gray-600 text-sm">📞 {delivery.user.phone}</p>
                    <p className="text-gray-600 text-sm mt-1">📍 {delivery.user.address}</p>
                    {delivery.user.address_id && (
                      <button
                        onClick={() => handleTagLocation(delivery.user.address_id)}
                        disabled={taggingLocation}
                        className="mt-2 text-[11px] font-semibold bg-gray-100 text-fresh-600 border border-fresh-900/50 px-3 py-1.5 rounded-lg hover:bg-gray-700 transition-colors flex items-center gap-1"
                      >
                        {taggingLocation ? "Fetching..." : "📍 Tag Live Location"}
                      </button>
                    )}
                  </div>
                  <span className="badge-blue badge">{delivery.schedules.length} pkg(s)</span>
                </div>

                {delivery.schedules.map(sched => (
                  <div key={sched.schedule_id} className="bg-white rounded-xl p-4 mb-3 border border-gray-300/50">
                    <div className="flex items-center justify-between mb-3">
                      <p className="font-medium text-gray-900">{sched.package}</p>
                      <span className="text-gray-500 text-xs">#{sched.schedule_id}</span>
                    </div>
                    <div className="flex flex-wrap gap-2 mb-3">
                      {sched.items.map((item, idx) => (
                        <span key={idx} className="bg-gray-100 text-gray-700 text-xs px-2.5 py-1 rounded-lg border border-gray-300">
                          {item.product} {item.hindi_name ? `(${item.hindi_name})` : ""}: {item.qty_gm}{item.unit}
                        </span>
                      ))}
                    </div>

                    {selected === sched.schedule_id ? (
                      <div className="space-y-3 pt-3 border-t border-gray-300">
                        <div>
                          <label className="label text-xs">Upload Photo</label>
                          <input type="file" accept="image/*" onChange={e => setPhoto(e.target.files[0])} className="block text-xs text-gray-600 file:btn-secondary file:text-xs file:mr-3 file:border-0" />
                        </div>
                        <div>
                          <label className="label text-xs">Remark</label>
                          <input type="text" className="input text-sm" placeholder="Delivery remark..." value={remark} onChange={e => setRemark(e.target.value)} />
                        </div>
                        <div className="flex gap-2">
                          <button onClick={() => handleMarkDelivered(sched.schedule_id, sched.type)} disabled={submitting} className="btn-primary text-sm py-2 px-4 flex-1">
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
        )
      ) : (
        /* AVAILABLE ORDERS TAB */
        loadingAvailable ? (
          <div className="flex items-center justify-center h-32 text-gray-600">Loading available orders...</div>
        ) : (availableOrders.schedules.length === 0 && availableOrders.retailOrders.length === 0) ? (
          <div className="card text-center py-16 text-gray-500">
            <p className="text-4xl mb-3">📭</p>
            <p className="text-lg font-medium text-gray-900">No pending orders to claim.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {availableOrders.schedules.map(sched => (
              <div key={`sched-${sched.id}`} className="card flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-start mb-2">
                    <span className="badge-blue badge">Package</span>
                    <span className="text-xs text-gray-500">Batch: {sched.Batch?.name || 'Unassigned'}</span>
                  </div>
                  <h3 className="font-bold text-gray-900 text-lg">{sched.Subscription?.User?.name}</h3>
                  <p className="text-gray-600 text-sm">📍 {sched.Subscription?.Address?.address_line || 'No address'}</p>
                </div>
                <button
                  onClick={async () => {
                    try {
                      await api.put('/accept-order', { type: 'package', id: sched.id });
                      setMsg("✅ Order accepted successfully!");

                      // Show items in a modal after accepting
                      const itemsList = sched.DeliveryItems?.map(i => ({
                        product: i.Product?.name,
                        qty: i.qty_gm,
                        unit: i.Product?.unit
                      })) || [];

                      setAcceptedDetails({
                        userName: sched.Subscription?.User?.name,
                        type: 'Package',
                        items: itemsList
                      });

                      fetchAvailable();
                    } catch (e) {
                      setMsg(`❌ Failed to accept order: ${e.response?.data?.message || e.message}`);
                    }
                  }}
                  className="btn-primary mt-4 w-full text-sm py-2"
                >
                  Accept Order
                </button>
              </div>
            ))}

            {availableOrders.retailOrders.map(ro => (
              <div key={`retail-${ro.id}`} className="card flex flex-col justify-between border border-purple-500/30">
                <div>
                  <div className="flex justify-between items-start mb-2">
                    <span className="badge-purple badge">Retail</span>
                    <span className="text-xs text-gray-500">Batch: {ro.Batch?.name || 'Unassigned'}</span>
                  </div>
                  <h3 className="font-bold text-gray-900 text-lg">{ro.User?.name}</h3>
                  <p className="text-gray-600 text-sm">📍 {ro.Address?.address_line || 'No address'}</p>
                </div>
                <button
                  onClick={async () => {
                    try {
                      await api.put('/accept-order', { type: 'retail', id: ro.id });
                      setMsg("✅ Order accepted successfully!");

                      // Show items in a modal after accepting
                      const itemsList = ro.Items?.map(i => ({
                        product: i.Product?.name,
                        qty: i.qty_gm,
                        unit: i.Product?.unit
                      })) || [];

                      setAcceptedDetails({
                        userName: ro.User?.name,
                        type: 'Retail Order',
                        items: itemsList
                      });

                      fetchAvailable();
                    } catch (e) {
                      setMsg(`❌ Failed to accept order: ${e.response?.data?.message || e.message}`);
                    }
                  }}
                  className="btn-primary mt-4 w-full text-sm py-2 bg-purple-600 hover:bg-purple-700 focus:ring-purple-500/50"
                >
                  Accept Order
                </button>
              </div>
            ))}
          </div>
        )
      )}

      {/* ─── ACCEPTED ORDER MODAL ─────────────────────────────────── */}
      {acceptedDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/10 backdrop-blur-sm animate-fade-in p-4">
          <div className="bg-white border border-gray-200 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-5 border-b border-gray-200 bg-gray-100/30 flex justify-between items-center">
              <div>
                <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  <span className="text-xl">✅</span> Order Accepted!
                </h3>
                <p className="text-xs text-gray-600 mt-1">
                  You are now assigned to deliver to <span className="font-semibold text-gray-900">{acceptedDetails.userName}</span>
                </p>
              </div>
              <button onClick={() => { setAcceptedDetails(null); setActiveTab("mine"); }} className="text-gray-600 hover:text-gray-900 transition-colors">
                ✕
              </button>
            </div>

            <div className="p-5 overflow-y-auto">
              <h4 className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-3">Items to Deliver</h4>
              {acceptedDetails.items && acceptedDetails.items.length > 0 ? (
                <div className="space-y-2">
                  {acceptedDetails.items.map((item, idx) => (
                    <div key={idx} className="flex justify-between items-center bg-white p-3 rounded-xl border border-gray-300/50">
                      <span className="font-medium text-gray-900 text-sm">{item.product}</span>
                      <span className="bg-white text-fresh-600 text-xs font-bold px-2.5 py-1 rounded-lg border border-gray-300">
                        {item.qty}{item.unit}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500 bg-gray-100/30 p-4 rounded-xl text-center border border-gray-200/50">
                  No explicit items found or items are auto-generated.
                </p>
              )}
            </div>

            <div className="p-5 border-t border-gray-200 bg-gray-100/30">
              <button
                onClick={() => { setAcceptedDetails(null); setActiveTab("mine"); }}
                className="btn-primary w-full py-2.5 font-bold"
              >
                Go to My Deliveries
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
