import { useEffect, useState } from "react";
import api from "../../api/axios";

export default function AdminDeliveries() {
  const [deliveries, setDeliveries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedPhoto, setSelectedPhoto] = useState(null); // for zoom view modal

  useEffect(() => {
    api.get("/admin/deliveries")
      .then(r => setDeliveries(r.data.deliveries || []))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!selectedPhoto) return;
    const handleKeyDown = (e) => {
      if (e.key === "Escape") setSelectedPhoto(null);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedPhoto]);


  const filtered = deliveries.filter(d => {
    const term = search.toLowerCase();
    if (term === "") return true;

    const customerName = d.Subscription?.User?.name || d.WaterSubscription?.User?.name || "";
    const deliveryBoyName = d.DeliveryBoy?.name || "";
    const packageName = d.Subscription?.Package?.name || "Water Plan";

    return (
      customerName.toLowerCase().includes(term) ||
      deliveryBoyName.toLowerCase().includes(term) ||
      packageName.toLowerCase().includes(term)
    );
  });

  if (loading) return <div className="flex items-center justify-center h-64 text-gray-400">Loading delivery logs...</div>;

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="page-header">Delivery Logs 🚚</h1>
        <p className="page-sub">View confirmation details for all completed deliveries</p>
      </div>

      {/* Search Filter */}
      <div className="flex gap-3 max-w-md">
        <input
          type="text"
          placeholder="Search by customer, delivery boy or package name..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="input text-sm"
        />
      </div>

      {/* Zoom Photo Modal */}
      {selectedPhoto && (
        <div
          onClick={() => setSelectedPhoto(null)}
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 cursor-pointer"
        >
          <div
            onClick={e => e.stopPropagation()}
            className="relative max-w-3xl max-h-[85vh] overflow-hidden rounded-2xl border border-gray-700 bg-gray-950 flex flex-col cursor-default"
          >
            <button
              onClick={() => setSelectedPhoto(null)}
              className="absolute top-4 right-4 bg-gray-900/80 hover:bg-gray-800 text-white rounded-full w-10 h-10 flex items-center justify-center text-xl z-50 transition-all"
            >
              &times;
            </button>
            <img
              src={`http://localhost:3000${selectedPhoto}`}
              alt="Delivery confirmation zoom"
              className="object-contain max-h-[75vh]"
            />
            <div className="p-4 bg-gray-900 text-center text-gray-400 text-sm border-t border-gray-850">
              Delivery Confirmation Photo
            </div>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="card">
        {filtered.length === 0 ? (
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
                  <th className="text-left p-3">Delivered Items</th>
                  <th className="text-left p-3">Photo & Remark</th>
                  <th className="text-right p-3 rounded-tr-xl">Schedule ID</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(d => {
                  const customer = d.Subscription?.User || d.WaterSubscription?.User || {};
                  const packageName = d.Subscription?.Package?.name || 
                    (d.WaterSubscription ? `${d.WaterSubscription.water_type} Water (${d.WaterSubscription.container})` : "Water Plan");

                  const formattedDate = d.actual_delivery_date 
                    ? new Date(d.actual_delivery_date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
                    : "No date";

                  return (
                    <tr key={d.id} className="table-row">
                      <td className="p-3">
                        <span className="font-semibold text-white">{formattedDate}</span>
                      </td>
                      <td className="p-3">
                        <p className="text-white font-medium">{customer.name}</p>
                        <p className="text-gray-500 text-xs">📞 {customer.phone}</p>
                      </td>
                      <td className="p-3">
                        {d.DeliveryBoy ? (
                          <>
                            <p className="text-white font-medium">{d.DeliveryBoy.name}</p>
                            <p className="text-gray-500 text-xs">📞 {d.DeliveryBoy.phone}</p>
                          </>
                        ) : (
                          <span className="text-gray-500 text-xs italic">Not assigned</span>
                        )}
                      </td>
                      <td className="p-3 text-gray-300 font-medium">
                        {packageName}
                      </td>
                      <td className="p-3">
                        <div className="flex flex-wrap gap-1 max-w-[200px]">
                          {d.DeliveryItems?.map((item, idx) => (
                            <span key={idx} className="bg-gray-800 text-gray-300 text-[10px] px-2 py-0.5 rounded border border-gray-700">
                              {item.Product?.name} ({parseFloat(item.qty_gm).toFixed(0)}{item.Product?.unit || 'g'})
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="p-3">
                        <div className="space-y-1">
                          {d.delivery_remark && (
                            <p className="text-gray-300 text-xs bg-gray-800/40 border border-gray-800/60 p-2 rounded-lg max-w-[180px] italic">
                              "{d.delivery_remark}"
                            </p>
                          )}
                          {d.delivery_photo_url ? (
                            <button
                              onClick={() => setSelectedPhoto(d.delivery_photo_url)}
                              className="group block relative w-16 h-12 rounded-lg overflow-hidden border border-gray-750 hover:border-fresh-500 transition-all bg-gray-950"
                            >
                              <img
                                src={`http://localhost:3000${d.delivery_photo_url}`}
                                alt="Delivery confirmation"
                                className="w-full h-full object-cover group-hover:scale-105 transition-all"
                              />
                              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-[10px] text-white font-medium transition-all">
                                Zoom 🔍
                              </div>
                            </button>
                          ) : (
                            <span className="text-gray-600 text-xs italic">No photo uploaded</span>
                          )}
                        </div>
                      </td>
                      <td className="p-3 text-right text-gray-500">
                        #{d.id}
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
