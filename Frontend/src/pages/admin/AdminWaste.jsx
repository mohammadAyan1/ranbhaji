import { useState, useEffect } from "react";
import api from "../../api/axios";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function AdminWaste() {
    const [products, setProducts] = useState([]);
    const [wasteLogs, setWasteLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [msg, setMsg] = useState("");

    const [form, setForm] = useState({
        product_id: "",
        quantity: "",
        remark: ""
    });

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [prodRes, wasteRes] = await Promise.all([
                api.get("/products"),
                api.get("/waste")
            ]);
            setProducts(prodRes.data.products?.filter(p => p.status === 'active') || []);
            setWasteLogs(wasteRes.data.logs || []);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setMsg("");
        setSubmitting(true);
        try {
            await api.post("/waste", form);
            setMsg("✅ Waste logged successfully");
            setForm({ product_id: "", quantity: "", remark: "" });
            // Refresh logs
            const wasteRes = await api.get("/waste");
            setWasteLogs(wasteRes.data.logs || []);
        } catch (err) {
            setMsg(`❌ ${err.response?.data?.message || err.message}`);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="p-6">
            <div className="mb-8">
                <h1 className="text-2xl font-bold text-gray-900">Waste Management</h1>
                <p className="text-gray-500 mt-1">Log wasted items manually here. Items logged here will not be added back to inventory.</p>
            </div>

            <div className="card max-w-2xl mb-8">
                <h3 className="font-bold text-gray-900 mb-4">Add Waste Entry</h3>
                {msg && (
                    <div className={`p-3 rounded-xl mb-4 text-sm font-medium ${msg.startsWith('✅') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                        {msg}
                    </div>
                )}
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1">Product <span className="text-red-500">*</span></label>
                        <select
                            required
                            className="input-field"
                            value={form.product_id}
                            onChange={(e) => setForm({ ...form, product_id: e.target.value })}
                        >
                            <option value="">Select Product...</option>
                            {products.map(p => (
                                <option key={p.id} value={p.id}>{p.name} {p.hindi_name ? `(${p.hindi_name})` : ''} - {p.unit}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1">Quantity <span className="text-red-500">*</span></label>
                        <input
                            type="number"
                            step="0.01"
                            min="0.01"
                            required
                            className="input-field"
                            placeholder="Enter quantity"
                            value={form.quantity}
                            onChange={(e) => setForm({ ...form, quantity: e.target.value })}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1">Remark (Optional)</label>
                        <input
                            type="text"
                            className="input-field"
                            placeholder="Reason for waste..."
                            value={form.remark}
                            onChange={(e) => setForm({ ...form, remark: e.target.value })}
                        />
                    </div>
                    <button type="submit" disabled={submitting} className="btn-primary w-full">
                        {submitting ? "Logging..." : "Log Waste"}
                    </button>
                </form>
            </div>

            <div className="card">
                <h3 className="font-bold text-gray-900 mb-4">Recent Waste Logs</h3>
                {loading ? (
                    <div className="flex justify-center items-center h-32 text-gray-500">Loading logs...</div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead>
                                <tr className="bg-gray-50 border-b border-gray-100">
                                    <th className="p-3 font-semibold text-gray-600 rounded-tl-xl">Date</th>
                                    <th className="p-3 font-semibold text-gray-600">Product</th>
                                    <th className="p-3 font-semibold text-gray-600">Quantity</th>
                                    <th className="p-3 font-semibold text-gray-600 rounded-tr-xl">Remark</th>
                                </tr>
                            </thead>
                            <tbody>
                                {wasteLogs.map((log) => (
                                    <tr key={log.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                                        <td className="p-3 text-gray-600">
                                            {new Date(log.waste_date || log.created_at).toLocaleDateString('en-IN', {
                                                day: '2-digit', month: 'short', year: 'numeric'
                                            })}
                                        </td>
                                        <td className="p-3 font-medium text-gray-900">
                                            {log.Product ? `${log.Product.name} ${log.Product.hindi_name ? `(${log.Product.hindi_name})` : ''}` : 'Unknown'}
                                        </td>
                                        <td className="p-3 text-gray-600">
                                            {log.quantity} {log.Product?.unit}
                                        </td>
                                        <td className="p-3 text-gray-500">
                                            {log.remark || '-'}
                                        </td>
                                    </tr>
                                ))}
                                {wasteLogs.length === 0 && (
                                    <tr>
                                        <td colSpan="4" className="p-8 text-center text-gray-500">
                                            No waste logs found.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
