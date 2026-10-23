import { useState, useEffect } from 'react';
import { Search, X } from 'lucide-react';
import api from '../../api/axios';

export default function AdminBatches() {
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [currentBatch, setCurrentBatch] = useState(null);
  const [formData, setFormData] = useState({ name: '', status: 'active' });

  useEffect(() => {
    fetchBatches();
  }, []);

  const fetchBatches = async () => {
    try {
      const { data } = await api.get('/admin/batches');
      if (data.success) {
        setBatches(data.batches);
      }
    } catch (error) {
      alert('Failed to load batches');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (batch = null) => {
    setCurrentBatch(batch);
    setFormData(batch ? { name: batch.name, status: batch.status } : { name: '', status: 'active' });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (currentBatch) {
        await api.put(`/admin/batches/${currentBatch.id}`, formData);
        alert('Batch updated');
      } else {
        await api.post('/admin/batches', formData);
        alert('Batch created');
      }
      setShowModal(false);
      fetchBatches();
    } catch (error) {
      alert(error.response?.data?.message || 'Action failed');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this batch?')) return;
    try {
      await api.delete(`/admin/batches/${id}`);
      alert('Batch deleted');
      fetchBatches();
    } catch (error) {
      alert('Delete failed');
    }
  };

  const filteredBatches = batches.filter(batch => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return (
      (batch.name || "").toLowerCase().includes(q) ||
      String(batch.id).includes(q) ||
      (batch.status || "").toLowerCase().includes(q)
    );
  });

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Manage Batches</h2>
        <button onClick={() => handleOpenModal()} className="btn-primary">
          + New Batch
        </button>
      </div>

      {loading ? (
        <div className="text-center text-gray-600 py-10">Loading...</div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
          {/* Search Bar Toolbar */}
          <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-gray-50/40">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search batches by name, status, or ID..."
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
              Showing <span className="font-bold text-gray-800">{filteredBatches.length}</span> of {batches.length} batches
            </div>
          </div>

          <table className="w-full text-left">
            <thead className="bg-gray-100 text-gray-600">
              <tr>
                <th className="p-4 font-medium">ID</th>
                <th className="p-4 font-medium">Name</th>
                <th className="p-4 font-medium">Status</th>
                <th className="p-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-gray-700">
              {filteredBatches.map(batch => (
                <tr key={batch.id} className="hover:bg-gray-50/60 transition-colors">
                  <td className="p-4 font-medium text-gray-500">#{batch.id}</td>
                  <td className="p-4 font-semibold text-gray-900">{batch.name}</td>
                  <td className="p-4">
                    <span className={`px-2.5 py-1 text-xs font-semibold rounded-lg ${batch.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                      {batch.status}
                    </span>
                  </td>
                  <td className="p-4 text-right flex gap-3 justify-end">
                    <button onClick={() => handleOpenModal(batch)} className="text-blue-600 hover:text-blue-700 font-medium text-sm">Edit</button>
                    <button onClick={() => handleDelete(batch.id)} className="text-red-600 hover:text-red-700 font-medium text-sm">Delete</button>
                  </td>
                </tr>
              ))}
              {batches.length === 0 && (
                <tr>
                  <td colSpan="4" className="p-6 text-center text-gray-500">No batches found</td>
                </tr>
              )}
              {batches.length > 0 && filteredBatches.length === 0 && (
                <tr>
                  <td colSpan="4" className="p-6 text-center text-gray-500">
                    No batches matching "<span className="text-gray-700 font-semibold">{search}</span>"
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-gray-900/10 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-gray-200 rounded-2xl w-full max-w-md p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">{currentBatch ? 'Edit Batch' : 'New Batch'}</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm text-gray-600 mb-1">Batch Name</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="input-field"
                  placeholder="e.g. Morning, Evening..."
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Status</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="input-field"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <button type="button" onClick={() => setShowModal(false)} className="btn-secondary">Cancel</button>
                <button type="submit" className="btn-primary">Save Batch</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
