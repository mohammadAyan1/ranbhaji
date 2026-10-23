import { useEffect, useState } from "react";
import api from "../../../api/axios";
import { Package, Search, Trash2, X, ImageOff } from "lucide-react";

export default function DraftPackages() {
  const [packages, setPackages] = useState([]);
  const [calcDrafts, setCalcDrafts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const getImageUrl = (url) => {
    if (!url) return "";
    if (url.startsWith("http://") || url.startsWith("https://")) return url;
    const baseUrl = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "");
    const path = url.startsWith("/") ? url : `/${url}`;
    return `${baseUrl}${path}`;
  };

  const fetchDrafts = () => {
    setLoading(true);
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
  };

  useEffect(() => {
    fetchDrafts();
  }, []);

  const handleDeleteCalcDraft = async (id, name) => {
    if (!window.confirm(`Kya aap draft "${name}" ko delete karna chahte hain?`)) return;
    try {
      await api.delete(`/calculator/drafts/${id}`);
      setCalcDrafts(prev => prev.filter(d => d.id !== id));
    } catch (err) {
      alert(`Draft delete nahi ho paya: ${err.response?.data?.message || err.message}`);
    }
  };

  const filteredPackages = packages.filter(p => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return (
      (p.name || "").toLowerCase().includes(q) ||
      String(p.id).includes(q) ||
      (p.target_mobile_number || "").toLowerCase().includes(q) ||
      (p.creation_source || "").toLowerCase().includes(q)
    );
  });

  const filteredCalcDrafts = calcDrafts.filter(d => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return (
      (d.name || "").toLowerCase().includes(q) ||
      String(d.id).includes(q) ||
      (d.draft_type || "").toLowerCase().includes(q)
    );
  });

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Draft / Custom Packages</h1>
          <p className="text-gray-500 text-sm mt-1">Packages specifically created as custom drafts or calculator drafts.</p>
        </div>
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search drafts by name, phone, or ID..."
            className="w-full pl-10 pr-9 py-2 text-sm bg-gray-50/50 hover:bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 transition-all text-gray-800 placeholder-gray-400 shadow-sm"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
              title="Clear search"
            >
              <X size={15} />
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center text-gray-400 font-medium">Loading packages...</div>
      ) : (
        <>
          {/* Custom Assigned Packages */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-4 bg-gray-50/80 border-b border-gray-100 flex items-center justify-between">
              <span className="font-semibold text-gray-700">Custom Assigned Packages (Type: Custom)</span>
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700">
                {filteredPackages.length} of {packages.length}
              </span>
            </div>
            {packages.length === 0 ? (
              <div className="p-8 text-center text-gray-400 font-medium">No custom packages found.</div>
            ) : filteredPackages.length === 0 ? (
              <div className="p-8 text-center text-gray-400 font-medium">
                No custom packages matching "<span className="text-gray-700 font-semibold">{search}</span>"
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-gray-100 text-sm font-semibold text-gray-600 bg-white">
                      <th className="px-6 py-4">ID</th>
                      <th className="px-6 py-4">Image</th>
                      <th className="px-6 py-4">Name</th>
                      <th className="px-6 py-4">Source</th>
                      <th className="px-6 py-4">Persons</th>
                      <th className="px-6 py-4">Services/Mo</th>
                      <th className="px-6 py-4">Price</th>
                      <th className="px-6 py-4">Target Phone</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {filteredPackages.map(p => (
                      <tr key={p.id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="px-6 py-4 text-sm font-medium text-gray-500">#{p.id}</td>
                        <td className="px-6 py-4">
                          <div className="w-12 h-12 rounded-xl overflow-hidden border border-gray-200 bg-gray-50 flex items-center justify-center relative shadow-xs">
                            {p.image_url ? (
                              <img
                                src={getImageUrl(p.image_url)}
                                alt={p.name}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  e.currentTarget.style.display = "none";
                                  const fallback = e.currentTarget.parentElement?.querySelector(".broken-image-fallback");
                                  if (fallback) fallback.style.display = "flex";
                                }}
                              />
                            ) : null}
                            <div
                              className={`broken-image-fallback flex-col items-center justify-center w-full h-full bg-gray-50 text-gray-400 p-1 text-center ${
                                p.image_url ? "hidden" : "flex"
                              }`}
                              title={p.image_url ? "Broken image link" : "No image uploaded"}
                            >
                              <ImageOff className="w-4 h-4 text-gray-400" />
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 font-semibold text-gray-900">{p.name}</td>
                        <td className="px-6 py-4">
                          {p.creation_source === 'draft_margin_calculator' && <span className="badge bg-purple-100 text-purple-700 border-purple-200 text-xs px-2 py-1">Margin Calc</span>}
                          {p.creation_source === 'draft_price_calculator' && <span className="badge bg-indigo-100 text-indigo-700 border-indigo-200 text-xs px-2 py-1">Price Calc</span>}
                          {(!p.creation_source || p.creation_source === 'manual') && <span className="text-gray-400 text-xs font-medium">Manual</span>}
                        </td>
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
            <div className="p-4 bg-gray-50/80 border-b border-gray-100 flex items-center justify-between">
              <span className="font-semibold text-gray-700">Calculator Drafts (Unassigned)</span>
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-green-50 text-green-700">
                {filteredCalcDrafts.length} of {calcDrafts.length}
              </span>
            </div>
            {calcDrafts.length === 0 ? (
              <div className="p-8 text-center text-gray-400 font-medium">No calculator drafts found.</div>
            ) : filteredCalcDrafts.length === 0 ? (
              <div className="p-8 text-center text-gray-400 font-medium">
                No calculator drafts matching "<span className="text-gray-700 font-semibold">{search}</span>"
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-gray-100 text-sm font-semibold text-gray-600 bg-white">
                      <th className="px-6 py-4">ID</th>
                      <th className="px-6 py-4">Name</th>
                      <th className="px-6 py-4">Source</th>
                      <th className="px-6 py-4">Persons</th>
                      <th className="px-6 py-4">Services/Mo</th>
                      <th className="px-6 py-4">Calculated Price</th>
                      <th className="px-6 py-4">Margin</th>
                      <th className="px-6 py-4 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {filteredCalcDrafts.map(d => (
                      <tr key={d.id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="px-6 py-4 text-sm font-medium text-gray-500">#{d.id}</td>
                        <td className="px-6 py-4 font-semibold text-gray-900">{d.name}</td>
                        <td className="px-6 py-4">
                          {d.draft_type === 'margin_calculator' && <span className="badge bg-purple-100 text-purple-700 border-purple-200 text-xs px-2 py-1">Margin Calc</span>}
                          {d.draft_type === 'price_calculator' && <span className="badge bg-indigo-100 text-indigo-700 border-indigo-200 text-xs px-2 py-1">Price Calc</span>}
                          {!d.draft_type && <span className="text-gray-400 text-xs font-medium">-</span>}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">{d.num_persons}</td>
                        <td className="px-6 py-4 text-sm text-gray-600">{d.services_per_month}</td>
                        <td className="px-6 py-4 font-bold text-gray-900">₹{parseFloat(d.calculated_price).toFixed(0)}</td>
                        <td className="px-6 py-4 text-sm text-gray-600">{parseFloat(d.margin_percent).toFixed(0)}%</td>
                        <td className="px-6 py-4 text-center">
                          <button
                            type="button"
                            onClick={() => handleDeleteCalcDraft(d.id, d.name)}
                            className="bg-red-50 text-red-600 hover:bg-red-100 p-2 rounded-lg text-xs font-medium border border-red-200 hover:border-red-300 transition-colors inline-flex items-center gap-1"
                            title="Delete Draft"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Delete</span>
                          </button>
                        </td>
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
