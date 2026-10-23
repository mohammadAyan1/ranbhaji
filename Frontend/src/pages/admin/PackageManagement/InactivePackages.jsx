import { useEffect, useState } from "react";
import api from "../../../api/axios";
import { Search, X, ImageOff } from "lucide-react";

export default function InactivePackages() {
  const [packages, setPackages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const getImageUrl = (url) => {
    if (!url) return "";
    if (url.startsWith("http://") || url.startsWith("https://")) return url;
    const baseUrl = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "");
    const path = url.startsWith("/") ? url : `/${url}`;
    return `${baseUrl}${path}`;
  };

  useEffect(() => {
    api.get("/packages?adminTab=inactive")
      .then(res => setPackages(res.data.packages || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const filteredPackages = packages.filter(p => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return (
      (p.name || "").toLowerCase().includes(q) ||
      String(p.id).includes(q) ||
      (p.type || "").toLowerCase().includes(q) ||
      (p.status || "").toLowerCase().includes(q)
    );
  });

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Non Active Packages</h1>
          <p className="text-gray-500 text-sm mt-1">Packages with zero active user subscriptions.</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {/* Search Bar Toolbar */}
        <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-gray-50/40">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search packages by name, type, status, or ID..."
              className="w-full pl-10 pr-9 py-2 text-sm bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 transition-all text-gray-800 placeholder-gray-400 shadow-sm"
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
          <div className="text-xs font-medium text-gray-500">
            Showing <span className="font-bold text-gray-800">{filteredPackages.length}</span> of {packages.length} packages
          </div>
        </div>

        {loading ? (
          <div className="p-12 text-center text-gray-400 font-medium">Loading packages...</div>
        ) : packages.length === 0 ? (
          <div className="p-12 text-center text-gray-400 font-medium">No inactive packages found.</div>
        ) : filteredPackages.length === 0 ? (
          <div className="p-12 text-center text-gray-400 font-medium">
            No packages matching "<span className="text-gray-700 font-semibold">{search}</span>"
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50/80 border-b border-gray-100 text-sm font-semibold text-gray-600">
                  <th className="px-6 py-4">ID</th>
                  <th className="px-6 py-4">Image</th>
                  <th className="px-6 py-4">Name</th>
                  <th className="px-6 py-4">Persons</th>
                  <th className="px-6 py-4">Type</th>
                  <th className="px-6 py-4">Price</th>
                  <th className="px-6 py-4">Status</th>
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
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {p.num_persons}{p.num_persons_max ? ` - ${p.num_persons_max}` : ''}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 capitalize">{p.type}</td>
                    <td className="px-6 py-4 font-bold text-gray-900">₹{parseFloat(p.price).toFixed(0)}</td>
                    <td className="px-6 py-4">
                       <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                        p.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                      }`}>
                        {p.status.toUpperCase()}
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
