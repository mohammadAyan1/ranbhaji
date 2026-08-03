import { useState, useEffect } from "react";
import api from "../../../api/axios";
import { Search, Plus } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function LossReport() {
    const [from, setFrom] = useState("");
    const [to, setTo] = useState("");
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState("");

    // Add Manual Loss state
    const [isAdding, setIsAdding] = useState(false);
    const [products, setProducts] = useState([]);
    const [lossForm, setLossForm] = useState({ product_id: "", loss_date: "", loss_qty: "" });
    const navigate = useNavigate();

    useEffect(() => {
        api.get("/products?tab=catalog")
            .then(res => setProducts(res.data.products || []))
            .catch(err => console.error(err));
    }, []);

    const fetchReport = async () => {
        if (!from || !to) {
            alert("Please select both dates");
            return;
        }
        setLoading(true);
        try {
            const res = await api.get(`/reports/loss?from=${from}&to=${to}`);
            setData(res.data.items || []);
        } catch (error) {
            alert("Failed to fetch report");
        } finally {
            setLoading(false);
        }
    };

    const handleAddLoss = async (e) => {
        e.preventDefault();
        try {
            await api.post("/reports/loss", lossForm);
            alert("Manual loss added successfully");
            setIsAdding(false);
            if (from && to) fetchReport();
        } catch (error) {
            alert("Failed to add loss");
        }
    };

    const filteredData = data.filter(item => item.product?.name?.toLowerCase().includes(search.toLowerCase()));

    return (
        <div className="p-6 max-w-6xl mx-auto space-y-6">
            <div className="flex flex-col md:flex-row items-center justify-between bg-white p-6 rounded-2xl shadow-sm border border-gray-100 gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Total Loss Report</h1>
                    <p className="text-gray-500 text-sm mt-1">Report of auto-recognized and manual product loss.</p>
                </div>
                <div className="flex items-center gap-3">
                    <input type="date" className="border border-gray-200 rounded-xl px-4 py-2" value={from} onChange={e => setFrom(e.target.value)} />
                    <span className="text-gray-400">to</span>
                    <input type="date" className="border border-gray-200 rounded-xl px-4 py-2" value={to} onChange={e => setTo(e.target.value)} />
                    <button onClick={fetchReport} className="btn-primary px-6 py-2">Filter</button>
                    <button onClick={() => setIsAdding(true)} className="btn-secondary px-4 py-2 flex items-center gap-2">
                        <Plus size={16} /> Add Manual Loss
                    </button>
                </div>
            </div>

            {isAdding && (
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                    <h2 className="text-lg font-bold mb-4">Add Manual Loss</h2>
                    <form onSubmit={handleAddLoss} className="flex flex-wrap items-end gap-4">
                        <div className="flex-1 min-w-[200px]">
                            <label className="block text-sm text-gray-600 mb-1">Product</label>
                            <select
                                required
                                className="w-full border border-gray-200 rounded-xl px-4 py-2"
                                value={lossForm.product_id}
                                onChange={e => setLossForm({ ...lossForm, product_id: e.target.value })}
                            >
                                <option value="">Select Product...</option>
                                {products.map(p => <option key={p.id} value={p.id}>{p.name} ({p.hindi_name})</option>)}
                            </select>
                        </div>
                        <div className="flex-1 min-w-[150px]">
                            <label className="block text-sm text-gray-600 mb-1">Date</label>
                            <input
                                required type="date" className="w-full border border-gray-200 rounded-xl px-4 py-2"
                                value={lossForm.loss_date}
                                onChange={e => setLossForm({ ...lossForm, loss_date: e.target.value })}
                            />
                        </div>
                        <div className="flex-1 min-w-[150px]">
                            <label className="block text-sm text-gray-600 mb-1">Quantity (Base unit)</label>
                            <input
                                required type="number" step="0.01" className="w-full border border-gray-200 rounded-xl px-4 py-2"
                                placeholder="Enter qty..."
                                value={lossForm.loss_qty}
                                onChange={e => setLossForm({ ...lossForm, loss_qty: e.target.value })}
                            />
                        </div>
                        <button type="submit" className="btn-primary px-6 py-2">Save</button>
                        <button type="button" onClick={() => setIsAdding(false)} className="px-6 py-2 border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50">Cancel</button>
                    </form>
                </div>
            )}

            <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
                <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                    <div className="relative w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                        <input
                            type="text"
                            placeholder="Search product..."
                            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:border-red-500 transition-all text-sm"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-50/50 border-b border-gray-100">
                                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Product Name</th>
                                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Quantity Lost</th>
                                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Loss Amount</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {loading ? (
                                <tr><td colSpan="3" className="px-6 py-8 text-center text-gray-500">Loading...</td></tr>
                            ) : filteredData.length === 0 ? (
                                <tr><td colSpan="3" className="px-6 py-8 text-center text-gray-500">No data found</td></tr>
                            ) : (
                                filteredData.map((item, idx) => (
                                    <tr
                                        key={idx}
                                        className="hover:bg-red-50/30 transition-colors cursor-pointer"
                                        onClick={() => navigate(`/admin/reports/loss/${item.product.id}`, { state: { product: item.product, logs: item.logs } })}
                                    >
                                        <td className="px-6 py-4 font-medium text-gray-900">{item.product?.name} ({item.product?.hindi_name})</td>
                                        <td className="px-6 py-4 text-red-600 font-semibold">{item.total_quantity} {item.product?.unit}</td>
                                        <td className="px-6 py-4 text-red-600 font-semibold">₹{item.total_amount?.toFixed(2)}</td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
