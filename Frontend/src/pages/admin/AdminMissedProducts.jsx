import React, { useState, useEffect } from "react";
import api from "../../api/axios";

export default function AdminMissedProducts() {
  const [missedProducts, setMissedProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchMissedProducts = async () => {
    try {
      const { data } = await api.get("/admin/missed-products");
      if (data.success) {
        setMissedProducts(data.missedLogs || []);
      }
    } catch (err) {
      setError("Failed to load missed products.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMissedProducts();
  }, []);

  const formatQuantity = (qty, unit) => {
    const numericQty = parseFloat(qty);
    if (unit === "gm" || unit === "ml") {
      if (numericQty >= 1000) {
        return `${(numericQty / 1000).toFixed(1)} ${unit === "gm" ? "kg" : "L"}`;
      }
      return `${numericQty.toFixed(0)} ${unit}`;
    }
    return `${numericQty.toFixed(0)} pcs`;
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Missed Products Log</h2>
        <p className="text-gray-600 text-sm">Products that were unchecked during packing and carried over to the next schedule</p>
      </div>

      {error && (
        <div className="mb-4 bg-red-100 text-red-600 p-3 rounded-lg border border-red-200">
          {error}
        </div>
      )}

      {loading ? (
        <div className="text-center text-gray-600 py-10">Loading missed products...</div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm min-w-[600px]">
              <thead className="bg-gray-100 text-gray-600">
              <tr>
                <th className="p-4 font-medium">Missed Date</th>
                <th className="p-4 font-medium">User Details</th>
                <th className="p-4 font-medium">Product</th>
                <th className="p-4 font-medium text-right">Missed Quantity</th>
                <th className="p-4 font-medium text-right">Added to Next Schedule</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 text-gray-700">
              {missedProducts.map((log) => (
                <tr key={log.id} className="hover:bg-gray-50 transition-colors">
                  <td className="p-4 whitespace-nowrap">
                    {new Date(log.missed_date).toLocaleDateString("en-IN", {
                      day: "numeric", month: "short", year: "numeric"
                    })}
                  </td>
                  <td className="p-4">
                    {log.User ? (
                      <>
                        <div className="font-semibold text-gray-900">{log.User.name}</div>
                        <div className="text-xs text-gray-500">{log.User.phone}</div>
                      </>
                    ) : (
                      <span className="text-gray-500 italic">Unknown</span>
                    )}
                  </td>
                  <td className="p-4 font-medium">
                    {log.Product ? log.Product.name : "Unknown"}
                  </td>
                  <td className="p-4 text-right font-bold text-red-500">
                    {log.Product ? formatQuantity(log.missed_qty, log.Product.unit) : log.missed_qty}
                  </td>
                  <td className="p-4 text-right text-fresh-600 font-medium">
                    {log.next_schedule_date ? (
                      new Date(log.next_schedule_date).toLocaleDateString("en-IN", {
                        day: "numeric", month: "short", year: "numeric"
                      })
                    ) : (
                      "Not Scheduled"
                    )}
                  </td>
                </tr>
              ))}
              {missedProducts.length === 0 && (
                <tr>
                  <td colSpan="5" className="p-6 text-center text-gray-500">
                    No missed products found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          </div>
        </div>
      )}
    </div>
  );
}
