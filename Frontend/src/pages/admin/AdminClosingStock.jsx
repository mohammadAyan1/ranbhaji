import React, { useState, useEffect } from 'react';
import api from '../../api/axios';

export default function AdminClosingStock() {
    const [report, setReport] = useState([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [date, setDate] = useState(new Date().toLocaleString("sv-SE", { timeZone: "Asia/Kolkata" }).split(" ")[0]);
    const [inputs, setInputs] = useState({});
    const [msg, setMsg] = useState("");
    const [isRange, setIsRange] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    
    // Future expansion for range filters
    const [startDate, setStartDate] = useState(date);
    const [endDate, setEndDate] = useState(date);

    const fetchReport = async () => {
        setLoading(true);
        try {
            const res = await api.get(`/admin/closing-stock?start_date=${startDate}&end_date=${endDate}`);
            if (res.data.success) {
                setReport(res.data.report || []);
                setIsRange(res.data.is_range);
                
                // Initialize inputs for closing stock
                const initInputs = {};
                (res.data.report || []).forEach(item => {
                    initInputs[item.product_id] = item.is_saved ? item.closing_stock : '';
                });
                setInputs(initInputs);
            }
        } catch (error) {
            console.error("Failed to fetch closing stock report:", error);
            setMsg("❌ Failed to load report");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchReport();
        // eslint-disable-next-line
    }, [startDate, endDate]);

    const handleInputChange = (productId, val) => {
        setInputs(prev => ({ ...prev, [productId]: val }));
    };

    const handleSave = async () => {
        setSubmitting(true);
        setMsg("");
        try {
            const itemsToSave = report.map(item => {
                const closingInput = inputs[item.product_id];
                const closingVal = parseFloat(closingInput || 0);
                
                // Calculate waste
                // Formula: Opening + Purchase - Demand - Closing
                let expectedClosing = parseFloat(item.opening_stock) + parseFloat(item.purchase_qty) - parseFloat(item.demand_qty);
                if (expectedClosing < 0) expectedClosing = 0;
                
                let waste = expectedClosing - closingVal;
                if (waste < 0) waste = 0; // Means they found more stock than expected

                return {
                    product_id: item.product_id,
                    opening_stock: item.opening_stock,
                    purchase_qty: item.purchase_qty,
                    demand_qty: item.demand_qty,
                    closing_stock: closingVal,
                    waste_qty: waste
                };
            });

            const res = await api.post("/admin/closing-stock", {
                date: startDate,
                items: itemsToSave
            });

            if (res.data.success) {
                setMsg("✅ Closing stock & waste calculated and saved successfully!");
                fetchReport();
            } else {
                setMsg("❌ Failed to save: " + res.data.message);
            }
        } catch (error) {
            console.error(error);
            setMsg("❌ An error occurred while saving.");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="p-6 max-w-7xl mx-auto">
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Closing Stock & Waste Calculator</h1>
                    <p className="text-gray-500 mt-1">Enter today's closing stock to auto-calculate waste.</p>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-wrap gap-4 items-end mb-6">
                <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">From Date</label>
                    <input 
                        type="date" 
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none"
                    />
                </div>
                <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">To Date</label>
                    <input 
                        type="date" 
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none"
                    />
                </div>
                
                {/* Search Bar */}
                <div className="flex-1 min-w-[200px]">
                    <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Search Product</label>
                    <input 
                        type="text" 
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Type to search..."
                        className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none"
                    />
                </div>

                {startDate === endDate && (
                    <div className="ml-auto">
                        <button 
                            onClick={handleSave}
                            disabled={submitting || loading}
                            className={`px-6 py-2 rounded-lg font-semibold text-white transition-all ${submitting ? 'bg-gray-400' : 'bg-green-600 hover:bg-green-700 shadow-md'}`}
                        >
                            {submitting ? 'Saving...' : 'Save All & Calculate Waste'}
                        </button>
                    </div>
                )}
            </div>

            {msg && (
                <div className={`p-4 rounded-lg mb-6 ${msg.includes('✅') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                    {msg}
                </div>
            )}

            {/* Table */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-50/80 border-b border-gray-100">
                                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Product</th>
                                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Opening Stock</th>
                                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Today's Purchase</th>
                                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Today's Demand</th>
                                <th className="px-6 py-4 text-xs font-semibold text-green-600 uppercase tracking-wider bg-green-50/30">Closing Stock (Enter)</th>
                                <th className="px-6 py-4 text-xs font-semibold text-red-500 uppercase tracking-wider">Waste Calculated</th>
                                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {loading ? (
                                <tr>
                                    <td colSpan="7" className="px-6 py-8 text-center text-gray-500">
                                        <div className="animate-pulse flex flex-col items-center">
                                            <div className="h-6 w-6 border-2 border-green-500 border-t-transparent rounded-full animate-spin mb-2"></div>
                                            Loading report...
                                        </div>
                                    </td>
                                </tr>
                            ) : report.length === 0 ? (
                                <tr>
                                    <td colSpan="7" className="px-6 py-8 text-center text-gray-500">
                                        No products found.
                                    </td>
                                </tr>
                            ) : (
                                report.filter(item => item.product_name.toLowerCase().includes(searchQuery.toLowerCase())).map((item) => {
                                    const closingInput = inputs[item.product_id] || '';
                                    const parsedClosing = parseFloat(closingInput || 0);
                                    
                                    // Calculate waste dynamically for preview
                                    let expectedClosing = parseFloat(item.opening_stock) + parseFloat(item.purchase_qty) - parseFloat(item.demand_qty);
                                    if (expectedClosing < 0) expectedClosing = 0;
                                    
                                    let wastePreview = 0;
                                    if (item.is_saved) {
                                        wastePreview = parseFloat(item.waste_qty);
                                    } else {
                                        wastePreview = expectedClosing - parsedClosing;
                                        if (wastePreview < 0) wastePreview = 0;
                                    }

                                    return (
                                        <tr key={item.product_id} className="hover:bg-gray-50/50 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="font-medium text-gray-900">{item.product_name}</div>
                                                <div className="text-xs text-gray-400">Unit: {item.unit}</div>
                                            </td>
                                            <td className="px-6 py-4 text-gray-600">
                                                {parseFloat(item.opening_stock).toFixed(2)} {item.unit}
                                            </td>
                                            <td className="px-6 py-4 text-blue-600 font-medium">
                                                +{parseFloat(item.purchase_qty).toFixed(2)} {item.unit}
                                            </td>
                                            <td className="px-6 py-4 text-orange-500 font-medium">
                                                -{parseFloat(item.demand_qty).toFixed(2)} {item.unit}
                                            </td>
                                            <td className="px-6 py-4 bg-green-50/10">
                                                {!isRange ? (
                                                    <input 
                                                        type="number" 
                                                        min="0"
                                                        step="0.01"
                                                        value={closingInput}
                                                        onChange={(e) => handleInputChange(item.product_id, e.target.value)}
                                                        className="w-24 px-2 py-1 border border-green-200 rounded text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                                                        placeholder="Qty..."
                                                    />
                                                ) : (
                                                    <span className="font-semibold text-gray-900">{parseFloat(item.closing_stock).toFixed(2)} {item.unit}</span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`font-semibold ${wastePreview > 0 ? 'text-red-500' : 'text-gray-400'}`}>
                                                    {wastePreview.toFixed(2)} {item.unit}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                {item.is_saved ? (
                                                    <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-semibold">Saved</span>
                                                ) : (
                                                    <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs font-semibold">Pending</span>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
