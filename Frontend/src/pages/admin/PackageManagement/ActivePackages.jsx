import { useEffect, useState } from "react";
import api from "../../../api/axios";
import { Package, Users } from "lucide-react";

export default function ActivePackages() {
  const [packages, setPackages] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/packages?adminTab=active")
      .then(res => setPackages(res.data.packages || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Total Active Packages</h1>
          <p className="text-gray-500 text-sm mt-1">Packages currently subscribed by one or more users.</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-gray-400 font-medium">Loading packages...</div>
        ) : packages.length === 0 ? (
          <div className="p-12 text-center text-gray-400 font-medium">No active packages found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50/80 border-b border-gray-100 text-sm font-semibold text-gray-600">
                  <th className="px-6 py-4">ID</th>
                  <th className="px-6 py-4">Name</th>
                  <th className="px-6 py-4">Persons</th>
                  <th className="px-6 py-4">Type</th>
                  <th className="px-6 py-4">Price</th>
                  <th className="px-6 py-4 text-center">Active Subs</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {packages.map(p => (
                  <tr key={p.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4 text-sm font-medium text-gray-500">#{p.id}</td>
                    <td className="px-6 py-4 font-semibold text-gray-900">{p.name}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {p.num_persons}{p.num_persons_max ? ` - ${p.num_persons_max}` : ''}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 capitalize">{p.type}</td>
                    <td className="px-6 py-4 font-bold text-gray-900">₹{parseFloat(p.price).toFixed(0)}</td>
                    <td className="px-6 py-4 text-center">
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-fresh-50 text-fresh-700 rounded-full text-sm font-bold border border-fresh-200">
                        <Users size={14} />
                        {p.active_subscribers_count || 0}
                      </span>
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
