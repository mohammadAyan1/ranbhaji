import { useLocation, useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

export default function LossDetail() {
    const location = useLocation();
    const navigate = useNavigate();
    
    const product = location.state?.product;
    const logs = location.state?.logs || [];

    if (!product) {
        return (
            <div className="p-6 text-center">
                <p className="text-gray-500">Product data missing.</p>
                <button onClick={() => navigate(-1)} className="mt-4 text-fresh-600 hover:underline">Go Back</button>
            </div>
        );
    }

    return (
        <div className="p-6 max-w-6xl mx-auto space-y-6">
            <div className="flex items-center gap-4 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                    <ArrowLeft size={20} className="text-gray-600" />
                </button>
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Loss Breakdown: {product.name} ({product.hindi_name})</h1>
                    <p className="text-gray-500 text-sm mt-1">Detailed history of loss events for this product in the selected period.</p>
                </div>
            </div>

            <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-50/50 border-b border-gray-100">
                                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Date</th>
                                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Type</th>
                                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Quantity</th>
                                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Base Rate</th>
                                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Amount</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {logs.length === 0 ? (
                                <tr><td colSpan="5" className="px-6 py-8 text-center text-gray-500">No logs found</td></tr>
                            ) : (
                                logs.map((log, idx) => (
                                    <tr key={idx} className="hover:bg-gray-50/50 transition-colors">
                                        <td className="px-6 py-4 text-gray-900 font-medium">{new Date(log.loss_date).toLocaleDateString()}</td>
                                        <td className="px-6 py-4">
                                            {log.loss_type === 'extra_delivered' ? (
                                                <span className="px-2 py-1 bg-amber-50 text-amber-700 text-xs font-semibold rounded-full border border-amber-200">Extra Delivered</span>
                                            ) : (
                                                <span className="px-2 py-1 bg-red-50 text-red-700 text-xs font-semibold rounded-full border border-red-200">Spoiled / Unsold</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-gray-600">{log.loss_qty} {product.unit}</td>
                                        <td className="px-6 py-4 text-gray-600">₹{parseFloat(log.purchase_price_at_loss).toFixed(2)} / base</td>
                                        <td className="px-6 py-4 text-red-600 font-bold">₹{parseFloat(log.total_loss_amount).toFixed(2)}</td>
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
