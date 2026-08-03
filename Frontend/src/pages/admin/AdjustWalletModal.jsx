import React, { useState } from "react";
import { X, Upload, IndianRupee } from "lucide-react";
import api from "../../api/axios";

export default function AdjustWalletModal({ isOpen, onClose, user, onSuccess }) {
  const [type, setType] = useState("credit");
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [photo, setPhoto] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  if (!isOpen || !user) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!amount || parseFloat(amount) <= 0) {
      setError("Please enter a valid amount.");
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append("type", type);
      formData.append("amount", amount);
      if (reason) formData.append("reason", reason);
      if (photo) formData.append("photo", photo);

      await api.post(`/admin/users/${user.id}/wallet/adjust`, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      onSuccess();
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden relative">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-600 to-teal-700 p-6 flex justify-between items-center text-white">
          <div>
            <h2 className="text-xl font-bold">Adjust Wallet</h2>
            <p className="text-emerald-100 text-sm mt-1">{user.name} ({user.phone})</p>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:bg-white/20 p-2 rounded-full transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {error && (
            <div className="mb-4 bg-red-50 text-red-600 p-3 rounded-xl text-sm border border-red-200">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Type Toggle */}
            <div className="flex gap-4">
              <label className="flex-1 cursor-pointer group">
                <input
                  type="radio"
                  name="type"
                  value="credit"
                  checked={type === "credit"}
                  onChange={() => setType("credit")}
                  className="hidden"
                />
                <div className={`text-center py-3 rounded-xl border-2 transition-all font-semibold
                  ${type === "credit" ? "border-emerald-600 bg-emerald-50 text-emerald-700" : "border-slate-200 text-slate-500 group-hover:border-slate-300"}
                `}>
                  Add Funds (+)
                </div>
              </label>
              
              <label className="flex-1 cursor-pointer group">
                <input
                  type="radio"
                  name="type"
                  value="debit"
                  checked={type === "debit"}
                  onChange={() => setType("debit")}
                  className="hidden"
                />
                <div className={`text-center py-3 rounded-xl border-2 transition-all font-semibold
                  ${type === "debit" ? "border-rose-600 bg-rose-50 text-rose-700" : "border-slate-200 text-slate-500 group-hover:border-slate-300"}
                `}>
                  Deduct Funds (-)
                </div>
              </label>
            </div>

            {/* Amount */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Amount
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <IndianRupee className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  type="number"
                  min="1"
                  step="0.01"
                  required
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="block w-full pl-10 pr-3 py-3 border border-slate-200 rounded-xl focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-shadow hover:shadow-sm"
                  placeholder="0.00"
                />
              </div>
            </div>

            {/* Reason */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Remark / Reason (Optional)
              </label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={2}
                className="block w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-shadow hover:shadow-sm resize-none"
                placeholder="e.g. Penalty for late return"
              />
            </div>

            {/* Photo Upload */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Attach Photo (Optional)
              </label>
              <label className="flex items-center justify-center w-full px-4 py-4 border-2 border-dashed border-slate-300 rounded-xl cursor-pointer bg-slate-50 hover:bg-slate-100 transition-colors">
                <div className="flex flex-col items-center space-y-2">
                  <Upload className="h-6 w-6 text-slate-400" />
                  <span className="text-sm text-slate-500">
                    {photo ? photo.name : "Click to upload an image"}
                  </span>
                </div>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => setPhoto(e.target.files[0])}
                />
              </label>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className={`w-full flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-sm text-base font-medium text-white transition-all
                ${loading 
                  ? "bg-emerald-400 cursor-not-allowed" 
                  : "bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 hover:shadow-md active:scale-[0.98]"
                }
              `}
            >
              {loading ? "Processing..." : (type === "credit" ? "Confirm Add Funds" : "Confirm Deduction")}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
