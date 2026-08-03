import { useState } from "react";
import api from "../../../api/axios";
import { Search } from "lucide-react";

export default function LostCustomerReport() {
    const [from, setFrom] = useState("");
    const [to, setTo] = useState("");
    const [data, setData] = useState([]);
    const [count, setCount] = useState(0);
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState("");

    const fetchReport = async () => {
        if (!from || !to) {
            alert("Please select both dates");
            return;
        }
        setLoading(true);
        try {
            const res = await api.get(`/reports/lost-customers?from=${from}&to=${to}`);
            setData(res.data.users || []);
            setCount(res.data.count || 0);
        } catch (error) {
            alert("Failed to fetch report");
        } finally {
            setLoading(false);
        }
    };

    const filteredData = data.filter(item => item.name?.toLowerCase().includes(search.toLowerCase()) || item.phone?.includes(search));

    return (
        <div className="p-6 max-w-6xl mx-auto space-y-6">
            <div className="flex flex-col md:flex-row items-center justify-between bg-white p-6 rounded-2xl shadow-sm border border-gray-100 gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Total Lost Customer Report</h1>
                    <p className="text-gray-500 text-sm mt-1">Users whose package expired in this date range and was not renewed after 2 days.</p>
                </div>
                <div className="flex items-center gap-3">
                    <input type="date" className="border border-gray-200 rounded-xl px-4 py-2" value={from} onChange={e => setFrom(e.target.value)} />
                    <span className="text-gray-400">to</span>
                    <input type="date" className="border border-gray-200 rounded-xl px-4 py-2" value={to} onChange={e => setTo(e.target.value)} />
                    <button onClick={fetchReport} className="btn-primary px-6 py-2">Filter</button>
                </div>
            </div>

            <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
                <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                    <div className="relative w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                        <input
                            type="text"
                            placeholder="Search name or phone..."
                            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:border-fresh-500 transition-all text-sm"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                    <div className="font-semibold text-red-700 bg-red-50 border border-red-100 px-4 py-2 rounded-xl">
                        Total Lost: {count}
                    </div>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-50/50 border-b border-gray-100">
                                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">ID</th>
                                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Name</th>
                                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Phone</th>
                                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {loading ? (
                                <tr><td colSpan="4" className="px-6 py-8 text-center text-gray-500">Loading...</td></tr>
                            ) : filteredData.length === 0 ? (
                                <tr><td colSpan="4" className="px-6 py-8 text-center text-gray-500">No data found</td></tr>
                            ) : (
                                filteredData.map((item, idx) => (
                                    <tr key={idx} className="hover:bg-gray-50/50 transition-colors">
                                        <td className="px-6 py-4 text-gray-500">#{item.id}</td>
                                        <td className="px-6 py-4 font-medium text-gray-900">{item.name}</td>
                                        <td className="px-6 py-4 text-gray-600">{item.phone}</td>
                                        <td className="px-6 py-4">
                                            <span className="px-2 py-1 bg-red-50 text-red-700 text-xs font-semibold rounded-full border border-red-200">
                                                Package Expired
                                            </span>
                                        </td>
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
