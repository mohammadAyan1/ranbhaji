import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../../../api/axios";
import { ArrowLeft, User, Phone, Mail, Calendar, Wallet, MapPin, ShoppingBag, Package, RefreshCw, Box } from "lucide-react";

export default function CustomerProfile() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        api.get(`/admin/user-analytics/customer-profile/${id}`)
            .then(res => {
                setProfile(res.data);
                setLoading(false);
            })
            .catch(err => {
                console.error(err);
                alert("Failed to load customer profile");
                setLoading(false);
            });
    }, [id]);

    if (loading) return <div className="p-8 text-center text-gray-500">Loading profile...</div>;
    if (!profile || !profile.user) return <div className="p-8 text-center text-red-500">Customer not found</div>;

    const { user, addresses, wallet_transactions, stats, deliveries } = profile;

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex items-center gap-4 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                    <ArrowLeft size={20} className="text-gray-600" />
                </button>
                <div className="flex-1">
                    <h1 className="text-2xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
                        {user.name}
                        {user.gender && <span className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded-full">{user.gender}</span>}
                    </h1>
                    <div className="flex flex-wrap items-center gap-4 mt-2 text-sm text-gray-600">
                        <span className="flex items-center gap-1"><Phone size={14} /> {user.phone}</span>
                        {user.email && <span className="flex items-center gap-1"><Mail size={14} /> {user.email}</span>}
                        <span className="flex items-center gap-1"><Calendar size={14} /> Registered: {new Date(user.created_at).toLocaleDateString()}</span>
                    </div>
                </div>
                <div className="text-right">
                    <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-1">User Password</p>
                    <p className="font-mono text-sm font-semibold text-gray-900 bg-gray-50 border border-gray-200 px-3 py-1 rounded-lg shadow-sm">
                        {user.actual_password || "Not Available"}
                    </p>
                </div>
            </div>

            {/* Highlights Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
                    <div className="p-3 bg-blue-50 text-blue-600 rounded-xl"><ShoppingBag size={24} /></div>
                    <div>
                        <p className="text-sm text-gray-500">Total Retail Orders</p>
                        <p className="text-xl font-bold text-gray-900">{stats.total_retail_orders}</p>
                        {stats.first_retail_date && <p className="text-xs text-gray-400 mt-1">First: {new Date(stats.first_retail_date).toLocaleDateString()}</p>}
                    </div>
                </div>
                <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
                    <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl"><RefreshCw size={24} /></div>
                    <div>
                        <p className="text-sm text-gray-500">Total Subscriptions</p>
                        <p className="text-xl font-bold text-gray-900">{stats.total_subscriptions}</p>
                        {stats.first_subscription_date && <p className="text-xs text-gray-400 mt-1">First: {new Date(stats.first_subscription_date).toLocaleDateString()}</p>}
                    </div>
                </div>
                <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
                    <div className="p-3 bg-purple-50 text-purple-600 rounded-xl"><Package size={24} /></div>
                    <div>
                        <p className="text-sm text-gray-500">First Serving</p>
                        <p className="text-lg font-bold text-gray-900">{stats.first_serving_date ? new Date(stats.first_serving_date).toLocaleDateString() : 'N/A'}</p>
                    </div>
                </div>
                <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
                    <div className="p-3 bg-orange-50 text-orange-600 rounded-xl"><Box size={24} /></div>
                    <div>
                        <p className="text-sm text-gray-500">Last Serving</p>
                        <p className="text-lg font-bold text-gray-900">{stats.last_serving_date ? new Date(stats.last_serving_date).toLocaleDateString() : 'N/A'}</p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Column: Wallet & Address */}
                <div className="space-y-6">
                    {/* Wallet */}
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                        <div className="p-4 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
                            <h2 className="font-bold text-gray-800 flex items-center gap-2"><Wallet size={18} /> Wallet</h2>
                            <span className="text-lg font-bold text-emerald-600">₹{parseFloat(user.wallet_balance || 0).toFixed(2)}</span>
                        </div>
                        <div className="p-0 max-h-[300px] overflow-y-auto">
                            {wallet_transactions.length === 0 ? (
                                <p className="p-4 text-sm text-gray-500 text-center">No transactions yet.</p>
                            ) : (
                                <ul className="divide-y divide-gray-50">
                                    {wallet_transactions.map(tx => (
                                        <li key={tx.id} className="p-4 hover:bg-gray-50/50 flex justify-between items-center">
                                            <div>
                                                <p className="text-sm font-semibold text-gray-800">{tx.description}</p>
                                                <p className="text-xs text-gray-400">{new Date(tx.created_at).toLocaleString()}</p>
                                            </div>
                                            <span className={`text-sm font-bold ${tx.type === 'credit' ? 'text-emerald-600' : 'text-red-600'}`}>
                                                {tx.type === 'credit' ? '+' : '-'}₹{parseFloat(tx.amount).toFixed(2)}
                                            </span>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    </div>

                    {/* Addresses */}
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                        <div className="p-4 border-b border-gray-100 bg-gray-50">
                            <h2 className="font-bold text-gray-800 flex items-center gap-2"><MapPin size={18} /> Saved Addresses</h2>
                        </div>
                        <div className="p-4 space-y-3">
                            {addresses.length === 0 ? (
                                <p className="text-sm text-gray-500 text-center">No addresses saved.</p>
                            ) : (
                                addresses.map(addr => (
                                    <div key={addr.id} className="p-3 border border-gray-100 rounded-xl bg-gray-50/30">
                                        <p className="text-sm font-medium text-gray-800">{addr.address_line}</p>
                                        {addr.landmark && <p className="text-xs text-gray-600 mt-1">Landmark: {addr.landmark}</p>}
                                        {addr.zone && <p className="text-xs text-gray-600 mt-1">Zone: {addr.zone}</p>}
                                        <p className="text-xs text-gray-500 mt-1">{addr.city} - {addr.pincode}</p>
                                        {addr.latitude && addr.longitude && (
                                            <a 
                                                href={`https://www.google.com/maps?q=${addr.latitude},${addr.longitude}`} 
                                                target="_blank" 
                                                rel="noopener noreferrer"
                                                className="text-xs text-blue-600 hover:text-blue-800 mt-2 flex items-center gap-1 font-medium transition-colors"
                                            >
                                                <MapPin size={12} />
                                                View on Map ({addr.latitude}, {addr.longitude})
                                            </a>
                                        )}
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>

                {/* Right Column: Delivery History */}
                <div className="col-span-1 lg:col-span-2">
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden h-full">
                        <div className="p-4 border-b border-gray-100 bg-gray-50">
                            <h2 className="font-bold text-gray-800 flex items-center gap-2"><Package size={18} /> Delivery History</h2>
                        </div>
                        <div className="overflow-x-auto max-h-[800px] overflow-y-auto">
                            <table className="w-full text-left border-collapse">
                                <thead className="sticky top-0 bg-gray-50">
                                    <tr className="border-b border-gray-200 shadow-sm">
                                        <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase">Date</th>
                                        <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase">Type</th>
                                        <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase">Products & Quantities</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {deliveries.length === 0 ? (
                                        <tr><td colSpan="3" className="px-6 py-8 text-center text-gray-500">No deliveries found.</td></tr>
                                    ) : (
                                        deliveries.map(del => (
                                            <tr key={del.id} className="hover:bg-gray-50/50">
                                                <td className="px-6 py-4 align-top text-sm font-medium text-gray-900">
                                                    {new Date(del.scheduled_date).toLocaleDateString()}
                                                </td>
                                                <td className="px-6 py-4 align-top">
                                                    <span className={`px-2 py-1 text-xs font-semibold rounded-full border ${del.type === 'package' ? 'bg-purple-50 text-purple-700 border-purple-200' :
                                                        del.type === 'retail' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                                                            'bg-cyan-50 text-cyan-700 border-cyan-200'
                                                        }`}>
                                                        {del.type.toUpperCase()}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 align-top">
                                                    <ul className="space-y-1">
                                                        {del.DeliveryItems?.map(item => (
                                                            <li key={item.id} className="text-sm text-gray-700 flex justify-between border-b border-gray-50 pb-1 mb-1 last:border-0 last:pb-0 last:mb-0">
                                                                <span>{item.Product?.name} ({item.Product?.hindi_name})</span>
                                                                <span className="font-semibold">{item.quantity} {item.Product?.unit}</span>
                                                            </li>
                                                        ))}
                                                    </ul>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
