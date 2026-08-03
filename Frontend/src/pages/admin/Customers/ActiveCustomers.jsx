import { useEffect, useState } from "react";
import api from "../../../api/axios";
import { Users, Phone, Calendar, Wallet, Search } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function ActiveCustomers() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    api.get("/admin/user-analytics/customers-filtered?tab=active")
      .then(res => setCustomers(res.data.customers || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const filteredCustomers = customers.filter(c => {
    const q = searchQuery.toLowerCase();
    const nameMatch = c.name?.toLowerCase().includes(q);
    const phoneMatch = c.phone?.includes(q);
    return nameMatch || phoneMatch;
  });

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row items-center justify-between bg-white p-6 rounded-2xl shadow-sm border border-gray-100 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Active Customers</h1>
          <p className="text-gray-500 text-sm mt-1">All customers currently registered in the system.</p>
        </div>
        <div className="flex items-center gap-4 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="Search by name or phone..."
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all text-sm"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="bg-blue-50 text-blue-700 px-4 py-2 rounded-xl font-bold border border-blue-100 whitespace-nowrap">
            Total: {filteredCustomers.length}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-gray-400 font-medium">Loading customers...</div>
        ) : customers.length === 0 ? (
          <div className="p-12 text-center text-gray-400 font-medium">No customers found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50/80 border-b border-gray-100 text-sm font-semibold text-gray-600">
                  <th className="px-6 py-4">ID</th>
                  <th className="px-6 py-4">Customer</th>
                  <th className="px-6 py-4">Phone</th>
                  <th className="px-6 py-4">Wallet Balance</th>
                  <th className="px-6 py-4">Joined On</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredCustomers.map(c => (
                  <tr key={c.id} className="hover:bg-gray-50/50 transition-colors cursor-pointer" onClick={() => navigate(`/admin/customers/profile/${c.id}`)}>
                    <td className="px-6 py-4 text-sm font-medium text-gray-500">#{c.id}</td>
                    <td className="px-6 py-4 font-semibold text-gray-900 flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-sm">
                        {c.name ? c.name.charAt(0).toUpperCase() : 'U'}
                      </div>
                      {c.name || "Unknown"}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      <span className="flex items-center gap-1.5"><Phone size={14} className="text-gray-400"/> {c.phone}</span>
                    </td>
                    <td className="px-6 py-4 text-sm font-bold text-gray-900">
                       <span className="flex items-center gap-1.5"><Wallet size={14} className="text-gray-400"/> ₹{parseFloat(c.wallet_balance || 0).toFixed(0)}</span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                       <span className="flex items-center gap-1.5"><Calendar size={14} className="text-gray-400"/> {new Date(c.created_at).toLocaleDateString()}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
