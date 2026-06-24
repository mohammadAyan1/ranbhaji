import { useEffect, useState } from "react";
import api from "../../api/axios";

export default function MyRetailOrders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");

  const fetchOrders = () => {
    setLoading(true);
    api.get("/retail")
      .then(r => setOrders(r.data.orders || []))
      .catch(err => setMsg(`❌ Failed to load orders: ${err.response?.data?.message || err.message}`))
      .finally(() => setLoading(false));
  };

  useEffect(fetchOrders, []);

  const formatQuantity = (qtyInBase, unit) => {
    const qty = parseFloat(qtyInBase || 0);
    if (unit === 'gm' || unit === 'ml') {
      return `${(qty / 1000).toFixed(2)} ${unit === 'gm' ? 'kg' : 'L'}`;
    }
    return `${qty.toFixed(0)} pcs`;
  };

  if (loading && orders.length === 0) return <div className="flex items-center justify-center h-64 text-gray-400">Loading order history...</div>;

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="page-header">My Retail Orders 🛒</h1>
        <p className="page-sub">Track your direct purchases and delivery status</p>
      </div>

      {msg && (
        <div className={`rounded-xl px-4 py-3 text-sm ${msg.startsWith("✅") ? "bg-fresh-900/30 text-fresh-400 border border-fresh-700/50" : "bg-red-900/30 text-red-400 border border-red-700/50"}`}>
          {msg}
        </div>
      )}

      <div className="space-y-4">
        {orders.map(order => {
          const dateStr = new Date(order.created_at).toLocaleString("en-IN", {
            day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit"
          });
          const addr = order.Address;

          return (
            <div key={order.id} className="card border border-gray-800 space-y-4">
              {/* Header */}
              <div className="flex flex-wrap items-center justify-between gap-4 pb-3 border-b border-gray-800">
                <div>
                  <h3 className="font-bold text-white text-sm">Order #{order.id}</h3>
                  <p className="text-gray-500 text-[10px]">Placed on {dateStr}</p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <span className="badge bg-gray-800 text-gray-300 text-[10px] uppercase">
                    {order.payment_method === 'phonepe' ? '💳 Online (PhonePe)' : '💵 Cash on Delivery'}
                  </span>

                  <span className={`badge text-[10px] uppercase ${
                    order.payment_status === 'success' ? 'badge-green' : order.payment_status === 'failed' ? 'badge-red' : 'bg-gray-900 text-gray-400 border border-gray-850'
                  }`}>
                    Payment: {order.payment_status}
                  </span>

                  <span className={`badge text-[10px] uppercase ${
                    order.delivery_status === 'delivered' ? 'badge-green' : order.delivery_status === 'cancelled' ? 'badge-red' : 'bg-blue-950/20 text-blue-400 border border-blue-800/30'
                  }`}>
                    Delivery: {order.delivery_status}
                  </span>
                </div>
              </div>

              {/* Items & Address Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div className="space-y-3">
                  <div>
                    <p className="text-gray-500 font-bold uppercase tracking-wider text-[10px]">Delivery Information</p>
                    <p className="text-fresh-400 font-semibold mt-1">📅 Scheduled Delivery: {order.delivery_date}</p>
                    {addr && (
                      <p className="text-gray-400 mt-0.5">
                        📍 {addr.address_line}{addr.landmark ? `, ${addr.landmark}` : ""}, {addr.city} - {addr.pincode}
                      </p>
                    )}
                  </div>
                </div>

                <div>
                  <p className="text-gray-500 font-bold uppercase tracking-wider text-[10px] mb-1">Items Details</p>
                  <div className="bg-gray-900/35 border border-gray-850 rounded-xl overflow-hidden">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="bg-gray-850 text-gray-500">
                          <th className="p-2">Item</th>
                          <th className="p-2 text-right">Quantity</th>
                          <th className="p-2 text-right">Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {order.Items?.map(item => (
                          <tr key={item.id} className="border-t border-gray-850 text-gray-300">
                            <td className="p-2 font-medium text-white">{item.Product?.name || "Unknown Product"}</td>
                            <td className="p-2 text-right">{formatQuantity(item.quantity, item.Product?.unit)}</td>
                            <td className="p-2 text-right text-gray-200">₹{parseFloat(item.total_price).toFixed(2)}</td>
                          </tr>
                        ))}
                        <tr className="border-t border-gray-850 text-gray-400 font-medium">
                          <td colSpan="2" className="p-2 text-right">Delivery Charge:</td>
                          <td className="p-2 text-right text-gray-300">₹{parseFloat(order.delivery_charge).toFixed(2)}</td>
                        </tr>
                        <tr className="border-t border-gray-800 font-bold text-white bg-gray-800/10">
                          <td colSpan="2" className="p-2 text-right">Grand Total:</td>
                          <td className="p-2 text-right text-gradient">₹{parseFloat(order.total_amount).toFixed(2)}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          );
        })}

        {orders.length === 0 && (
          <div className="card text-center py-16 text-gray-500">
            <p className="text-5xl mb-4">🛍️</p>
            <p className="text-lg font-medium text-white">No retail orders yet</p>
            <p className="text-xs max-w-sm mx-auto mt-1">You haven't purchased anything directly yet. Go to Retail Store to buy fresh vegetables!</p>
          </div>
        )}
      </div>
    </div>
  );
}
