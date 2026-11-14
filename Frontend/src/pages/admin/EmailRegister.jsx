import React, { useState, useEffect } from "react";
import {
  Mail, Plus, Trash2, Edit2, Send, CheckCircle2, XCircle, Clock,
  ExternalLink, Copy, Check, RefreshCw, AlertCircle, ShieldAlert
} from "lucide-react";
import api from "../../api/axios";

export default function EmailRegister() {
  const [emails, setEmails] = useState([]);
  const [loading, setLoading] = useState(true);
  const [purchaseUrl, setPurchaseUrl] = useState("https://rambhaji.frontend.shreenari.com/admin/products?tab=purchase");
  const [copied, setCopied] = useState(false);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEmail, setEditingEmail] = useState(null);
  const [formData, setFormData] = useState({ name: "", email: "", status: "active" });
  const [modalLoading, setModalLoading] = useState(false);

  // Action states
  const [actionMessage, setActionMessage] = useState(null);
  const [testingId, setTestingId] = useState(null);
  const [triggeringNow, setTriggeringNow] = useState(false);

  const fetchEmails = async () => {
    try {
      setLoading(true);
      const res = await api.get("/registered-emails");
      if (res.data.success) {
        setEmails(res.data.emails || []);
        if (res.data.purchaseUrl) {
          setPurchaseUrl(res.data.purchaseUrl);
        }
      }
    } catch (err) {
      console.error("Error fetching registered emails:", err);
      showBanner("error", err.response?.data?.message || "Failed to load registered emails");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmails();
  }, []);

  const showBanner = (type, text) => {
    setActionMessage({ type, text });
    setTimeout(() => {
      setActionMessage(null);
    }, 6000);
  };

  const handleOpenAdd = () => {
    setEditingEmail(null);
    setFormData({ name: "", email: "", status: "active" });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (item) => {
    setEditingEmail(item);
    setFormData({ name: item.name || "", email: item.email, status: item.status || "active" });
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingEmail(null);
    setFormData({ name: "", email: "", status: "active" });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.email || !formData.email.trim()) {
      showBanner("error", "Email is required!");
      return;
    }

    try {
      setModalLoading(true);
      if (editingEmail) {
        const res = await api.put(`/registered-emails/${editingEmail.id}`, formData);
        if (res.data.success) {
          showBanner("success", "Email updated successfully!");
          handleCloseModal();
          fetchEmails();
        }
      } else {
        const res = await api.post("/registered-emails", formData);
        if (res.data.success) {
          showBanner("success", "Email registered successfully!");
          handleCloseModal();
          fetchEmails();
        }
      }
    } catch (err) {
      console.error("Save error:", err);
      showBanner("error", err.response?.data?.message || "Failed to save email");
    } finally {
      setModalLoading(false);
    }
  };

  const handleDelete = async (id, emailStr) => {
    if (!window.confirm(`Are you sure you want to delete ${emailStr}?`)) {
      return;
    }
    try {
      const res = await api.delete(`/registered-emails/${id}`);
      if (res.data.success) {
        showBanner("success", "Email deleted successfully!");
        fetchEmails();
      }
    } catch (err) {
      console.error("Delete error:", err);
      showBanner("error", err.response?.data?.message || "Failed to delete email");
    }
  };

  const handleToggleStatus = async (item) => {
    const newStatus = item.status === "active" ? "inactive" : "active";
    try {
      const res = await api.put(`/registered-emails/${item.id}`, { status: newStatus });
      if (res.data.success) {
        setEmails(prev => prev.map(em => em.id === item.id ? { ...em, status: newStatus } : em));
        showBanner("success", `Email marked as ${newStatus}`);
      }
    } catch (err) {
      console.error("Status update error:", err);
      showBanner("error", err.response?.data?.message || "Failed to update status");
    }
  };

  const handleSendTest = async (item) => {
    try {
      setTestingId(item.id);
      const res = await api.post("/registered-emails/test-send", { email: item.email, name: item.name });
      if (res.data.success) {
        showBanner("success", `Test email sent successfully to ${item.email}!`);
      }
    } catch (err) {
      console.error("Test send error:", err);
      showBanner("error", err.response?.data?.message || "Failed to send test email. Check SMTP settings.");
    } finally {
      setTestingId(null);
    }
  };

  const handleTriggerNow = async () => {
    if (!window.confirm("Do you want to send the Daily Purchase Demand email to all active registered emails right now?")) {
      return;
    }
    try {
      setTriggeringNow(true);
      const res = await api.post("/registered-emails/trigger-now");
      if (res.data.success) {
        showBanner("success", res.data.message || "Purchase demand emails sent successfully!");
      }
    } catch (err) {
      console.error("Trigger error:", err);
      showBanner("error", err.response?.data?.message || "Failed to send emails. Check SMTP configuration.");
    } finally {
      setTriggeringNow(false);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const activeCount = emails.filter(e => e.status === "active").length;

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      
      {/* Top Banner Message */}
      {actionMessage && (
        <div
          className={`p-4 rounded-xl flex items-center justify-between shadow-sm border transition-all ${
            actionMessage.type === "success"
              ? "bg-emerald-50 border-emerald-200 text-emerald-800"
              : "bg-red-50 border-red-200 text-red-800"
          }`}
        >
          <div className="flex items-center gap-3">
            {actionMessage.type === "success" ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
            )}
            <span className="text-sm font-medium">{actionMessage.text}</span>
          </div>
          <button
            onClick={() => setActionMessage(null)}
            className="text-gray-400 hover:text-gray-600 text-sm font-bold ml-4"
          >
            ✕
          </button>
        </div>
      )}

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-600">
              <Mail className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Email Register</h1>
              <p className="text-sm text-gray-500 mt-0.5">
                Manage registered emails to receive daily Mandi Purchase Demand links at <strong>8:10 PM</strong>.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={fetchEmails}
            disabled={loading}
            className="p-2.5 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 transition"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-emerald-600" : ""}`} />
          </button>

          <button
            onClick={handleTriggerNow}
            disabled={triggeringNow || activeCount === 0}
            className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-medium text-sm shadow-sm flex items-center gap-2 transition disabled:opacity-50"
            title="Send daily email to all active emails right now"
          >
            <Send className="w-4 h-4" />
            {triggeringNow ? "Sending..." : "Send Email Now"}
          </button>

          <button
            onClick={handleOpenAdd}
            className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-sm shadow-sm flex items-center gap-2 transition"
          >
            <Plus className="w-4 h-4" />
            Register Email
          </button>
        </div>
      </div>

      {/* Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Total Registered</p>
            <p className="text-2xl font-extrabold text-gray-900 mt-1">{emails.length}</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <Mail className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Active Recipients</p>
            <p className="text-2xl font-extrabold text-emerald-600 mt-1">{activeCount}</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <CheckCircle2 className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Scheduled Time</p>
            <p className="text-xl font-bold text-gray-900 mt-1">8:10 PM IST</p>
            <p className="text-xs text-emerald-600 font-medium">Daily Cron Job</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
            <Clock className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-between">
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Shared Link in Email</p>
            <div className="flex items-center gap-2 mt-2">
              <span className="text-xs font-mono text-gray-700 truncate block bg-gray-50 px-2 py-1 rounded border">
                {purchaseUrl}
              </span>
              <button
                onClick={() => copyToClipboard(purchaseUrl)}
                className="p-1 rounded text-gray-400 hover:text-gray-700 hover:bg-gray-100"
                title="Copy link"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
          </div>
          <a
            href={purchaseUrl}
            target="_blank"
            rel="noreferrer"
            className="text-xs text-emerald-600 font-semibold hover:underline flex items-center gap-1 mt-2"
          >
            Open Purchase Page <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>

      {/* Emails Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-base font-bold text-gray-900">Registered Email List</h2>
          <span className="text-xs font-semibold px-2.5 py-1 bg-gray-100 text-gray-600 rounded-full">
            {emails.length} Records
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/70 border-b border-gray-100 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                <th className="px-6 py-4">#</th>
                <th className="px-6 py-4">Name / Label</th>
                <th className="px-6 py-4">Email Address</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Added Date</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-sm">
              {loading ? (
                <tr>
                  <td colSpan="6" className="px-6 py-12 text-center text-gray-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto text-emerald-600 mb-2" />
                    Loading registered emails...
                  </td>
                </tr>
              ) : emails.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-6 py-12 text-center text-gray-400">
                    <Mail className="w-8 h-8 mx-auto text-gray-300 mb-2" />
                    No emails registered yet. Click <strong>"Register Email"</strong> to add an email address.
                  </td>
                </tr>
              ) : (
                emails.map((item, index) => (
                  <tr key={item.id} className="hover:bg-gray-50/80 transition-colors">
                    <td className="px-6 py-4 text-gray-400 font-mono text-xs">{index + 1}</td>
                    <td className="px-6 py-4 font-medium text-gray-900">
                      {item.name || <span className="text-gray-400 italic">No Name</span>}
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-mono text-gray-800 font-medium">{item.email}</span>
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => handleToggleStatus(item)}
                        title="Click to toggle status"
                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold transition ${
                          item.status === "active"
                            ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-200"
                            : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                        }`}
                      >
                        <span
                          className={`w-2 h-2 rounded-full ${
                            item.status === "active" ? "bg-emerald-500" : "bg-gray-400"
                          }`}
                        />
                        {item.status === "active" ? "Active" : "Inactive"}
                      </button>
                    </td>
                    <td className="px-6 py-4 text-xs text-gray-500">
                      {new Date(item.created_at || item.createdAt).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric"
                      })}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleSendTest(item)}
                          disabled={testingId === item.id}
                          className="px-2.5 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200 text-xs font-medium flex items-center gap-1 transition"
                          title="Send test email to this address"
                        >
                          <Send className="w-3.5 h-3.5" />
                          {testingId === item.id ? "Sending..." : "Test"}
                        </button>

                        <button
                          onClick={() => handleOpenEdit(item)}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition"
                          title="Edit Email"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() => handleDelete(item.id, item.email)}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition"
                          title="Delete Email"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal for Add / Edit */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-gray-100">
            <div className="flex items-center justify-between pb-4 border-b border-gray-100">
              <h3 className="text-lg font-bold text-gray-900">
                {editingEmail ? "Edit Registered Email" : "Register New Email"}
              </h3>
              <button
                onClick={handleCloseModal}
                className="text-gray-400 hover:text-gray-600 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 mt-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">
                  Name / Label (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Mandi Buyer / Manager"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">
                  Email Address *
                </label>
                <input
                  type="email"
                  required
                  placeholder="e.g. buyer@example.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">
                  Status
                </label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white"
                >
                  <option value="active">Active (Will receive 8:10 PM email)</option>
                  <option value="inactive">Inactive (Do not send email)</option>
                </select>
              </div>

              <div className="pt-4 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="px-4 py-2 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 text-sm font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={modalLoading}
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold shadow-sm transition disabled:opacity-50"
                >
                  {modalLoading ? "Saving..." : editingEmail ? "Update Email" : "Save Email"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
