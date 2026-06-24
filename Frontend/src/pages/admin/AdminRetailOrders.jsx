import { useEffect, useState } from "react";
import api from "../../api/axios";

export default function AdminRetailOrders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");

  const fetchOrders = () => {
    setLoading(true);
    api.get("/retail/admin")
      .then(r => setOrders(r.data.orders || []))
      .catch(err => setMsg(`❌ Failed to fetch orders: ${err.response?.data?.message || err.message}`))
      .finally(() => setLoading(false));
  };

  useEffect(fetchOrders, []);

  const handleUpdateStatus = async (id, status) => {
    const actionText = status === 'delivered' ? "mark this order as delivered? Stock will be deducted." : "cancel this order?";
    if (!confirm(`Are you sure you want to ${actionText}`)) return;
    setMsg("");

    try {
      await api.patch(`/retail/admin/${id}/status`, { status });
      setMsg(`✅ Order #${id} successfully marked as ${status}!`);
      fetchOrders();
    } catch (err) {
      setMsg(`❌ ${err.response?.data?.message || "Failed to update order status"}`);
    }
  };

  const formatQuantity = (qtyInBase, unit) => {
    const qty = parseFloat(qtyInBase || 0);
    if (unit === 'gm' || unit === 'ml') {
      return `${(qty / 1000).toFixed(2)} ${unit === 'gm' ? 'kg' : 'L'}`;
    }
    return `${qty.toFixed(0)} pcs`;
  };

  if (loading && orders.length === 0) return <div className="flex items-center justify-center h-64 text-gray-400">Loading orders...</div>;

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="page-header">Retail Store Orders 🛒</h1>
        <p className="page-sub">Manage retail checkouts, payments, and deliveries</p>
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
            <div key={order.id} className="card border border-gray-800 hover:border-gray-700 transition-all space-y-4">
              {/* Order Header */}
              <div className="flex flex-wrap items-center justify-between gap-4 pb-3 border-b border-gray-800">
                <div className="space-y-1">
                  <h3 className="font-bold text-white text-base">Order #{order.id}</h3>
                  <p className="text-gray-500 text-xs">Placed on {dateStr}</p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <span className={`badge uppercase text-xs ${
                    order.payment_method === 'phonepe' ? 'badge-blue' : 'bg-amber-950/20 text-amber-400 border border-amber-800/30'
                  }`}>
                    💳 {order.payment_method === 'phonepe' ? 'PhonePe Online' : 'Cash on Delivery (COD)'}
                  </span>

                  <span className={`badge uppercase text-xs ${
                    order.payment_status === 'success' ? 'badge-green' : order.payment_status === 'failed' ? 'badge-red' : 'bg-gray-800 text-gray-400 border border-gray-700'
                  }`}>
                    💰 Payment: {order.payment_status}
                  </span>

                  <span className={`badge uppercase text-xs ${
                    order.delivery_status === 'delivered' ? 'badge-green' : order.delivery_status === 'cancelled' ? 'badge-red' : 'bg-blue-950/20 text-blue-400 border border-blue-800/30'
                  }`}>
                    📦 Delivery: {order.delivery_status}
                  </span>
                </div>
              </div>

              {/* Order Details Body */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">
                {/* Customer & Address */}
                <div className="space-y-2 md:col-span-1">
                  <p className="text-gray-500 font-bold uppercase tracking-wider text-xs">Customer Details</p>
                  <p className="text-white font-medium">{order.User?.name}</p>
                  <p className="text-gray-400 text-xs">📞 {order.User?.phone}</p>

                  <div className="mt-3 pt-3 border-t border-gray-800/50 space-y-1">
                    <p className="text-gray-500 font-bold uppercase tracking-wider text-xs">Delivery Address</p>
                    {addr ? (
                      <p className="text-gray-300 text-xs">
                        📍 {addr.address_line}{addr.landmark ? `, ${addr.landmark}` : ""}, {addr.city} - {addr.pincode}
                      </p>
                    ) : (
                      <p className="text-yellow-500 text-xs font-semibold">⚠️ Address data missing</p>
                    )}
                    <p className="text-fresh-400 text-xs font-semibold pt-1">
                      📅 Scheduled Delivery: {order.delivery_date}
                    </p>
                  </div>
                </div>

                {/* Order Items */}
                <div className="space-y-2 md:col-span-2">
                  <p className="text-gray-500 font-bold uppercase tracking-wider text-xs mb-1">Items Ordered</p>
                  <div className="bg-gray-900/35 border border-gray-850 rounded-xl overflow-hidden">
                    <table className="w-full text-xs text-left">
                      <thead>
                        <tr className="bg-gray-850 text-gray-400">
                          <th className="p-2">Item</th>
                          <th className="p-2 text-right">Quantity</th>
                          <th className="p-2 text-right">Unit Price</th>
                          <th className="p-2 text-right">Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {order.Items?.map(item => {
                          const unitPriceDisplay = item.Product?.unit === 'piece' 
                            ? `₹${parseFloat(item.price_per_unit).toFixed(2)}/pc` 
                            : `₹${(parseFloat(item.price_per_unit) * 1000).toFixed(2)}/kg`;

                          return (
                            <tr key={item.id} className="border-t border-gray-850 text-gray-300">
                              <td className="p-2 font-medium text-white">{item.Product?.name || "Unknown Product"}</td>
                              <td className="p-2 text-right">{formatQuantity(item.quantity, item.Product?.unit)}</td>
                              <td className="p-2 text-right text-gray-500">{unitPriceDisplay}</td>
                              <td className="p-2 text-right text-gray-200">₹{parseFloat(item.total_price).toFixed(2)}</td>
                            </tr>
                          );
                        })}
                        <tr className="border-t border-gray-800 text-gray-400 font-medium">
                          <td colSpan="3" className="p-2 text-right">Delivery Charge:</td>
                          <td className="p-2 text-right text-gray-300">₹{parseFloat(order.delivery_charge).toFixed(2)}</td>
                        </tr>
                        <tr className="border-t border-gray-800 font-bold text-white bg-gray-800/10">
                          <td colSpan="3" className="p-2 text-right text-sm">Grand Total:</td>
                          <td className="p-2 text-right text-gradient text-sm">₹{parseFloat(order.total_amount).toFixed(2)}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* Actions Footer */}
              {order.delivery_status === 'pending' && (
                <div className="flex items-center gap-3 pt-3 border-t border-gray-800/80">
                  <button
                    onClick={() => handleUpdateStatus(order.id, 'delivered')}
                    className="btn-primary py-1.5 px-6 text-xs"
                  >
                    🚚 Mark Delivered & Deduct Stock
                  </button>
                  <button
                    onClick={() => handleUpdateStatus(order.id, 'cancelled')}
                    className="btn-secondary py-1.5 px-4 text-xs text-red-400 hover:text-red-300"
                  >
                    🗑️ Cancel Order
                  </button>
                </div>
              )}
            </div>
          );
        })}

        {orders.length === 0 && (
          <div className="card text-center py-16 text-gray-500">
            <p className="text-5xl mb-4">🛒</p>
            <p className="text-lg font-medium text-white">No retail orders yet</p>
            <p className="text-xs max-w-sm mx-auto mt-1">Retail customer orders will show up here for delivery processing.</p>
          </div>
        )}
      </div>
    </div>
  );
}
