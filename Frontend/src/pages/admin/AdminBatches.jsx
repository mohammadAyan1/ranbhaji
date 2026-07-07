import { useState, useEffect } from 'react';
import api from '../../api/axios';

export default function AdminBatches() {
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(true);
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
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-gray-100 text-gray-600">
              <tr>
                <th className="p-4 font-medium">ID</th>
                <th className="p-4 font-medium">Name</th>
                <th className="p-4 font-medium">Status</th>
                <th className="p-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800 text-gray-700">
              {batches.map(batch => (
                <tr key={batch.id} className="hover:bg-white">
                  <td className="p-4">#{batch.id}</td>
                  <td className="p-4">{batch.name}</td>
                  <td className="p-4">
                    <span className={`px-2 py-1 text-xs rounded-lg ${batch.status === 'active' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-600'}`}>
                      {batch.status}
                    </span>
                  </td>
                  <td className="p-4 text-right flex gap-3 justify-end">
                    <button onClick={() => handleOpenModal(batch)} className="text-blue-400 hover:text-blue-300">Edit</button>
                    <button onClick={() => handleDelete(batch.id)} className="text-red-600 hover:text-red-300">Delete</button>
                  </td>
                </tr>
              ))}
              {batches.length === 0 && (
                <tr>
                  <td colSpan="4" className="p-6 text-center text-gray-500">No batches found</td>
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
