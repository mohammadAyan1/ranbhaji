import { useEffect, useState } from "react";
import api from "../../api/axios";

export default function WalletPage() {
  const [wallet, setWallet] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [msg, setMsg] = useState("");

  const fetchData = async () => {
    const [w, t] = await Promise.all([api.get("/wallet"), api.get("/wallet/transactions")]);
    setWallet(w.data);
    setTransactions(t.data.transactions || []);
    setLoading(false);
  };
  useEffect(() => { fetchData(); }, []);

  const handleAddFunds = async (e) => {
    e.preventDefault();
    if (!amount || parseFloat(amount) <= 0) return;
    setAdding(true);
    try {
      const res = await api.post("/add-funds", { amount: parseFloat(amount), payment_method: "razorpay" });
      setMsg(`✅ ₹${amount} added to wallet`);
      setAmount("");
      await fetchData();
    } catch (err) { setMsg(`❌ ${err.response?.data?.message}`); }
    finally { setAdding(false); }
  };

  if (loading) return <div className="flex items-center justify-center h-64 text-gray-600">Loading wallet...</div>;

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="page-header">My Wallet 💰</h1>
        <p className="page-sub">Manage your FreshBox wallet balance</p>
      </div>

      {msg && (
        <div className={`rounded-xl px-4 py-3 text-sm ${msg.startsWith("✅") ? "bg-fresh-100/30 text-fresh-600 border border-fresh-700/50" : "bg-red-900/30 text-red-600 border border-red-700/50"}`}>
          {msg}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Balance card */}
        <div className="card bg-gradient-to-br from-fresh-900/40 to-gray-900 border-fresh-800/50 glow-green">
          <p className="text-gray-600 text-sm mb-2">Available Balance</p>
          <p className="text-5xl font-bold text-gradient mb-1">₹{parseFloat(wallet?.wallet_balance || 0).toFixed(2)}</p>
          {parseFloat(wallet?.due_amount || 0) > 0 && (
            <div className="mt-3 flex items-center gap-2">
              <span className="badge-red">Due</span>
              <span className="text-red-600 text-sm">₹{parseFloat(wallet.due_amount).toFixed(2)} pending</span>
            </div>
          )}
        </div>

        {/* Add funds */}
        <div className="card">
          <h3 className="font-semibold text-gray-900 mb-4">Add Funds</h3>
          <form onSubmit={handleAddFunds} className="space-y-3">
            <div>
              <label className="label">Amount (₹)</label>
              <input type="number" id="add-amount" className="input" placeholder="500" value={amount} onChange={e => setAmount(e.target.value)} min="1" step="1" />
            </div>
            <div className="flex flex-wrap gap-2">
              {[500, 1000, 2000, 5000].map(v => (
                <button key={v} type="button" onClick={() => setAmount(v)} className="btn-secondary text-sm py-1.5 px-3">₹{v}</button>
              ))}
            </div>
            <button type="submit" id="add-funds-btn" disabled={adding} className="btn-primary w-full">
              {adding ? "Processing..." : "Add Funds (Mock)"}
            </button>
          </form>
        </div>
      </div>

      {/* Transactions */}
      <div className="card">
        <h3 className="font-semibold text-gray-900 mb-4">Transaction History</h3>
        {transactions.length === 0 ? (
          <p className="text-center text-gray-500 py-8">No transactions yet</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="table-header">
                  <th className="text-left p-3 rounded-tl-xl">Date</th>
                  <th className="text-left p-3">Reason</th>
                  <th className="text-right p-3">Type</th>
                  <th className="text-right p-3 rounded-tr-xl">Amount</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map(tx => (
                  <tr key={tx.id} className="table-row">
                    <td className="p-3 text-gray-600">{new Date(tx.created_at).toLocaleDateString("en-IN")}</td>
                    <td className="p-3 text-gray-700">{tx.reason}</td>
                    <td className="p-3 text-right">
                      <span className={tx.type === "credit" ? "badge-green" : "badge-red"}>{tx.type}</span>
                    </td>
                    <td className={`p-3 text-right font-semibold ${tx.type === "credit" ? "text-fresh-600" : "text-red-600"}`}>
                      {tx.type === "credit" ? "+" : "-"}₹{parseFloat(tx.amount).toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
