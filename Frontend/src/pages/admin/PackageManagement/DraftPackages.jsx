import { useEffect, useState } from "react";
import api from "../../../api/axios";
import { Package, Search } from "lucide-react";

export default function DraftPackages() {
  const [packages, setPackages] = useState([]);
  const [calcDrafts, setCalcDrafts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get("/packages?adminTab=draft"),
      api.get("/calculator/drafts")
    ])
      .then(([resPkg, resDraft]) => {
        setPackages(resPkg.data.packages || []);
        setCalcDrafts(resDraft.data.drafts || []);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Draft / Custom Packages</h1>
          <p className="text-gray-500 text-sm mt-1">Packages specifically created as custom drafts or calculator drafts.</p>
        </div>
      </div>

      {loading ? (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center text-gray-400 font-medium">Loading packages...</div>
      ) : (
        <>
          {/* Custom Assigned Packages */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-4 bg-gray-50/80 border-b border-gray-100 font-semibold text-gray-700">Custom Assigned Packages (Type: Custom)</div>
            {packages.length === 0 ? (
              <div className="p-8 text-center text-gray-400 font-medium">No custom packages found.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-gray-100 text-sm font-semibold text-gray-600 bg-white">
                      <th className="px-6 py-4">ID</th>
                      <th className="px-6 py-4">Name</th>
                      <th className="px-6 py-4">Persons</th>
                      <th className="px-6 py-4">Services/Mo</th>
                      <th className="px-6 py-4">Price</th>
                      <th className="px-6 py-4">Target Phone</th>
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
                        <td className="px-6 py-4 text-sm text-gray-600">{p.services_per_month}</td>
                        <td className="px-6 py-4 font-bold text-gray-900">₹{parseFloat(p.price).toFixed(0)}</td>
                        <td className="px-6 py-4 text-sm text-gray-600">{p.target_mobile_number || "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Calculator Drafts */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mt-6">
            <div className="p-4 bg-gray-50/80 border-b border-gray-100 font-semibold text-gray-700">Calculator Drafts (Unassigned)</div>
            {calcDrafts.length === 0 ? (
              <div className="p-8 text-center text-gray-400 font-medium">No calculator drafts found.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-gray-100 text-sm font-semibold text-gray-600 bg-white">
                      <th className="px-6 py-4">ID</th>
                      <th className="px-6 py-4">Name</th>
                      <th className="px-6 py-4">Persons</th>
                      <th className="px-6 py-4">Services/Mo</th>
                      <th className="px-6 py-4">Calculated Price</th>
                      <th className="px-6 py-4">Margin</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {calcDrafts.map(d => (
                      <tr key={d.id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="px-6 py-4 text-sm font-medium text-gray-500">#{d.id}</td>
                        <td className="px-6 py-4 font-semibold text-gray-900">{d.name}</td>
                        <td className="px-6 py-4 text-sm text-gray-600">{d.num_persons}</td>
                        <td className="px-6 py-4 text-sm text-gray-600">{d.services_per_month}</td>
                        <td className="px-6 py-4 font-bold text-gray-900">₹{parseFloat(d.calculated_price).toFixed(0)}</td>
                        <td className="px-6 py-4 text-sm text-gray-600">{parseFloat(d.margin_percent).toFixed(0)}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
