import { useEffect, useState } from "react";
import { Search, X } from "lucide-react";
import api from "../../api/axios";

export default function AdminReferrals() {
  const [salesmen, setSalesmen] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("salesmen"); // "salesmen" or "users"
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [smRes, uRes] = await Promise.all([
        api.get("/referral/admin/salesmen"),
        api.get("/referral/admin/users")
      ]);
      setSalesmen(smRes.data.data || []);
      setUsers(uRes.data.data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const filteredSalesmen = salesmen.filter(sm => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    const smName = (sm.salesman?.name || "").toLowerCase();
    const smPhone = (sm.salesman?.phone || "").toLowerCase();
    const smEmail = (sm.salesman?.email || "").toLowerCase();
    const matchedUsers = (sm.referred_users || []).some(ru =>
      (ru.user?.name || "").toLowerCase().includes(q) ||
      (ru.user?.phone || "").toLowerCase().includes(q)
    );
    return smName.includes(q) || smPhone.includes(q) || smEmail.includes(q) || matchedUsers;
  });

  const filteredUsers = users.filter(u => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    const refName = (u.referrer?.name || "").toLowerCase();
    const refPhone = (u.referrer?.phone || "").toLowerCase();
    const refEmail = (u.referrer?.email || "").toLowerCase();
    const matchedUsers = (u.referred_users || []).some(ru =>
      (ru.user?.name || "").toLowerCase().includes(q) ||
      (ru.user?.phone || "").toLowerCase().includes(q)
    );
    return refName.includes(q) || refPhone.includes(q) || refEmail.includes(q) || matchedUsers;
  });

  if (loading) {
    return <div className="flex justify-center p-8"><div className="w-8 h-8 border-4 border-fresh-500/20 border-t-fresh-500 rounded-full animate-spin"></div></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Referral Dashboard</h1>
          <p className="text-sm text-gray-500">Track and manage salesman and user referral performance</p>
        </div>
        <div className="relative min-w-[240px] max-w-xs w-full sm:w-auto">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search referral, phone..."
            className="w-full pl-10 pr-8 py-2 text-sm bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 text-gray-800 placeholder-gray-400 shadow-sm"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
              title="Clear search"
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex space-x-4 border-b border-gray-200">
        <button
          className={`pb-2 px-4 font-medium transition-colors ${activeTab === 'salesmen' ? 'text-fresh-600 border-b-2 border-fresh-600' : 'text-gray-500 hover:text-gray-700'}`}
          onClick={() => setActiveTab("salesmen")}
        >
          Salesmen Referrals {salesmen.length > 0 && `(${filteredSalesmen.length})`}
        </button>
        <button
          className={`pb-2 px-4 font-medium transition-colors ${activeTab === 'users' ? 'text-fresh-600 border-b-2 border-fresh-600' : 'text-gray-500 hover:text-gray-700'}`}
          onClick={() => setActiveTab("users")}
        >
          User Referrals {users.length > 0 && `(${filteredUsers.length})`}
        </button>
      </div>

      {activeTab === "salesmen" && (
        <div className="space-y-4">
          {filteredSalesmen.length === 0 ? (
            <p className="text-gray-500 py-6 text-center">
              {searchQuery.trim() ? `No salesman referrals matching "${searchQuery}".` : "No salesman referrals found."}
            </p>
          ) : filteredSalesmen.map(sm => (
            <div key={sm.salesman.id} className="bg-white p-6 rounded-xl border shadow-sm">
              <div className="flex justify-between items-center mb-4 border-b pb-4">
                <div>
                  <h3 className="text-lg font-bold text-gray-900">{sm.salesman.name}</h3>
                  <p className="text-sm text-gray-500">{sm.salesman.phone} | {sm.salesman.email}</p>
                </div>
                <div className="text-right">
                  <span className="text-2xl font-bold text-fresh-600">{sm.total_referrals}</span>
                  <p className="text-xs text-gray-500 uppercase font-semibold">Total Referred</p>
                </div>
              </div>
              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-2">Referred Users</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {sm.referred_users.map(ru => (
                    <div key={ru.user.id} className="bg-gray-50 p-3 rounded border text-sm flex justify-between items-center">
                      <div>
                        <p className="font-medium">{ru.user.name}</p>
                        <p className="text-gray-500 text-xs">{ru.user.phone}</p>
                      </div>
                      <span className="text-xs text-gray-400">{new Date(ru.registered_at).toLocaleDateString()}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {activeTab === "users" && (
        <div className="space-y-4">
          {filteredUsers.length === 0 ? (
            <p className="text-gray-500 py-6 text-center">
              {searchQuery.trim() ? `No user referrals matching "${searchQuery}".` : "No user referrals found."}
            </p>
          ) : filteredUsers.map(u => (
            <div key={u.referrer.id} className="bg-white p-6 rounded-xl border shadow-sm">
              <div className="flex justify-between items-center mb-4 border-b pb-4">
                <div>
                  <h3 className="text-lg font-bold text-gray-900">{u.referrer.name}</h3>
                  <p className="text-sm text-gray-500">{u.referrer.phone} | {u.referrer.email}</p>
                </div>
                <div className="text-right flex items-center gap-4">
                  <div>
                    <span className="text-xl font-bold text-indigo-600">{u.referrer.total_free_servings}</span>
                    <p className="text-xs text-gray-500 uppercase font-semibold">Lifetime Free Servings</p>
                  </div>
                  <div className="w-px h-8 bg-gray-200"></div>
                  <div>
                    <span className="text-2xl font-bold text-fresh-600">{u.total_referrals}</span>
                    <p className="text-xs text-gray-500 uppercase font-semibold">Total Referred</p>
                  </div>
                </div>
              </div>
              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-2">Referred Users</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {u.referred_users.map(ru => (
                    <div key={ru.user.id} className="bg-gray-50 p-3 rounded border text-sm flex flex-col gap-1">
                      <div className="flex justify-between items-center">
                        <p className="font-medium">{ru.user.name}</p>
                        <span className="text-xs text-gray-400">{new Date(ru.registered_at).toLocaleDateString()}</span>
                      </div>
                      <p className="text-gray-500 text-xs mb-1">{ru.user.phone}</p>
                      <div className="flex items-center gap-2 mt-auto">
                        {ru.awarded_free_serving ? (
                          <span className="px-2 py-0.5 bg-green-100 text-green-700 border border-green-200 rounded text-xs font-medium">Free Serving Awarded</span>
                        ) : (
                          <span className="px-2 py-0.5 bg-gray-100 text-gray-500 border border-gray-200 rounded text-xs">No Reward</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
