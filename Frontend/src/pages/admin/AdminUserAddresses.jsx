import { useEffect, useState } from "react";
import api from "../../api/axios";

export default function AdminUserAddresses() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");

  const fetchUsers = () => {
    api.get("/admin/users")
      .then(r => setUsers(r.data.users || []))
      .catch(err => setMsg(`❌ ${err.response?.data?.message || err.message}`))
      .finally(() => setLoading(false));
  };
  
  useEffect(fetchUsers, []);

  if (loading) return <div className="flex items-center justify-center h-64 text-gray-600">Loading...</div>;

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="page-header">User Addresses 📍</h1>
        <p className="page-sub">View all users and their registered addresses</p>
      </div>

      {msg && (
        <div className="rounded-xl px-4 py-3 text-sm bg-red-900/30 text-red-600 border border-red-700/50">
          {msg}
        </div>
      )}

      <div className="card">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="table-header">
                <th className="text-left p-3 rounded-tl-xl">User Name</th>
                <th className="text-left p-3">Phone</th>
                <th className="text-left p-3">Role</th>
                <th className="text-left p-3">Addresses</th>
                <th className="text-left p-3 rounded-tr-xl">Coordinates (Lat, Lng)</th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => {
                const addresses = u.Addresses || [];
                
                return (
                  <tr key={u.id} className="table-row">
                    <td className="p-3 text-gray-900 font-medium align-top">{u.name}</td>
                    <td className="p-3 text-gray-600 align-top">{u.phone}</td>
                    <td className="p-3 align-top">
                      <span className={`badge ${u.role === "admin" ? "badge-red" : u.role === "delivery" ? "badge-blue" : "badge-green"}`}>{u.role}</span>
                    </td>
                    <td className="p-3 text-gray-700 align-top">
                      {addresses.length === 0 ? (
                        <span className="text-gray-500 italic">No addresses found</span>
                      ) : (
                        <ul className="space-y-2">
                          {addresses.map(addr => (
                            <li key={addr.id} className="pb-2 border-b border-gray-200 last:border-0 last:pb-0">
                              <p className="font-medium text-gray-900">{addr.address_line}</p>
                              <p className="text-xs text-gray-600">{addr.city} - {addr.pincode}</p>
                              {addr.landmark && <p className="text-xs text-gray-500">Landmark: {addr.landmark}</p>}
                              {addr.is_default && <span className="text-[10px] bg-fresh-100 text-fresh-600 px-2 py-0.5 rounded-full mt-1 inline-block">Default</span>}
                            </li>
                          ))}
                        </ul>
                      )}
                    </td>
                    <td className="p-3 text-gray-600 align-top">
                      {addresses.length === 0 ? (
                        "—"
                      ) : (
                        <ul className="space-y-2">
                          {addresses.map(addr => (
                            <li key={addr.id} className="pb-2 border-b border-gray-200 last:border-0 last:pb-0">
                                {addr.latitude && addr.longitude ? (
                                    <div className="flex items-center gap-2">
                                        <a 
                                            href={`https://www.google.com/maps/search/?api=1&query=${addr.latitude},${addr.longitude}`} 
                                            target="_blank" 
                                            rel="noreferrer"
                                            className="text-fresh-600 hover:underline"
                                        >
                                            {addr.latitude}, {addr.longitude}
                                        </a>
                                    </div>
                                ) : (
                                    <span className="text-gray-500">Not set</span>
                                )}
                            </li>
                          ))}
                        </ul>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
