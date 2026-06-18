import { useEffect, useState } from "react";
import api from "../../api/axios";

export default function AddressPage() {
  const [addresses, setAddresses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");
  
  // Form modal/edit state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({
    address_line: "",
    city: "",
    pincode: "",
    landmark: "",
    is_default: false
  });
  const [submitting, setSubmitting] = useState(false);

  const fetchAddresses = () => {
    setLoading(true);
    api.get("/addresses")
      .then(r => setAddresses(r.data.addresses || []))
      .catch(err => setMsg(`❌ Failed to fetch addresses: ${err.response?.data?.message || err.message}`))
      .finally(() => setLoading(false));
  };

  useEffect(fetchAddresses, []);

  const handleOpenAdd = () => {
    setEditingId(null);
    setForm({
      address_line: "",
      city: "",
      pincode: "",
      landmark: "",
      is_default: false
    });
    setMsg("");
    setIsFormOpen(true);
  };

  const handleOpenEdit = (addr) => {
    setEditingId(addr.id);
    setForm({
      address_line: addr.address_line,
      city: addr.city,
      pincode: addr.pincode,
      landmark: addr.landmark || "",
      is_default: addr.is_default
    });
    setMsg("");
    setIsFormOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.address_line || !form.city || !form.pincode) {
      setMsg("❌ Address, City, and Pincode are required");
      return;
    }
    setSubmitting(true);
    setMsg("");
    try {
      if (editingId) {
        await api.put(`/addresses/${editingId}`, form);
        setMsg("✅ Address updated successfully!");
      } else {
        await api.post("/addresses", form);
        setMsg("✅ Address added successfully!");
      }
      setIsFormOpen(false);
      fetchAddresses();
    } catch (err) {
      setMsg(`❌ ${err.response?.data?.message || "Failed to save address"}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Are you sure you want to delete this address?")) return;
    setMsg("");
    try {
      await api.delete(`/addresses/${id}`);
      setMsg("✅ Address deleted successfully!");
      fetchAddresses();
    } catch (err) {
      setMsg(`❌ ${err.response?.data?.message || "Failed to delete address"}`);
    }
  };

  const handleSetDefault = async (id) => {
    setMsg("");
    try {
      await api.patch(`/addresses/${id}/default`);
      setMsg("✅ Default address updated!");
      fetchAddresses();
    } catch (err) {
      setMsg(`❌ ${err.response?.data?.message || "Failed to update default address"}`);
    }
  };

  if (loading && addresses.length === 0) {
    return <div className="flex items-center justify-center h-64 text-gray-400">Loading addresses...</div>;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-header">My Addresses 📍</h1>
          <p className="page-sub">Manage your delivery locations</p>
        </div>
        <button onClick={handleOpenAdd} className="btn-primary text-sm py-2 px-4">
          + Add Address
        </button>
      </div>

      {msg && (
        <div className={`rounded-xl px-4 py-3 text-sm ${msg.startsWith("✅") ? "bg-fresh-900/30 text-fresh-400 border border-fresh-700/50" : "bg-red-900/30 text-red-400 border border-red-700/50"}`}>
          {msg}
        </div>
      )}

      {/* Address Form Modal */}
      {isFormOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 w-full max-w-md animate-slide-up space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-white text-lg font-gradient">
                {editingId ? "Edit Address" : "Add New Address"}
              </h3>
              <button onClick={() => setIsFormOpen(false)} className="text-gray-400 hover:text-white text-2xl leading-none">&times;</button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="label">Address Line</label>
                <input
                  type="text"
                  className="input"
                  placeholder="House No, Building, Street Name..."
                  value={form.address_line}
                  onChange={e => setForm({...form, address_line: e.target.value})}
                  required
                />
              </div>

              <div>
                <label className="label">Landmark (Optional)</label>
                <input
                  type="text"
                  className="input"
                  placeholder="Near temple, hospital, gate..."
                  value={form.landmark}
                  onChange={e => setForm({...form, landmark: e.target.value})}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">City</label>
                  <input
                    type="text"
                    className="input"
                    placeholder="City"
                    value={form.city}
                    onChange={e => setForm({...form, city: e.target.value})}
                    required
                  />
                </div>
                <div>
                  <label className="label">Pincode</label>
                  <input
                    type="text"
                    className="input"
                    placeholder="Pincode"
                    value={form.pincode}
                    onChange={e => setForm({...form, pincode: e.target.value})}
                    required
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="default-chk"
                  className="w-4 h-4 accent-green-500"
                  checked={form.is_default}
                  onChange={e => setForm({...form, is_default: e.target.checked})}
                />
                <label htmlFor="default-chk" className="text-sm text-gray-300 cursor-pointer">
                  Set as default delivery address
                </label>
              </div>

              <div className="flex gap-3 pt-4 border-t border-gray-800">
                <button type="submit" disabled={submitting} className="btn-primary flex-1 py-2">
                  {submitting ? "Saving..." : "Save Address"}
                </button>
                <button type="button" onClick={() => setIsFormOpen(false)} className="btn-secondary py-2">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Address List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {addresses.map(addr => (
          <div key={addr.id} className={`card border transition-all ${addr.is_default ? "border-fresh-700/50 bg-fresh-950/5" : "border-gray-800"}`}>
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-xl">📍</span>
                  <p className="font-bold text-white text-base">{addr.city}</p>
                  {addr.is_default && (
                    <span className="badge badge-green text-xs font-semibold">Default</span>
                  )}
                </div>
                <p className="text-gray-300 text-sm">{addr.address_line}</p>
                {addr.landmark && (
                  <p className="text-gray-400 text-xs font-medium">Landmark: {addr.landmark}</p>
                )}
                <p className="text-gray-500 text-xs">Pincode: {addr.pincode}</p>
              </div>
            </div>

            <div className="flex items-center gap-3 mt-4 pt-3 border-t border-gray-800/60">
              {!addr.is_default && (
                <button onClick={() => handleSetDefault(addr.id)} className="text-xs text-fresh-400 hover:text-fresh-300 font-medium">
                  Set as Default
                </button>
              )}
              <button onClick={() => handleOpenEdit(addr)} className="text-xs text-blue-400 hover:text-blue-300 font-medium ml-auto">
                ✏️ Edit
              </button>
              <button onClick={() => handleDelete(addr.id)} className="text-xs text-red-400 hover:text-red-300 font-medium">
                🗑️ Delete
              </button>
            </div>
          </div>
        ))}

        {addresses.length === 0 && (
          <div className="md:col-span-2 card text-center py-16 text-gray-500">
            <p className="text-5xl mb-4">📍</p>
            <p className="text-lg font-medium text-white mb-1">No addresses saved yet</p>
            <p className="text-sm max-w-sm mx-auto mb-4">Please add a delivery address so that our delivery boy can deliver your packages safely.</p>
            <button onClick={handleOpenAdd} className="btn-primary inline-block py-2 px-6">
              Add Your First Address
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
