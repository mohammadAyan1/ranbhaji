import { useState, useEffect } from "react";
import api from "../../api/axios";

export default function AdminUserPreferences() {
  const [users, setUsers] = useState([]);
  const [vegetables, setVegetables] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  const [selectedUser, setSelectedUser] = useState(null);
  const [disliked, setDisliked] = useState([]);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [usersRes, vegRes] = await Promise.all([
        api.get("/admin/users"),
        api.get("/products/public/vegetables")
      ]);
      setUsers(usersRes.data.users || []);
      setVegetables(vegRes.data.products || []);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (user) => {
    setSelectedUser(user);
    setDisliked(user.disliked_products || []);
    setMessage({ type: "", text: "" });
  };

  const handleCloseModal = () => {
    setSelectedUser(null);
    setDisliked([]);
    setMessage({ type: "", text: "" });
  };

  const handleCheckboxChange = (id) => {
    setDisliked(prev => 
      prev.includes(id) ? prev.filter(pId => pId !== id) : [...prev, id]
    );
  };

  const handleSave = async () => {
    if (!selectedUser) return;
    setIsSaving(true);
    setMessage({ type: "", text: "" });
    try {
      await api.put(`/admin/users/${selectedUser.id}/dislikes`, { disliked_products: disliked });
      setMessage({ type: "success", text: "Preferences updated successfully!" });
      
      // Update local state
      setUsers(prev => prev.map(u => u.id === selectedUser.id ? { ...u, disliked_products: disliked } : u));
      
      setTimeout(() => {
        handleCloseModal();
      }, 1500);
    } catch (error) {
      setMessage({ type: "error", text: error.response?.data?.message || "Failed to update preferences." });
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-gray-500">Loading data...</div>;
  }

  const filteredUsers = users.filter(u => 
    u.name?.toLowerCase().includes(searchQuery.toLowerCase()) || 
    u.phone?.includes(searchQuery)
  );

  return (
    <div className="space-y-6 relative">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">User Preferences</h1>
          <p className="text-gray-600 mt-1">Manage disliked vegetables for users to prevent auto-assignment.</p>
        </div>
        <div className="w-full sm:max-w-xs">
          <input 
            type="text" 
            placeholder="Search name or phone..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-fresh-500 focus:border-fresh-500 outline-none transition-all"
          />
        </div>
      </div>

      <div className="card overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100 text-gray-600 text-sm">
                <th className="p-4 font-semibold">User</th>
                <th className="p-4 font-semibold">Phone</th>
                <th className="p-4 font-semibold">Role</th>
                <th className="p-4 font-semibold">Disliked Items Count</th>
                <th className="p-4 font-semibold text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredUsers.map(u => (
                <tr key={u.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="p-4 font-medium text-gray-900">{u.name}</td>
                  <td className="p-4 text-gray-600">{u.phone}</td>
                  <td className="p-4">
                    <span className={`px-2 py-1 text-xs rounded-full font-medium ${
                      u.role === 'admin' ? 'bg-purple-100 text-purple-700' :
                      u.role === 'delivery' ? 'bg-orange-100 text-orange-700' :
                      'bg-blue-100 text-blue-700'
                    }`}>
                      {u.role}
                    </span>
                  </td>
                  <td className="p-4">
                    <span className="inline-flex items-center justify-center bg-gray-100 text-gray-700 text-xs font-bold px-2 py-1 rounded-full">
                      {Array.isArray(u.disliked_products) ? u.disliked_products.length : 0} items
                    </span>
                  </td>
                  <td className="p-4 text-right">
                    <button 
                      onClick={() => handleOpenModal(u)}
                      className="text-sm font-medium text-fresh-600 hover:text-fresh-700 bg-fresh-50 hover:bg-fresh-100 px-3 py-1.5 rounded-lg transition-colors"
                    >
                      Edit Preferences
                    </button>
                  </td>
                </tr>
              ))}
              {filteredUsers.length === 0 && (
                <tr>
                  <td colSpan="5" className="p-8 text-center text-gray-500">No users found matching your search.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col animate-slide-up">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center">
              <div>
                <h3 className="text-xl font-bold text-gray-900">Edit Preferences: {selectedUser.name}</h3>
                <p className="text-sm text-gray-500">{selectedUser.phone}</p>
              </div>
              <button onClick={handleCloseModal} className="text-gray-400 hover:text-gray-600 p-2 bg-gray-50 hover:bg-gray-100 rounded-full transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1">
              {message.text && (
                <div className={`p-4 rounded-xl text-sm mb-6 ${message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                  {message.text}
                </div>
              )}
              
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {vegetables.map(veg => (
                  <label 
                    key={veg.id} 
                    className={`flex items-center space-x-3 p-3 rounded-xl border cursor-pointer transition-all ${
                      disliked.includes(veg.id) 
                        ? 'border-red-400 bg-red-50' 
                        : 'border-gray-200 hover:border-fresh-400 hover:bg-gray-50'
                    }`}
                  >
                    <input 
                      type="checkbox" 
                      className="rounded border-gray-300 text-red-500 focus:ring-red-500 w-5 h-5"
                      checked={disliked.includes(veg.id)}
                      onChange={() => handleCheckboxChange(veg.id)}
                    />
                    <div className="flex flex-col">
                      <span className="font-medium text-gray-900 text-sm">{veg.name}</span>
                      <span className="text-xs text-gray-500">{veg.hindi_name}</span>
                    </div>
                  </label>
                ))}
              </div>
            </div>
            
            <div className="p-6 border-t border-gray-100 bg-gray-50/50 flex justify-end gap-3 rounded-b-2xl">
              <button onClick={handleCloseModal} className="btn-secondary px-6">
                Cancel
              </button>
              <button onClick={handleSave} disabled={isSaving} className="btn-primary px-6">
                {isSaving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
