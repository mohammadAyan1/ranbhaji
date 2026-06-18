import { useEffect, useState } from "react";
import api from "../../api/axios";

export default function AdminSubscriptions() {
  const [subs, setSubs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");

  useEffect(() => {
    // Fetch all users then their subscriptions
    api.get("/admin/users").then(async (res) => {
      const users = res.data.users || [];
      const all = [];
      await Promise.all(users.map(async (u) => {
        try {
          const r = await api.get(`/admin/user/${u.id}/all-subscriptions`);
          const userSubs = r.data.user?.Subscriptions || [];
          userSubs.forEach(s => all.push({ ...s, User: u, isWater: false }));

          const waterSubs = r.data.user?.WaterSubscriptions || [];
          waterSubs.forEach(w => all.push({ 
            ...w, 
            User: u, 
            isWater: true, 
            Package: { name: `${w.water_type} Water (${w.container})` } 
          }));
        } catch (_) {}
      }));
      setSubs(all);
    }).finally(() => setLoading(false));
  }, []);

  const filtered = subs.filter(s => {
    const matchStatus = filter === "all" || s.status === filter;
    const matchSearch = search === "" ||
      s.User?.name?.toLowerCase().includes(search.toLowerCase()) ||
      s.User?.phone?.includes(search);
    return matchStatus && matchSearch;
  });

  const statusBadge = (s) => {
    const map = { active: "badge-green", paused: "badge-yellow", cancelled: "badge-red", completed: "badge-blue" };
    return <span className={`${map[s] || "badge-gray"} badge`}>{s}</span>;
  };

  if (loading) return <div className="flex items-center justify-center h-64 text-gray-400">Loading subscriptions...</div>;

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="page-header">All Subscriptions 🔄</h1>
        <p className="page-sub">{subs.length} total subscriptions across all customers</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <input
          type="text" placeholder="Search by name or phone..."
          value={search} onChange={e => setSearch(e.target.value)}
          className="input flex-1 min-w-48"
        />
        <div className="flex gap-2 bg-gray-800 rounded-xl p-1">
          {["all", "active", "paused", "cancelled", "completed"].map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all capitalize ${filter === f ? "bg-fresh-600 text-white" : "text-gray-400 hover:text-white"}`}>
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {["active", "paused", "cancelled", "completed"].map(s => (
          <div key={s} className="card py-3">
            <p className="text-gray-500 text-xs capitalize">{s}</p>
            <p className="text-2xl font-bold text-white">{subs.filter(sub => sub.status === s).length}</p>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="card">
        {filtered.length === 0 ? (
          <p className="text-center text-gray-500 py-12">No subscriptions found.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="table-header">
                  <th className="text-left p-3 rounded-tl-xl">Customer</th>
                  <th className="text-left p-3">Package</th>
                  <th className="text-left p-3">Type</th>
                  <th className="text-left p-3">Start Date</th>
                  <th className="text-left p-3">Progress</th>
                  <th className="text-center p-3">Status</th>
                  <th className="text-right p-3 rounded-tr-xl">Amount</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(s => (
                  <tr key={s.id} className="table-row">
                    <td className="p-3">
                      <p className="text-white font-medium">{s.User?.name}</p>
                      <p className="text-gray-500 text-xs">{s.User?.phone}</p>
                    </td>
                    <td className="p-3 text-gray-300">{s.Package?.name || `#${s.package_id}`}</td>
                    <td className="p-3"><span className="badge badge-gray capitalize">{s.type}</span></td>
                    <td className="p-3 text-gray-400">{s.start_date || "Not set"}</td>
                    <td className="p-3 text-gray-400">
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-1.5 bg-gray-700 rounded-full overflow-hidden">
                          <div className="h-full bg-fresh-500 rounded-full" style={{ width: `${s.total_services ? (s.services_completed / s.total_services) * 100 : 0}%` }} />
                        </div>
                        <span className="text-xs">{s.services_completed}/{s.total_services}</span>
                      </div>
                    </td>
                    <td className="p-3 text-center">{statusBadge(s.status)}</td>
                    <td className="p-3 text-right text-fresh-400 font-medium">
                      {s.isWater ? (
                        s.type === "yearly" ? `₹${parseFloat(s.yearly_amount_paid || 0).toFixed(0)}` : `₹${parseFloat(s.price_per_bottle * s.total_services).toFixed(0)}/mo`
                      ) : (
                        s.type === "yearly" ? `₹${parseFloat(s.yearly_amount_paid || 0).toFixed(0)}` : `₹${parseFloat(s.Package?.price || 0).toFixed(0)}/mo`
                      )}
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
