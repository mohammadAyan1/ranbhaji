import React, { useState, useEffect, useMemo } from "react";
import {
  Wallet, Search, RefreshCw, ChevronDown, ChevronUp, ArrowDownLeft,
  ArrowUpRight, IndianRupee, Users, ShieldAlert, CheckCircle2,
  Calendar, Clock, Receipt, Image as ImageIcon, ExternalLink, X, PlusCircle, Filter
} from "lucide-react";
import api from "../../../api/axios";
import AdjustWalletModal from "../AdjustWalletModal";

export default function AdminWallets() {
  const [users, setUsers] = useState([]);
  const [stats, setStats] = useState({
    total_users_with_wallet: 0,
    total_wallet_balance: 0,
    total_credited: 0,
    total_debited: 0,
  });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("all"); // 'all', 'positive', 'due', 'has_txns'
  const [sortBy, setSortBy] = useState("recent"); // 'recent', 'balance_desc', 'balance_asc', 'txns_desc', 'name'
  const [expandedUserIds, setExpandedUserIds] = useState(new Set());
  const [previewImage, setPreviewImage] = useState(null);
  const [selectedUserForAdjust, setSelectedUserForAdjust] = useState(null);
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);

  const fetchWallets = async () => {
    setLoading(true);
    try {
      const res = await api.get("/admin/wallets");
      if (res.data?.success) {
        setUsers(res.data.users || []);
        if (res.data.stats) {
          setStats(res.data.stats);
        }
      }
    } catch (err) {
      console.error("Failed to fetch admin wallet data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWallets();
  }, []);

  // Toggle user row expansion
  const toggleExpand = (userId) => {
    setExpandedUserIds((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) {
        next.delete(userId);
      } else {
        next.add(userId);
      }
      return next;
    });
  };

  const expandAll = () => {
    const allIds = new Set(filteredUsers.map((u) => u.id));
    setExpandedUserIds(allIds);
  };

  const collapseAll = () => {
    setExpandedUserIds(new Set());
  };

  // Filter and sort users
  const filteredUsers = useMemo(() => {
    let result = [...users];

    // Search query filter
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (u) =>
          u.name?.toLowerCase().includes(q) ||
          u.phone?.toLowerCase().includes(q) ||
          u.email?.toLowerCase().includes(q)
      );
    }

    // Filter pills
    if (filterType === "positive") {
      result = result.filter((u) => u.wallet_balance > 0);
    } else if (filterType === "due") {
      result = result.filter((u) => (u.due_amount > 0 || u.postpaid_debt > 0));
    } else if (filterType === "has_txns") {
      result = result.filter((u) => u.total_transactions > 0);
    }

    // Sorting
    result.sort((a, b) => {
      if (sortBy === "recent") {
        const dateA = a.last_transaction ? new Date(a.last_transaction.created_at) : new Date(a.created_at || 0);
        const dateB = b.last_transaction ? new Date(b.last_transaction.created_at) : new Date(b.created_at || 0);
        return dateB - dateA;
      }
      if (sortBy === "balance_desc") return b.wallet_balance - a.wallet_balance;
      if (sortBy === "balance_asc") return a.wallet_balance - b.wallet_balance;
      if (sortBy === "txns_desc") return b.total_transactions - a.total_transactions;
      if (sortBy === "name") return (a.name || "").localeCompare(b.name || "");
      return 0;
    });

    return result;
  }, [users, search, filterType, sortBy]);

  const formatCurrency = (val) => {
    const num = parseFloat(val) || 0;
    return `₹${num.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "-";
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  };

  const getImageUrl = (url) => {
    if (!url) return null;
    if (url.startsWith("http://") || url.startsWith("https://")) return url;
    const base = import.meta.env.VITE_API_URL || "http://localhost:3000";
    return `${base}${url}`;
  };

  return (
    <div className="min-h-screen bg-slate-50/60 p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white shadow-md shadow-emerald-500/20">
            <Wallet size={26} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                Master Panel
              </span>
              <h1 className="text-2xl font-bold text-slate-800">Wallet Management</h1>
            </div>
            <p className="text-sm text-slate-500 mt-0.5">
              Monitor user wallet balances, credits, debits & detailed transaction histories
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchWallets}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-medium text-sm transition-all shadow-sm active:scale-95 disabled:opacity-60"
            title="Refresh data"
          >
            <RefreshCw size={16} className={loading ? "animate-spin text-emerald-600" : ""} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Summary Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Users With Wallet */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm relative overflow-hidden group hover:border-emerald-300 transition-all">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Wallet Users</p>
              <h3 className="text-2xl font-bold text-slate-800 mt-1">{stats.total_users_with_wallet}</h3>
              <p className="text-xs text-slate-500 mt-1">Users with active wallet history</p>
            </div>
            <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100 group-hover:scale-105 transition-transform">
              <Users size={22} />
            </div>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 to-indigo-500"></div>
        </div>

        {/* Card 2: Total Wallet Balance */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm relative overflow-hidden group hover:border-emerald-300 transition-all">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Balance Held</p>
              <h3 className="text-2xl font-bold text-emerald-600 mt-1">{formatCurrency(stats.total_wallet_balance)}</h3>
              <p className="text-xs text-slate-500 mt-1">Net funds in customer wallets</p>
            </div>
            <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100 group-hover:scale-105 transition-transform">
              <Wallet size={22} />
            </div>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 to-teal-500"></div>
        </div>

        {/* Card 3: Total Credited */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm relative overflow-hidden group hover:border-emerald-300 transition-all">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Inflow / Credited</p>
              <h3 className="text-2xl font-bold text-teal-700 mt-1">+{formatCurrency(stats.total_credited)}</h3>
              <p className="text-xs text-teal-600 font-medium mt-1">Added funds & refunds</p>
            </div>
            <div className="w-11 h-11 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center border border-teal-100 group-hover:scale-105 transition-transform">
              <ArrowDownLeft size={22} />
            </div>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-teal-500 to-green-500"></div>
        </div>

        {/* Card 4: Total Debited */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm relative overflow-hidden group hover:border-emerald-300 transition-all">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Outflow / Debited</p>
              <h3 className="text-2xl font-bold text-rose-600 mt-1">-{formatCurrency(stats.total_debited)}</h3>
              <p className="text-xs text-rose-500 font-medium mt-1">Orders spent & deductions</p>
            </div>
            <div className="w-11 h-11 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center border border-rose-100 group-hover:scale-105 transition-transform">
              <ArrowUpRight size={22} />
            </div>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-rose-500 to-amber-500"></div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Search */}
        <div className="relative w-full md:w-96">
          <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search user by name, phone or email..."
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X size={15} />
            </button>
          )}
        </div>

        {/* Filter Pills */}
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          <button
            onClick={() => setFilterType("all")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              filterType === "all"
                ? "bg-emerald-600 text-white shadow-sm"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            All Users ({users.length})
          </button>
          <button
            onClick={() => setFilterType("positive")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              filterType === "positive"
                ? "bg-emerald-600 text-white shadow-sm"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            Positive Balance ({users.filter((u) => u.wallet_balance > 0).length})
          </button>
          <button
            onClick={() => setFilterType("due")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              filterType === "due"
                ? "bg-rose-600 text-white shadow-sm"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            Due / Postpaid ({users.filter((u) => u.due_amount > 0 || u.postpaid_debt > 0).length})
          </button>
          <button
            onClick={() => setFilterType("has_txns")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              filterType === "has_txns"
                ? "bg-teal-600 text-white shadow-sm"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            With Transactions ({users.filter((u) => u.total_transactions > 0).length})
          </button>
        </div>

        {/* Sort & Bulk Expand Controls */}
        <div className="flex items-center gap-2 w-full md:w-auto justify-end">
          <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
            <Filter size={14} />
            <span>Sort:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            >
              <option value="recent">Recent Activity</option>
              <option value="balance_desc">Highest Balance</option>
              <option value="balance_asc">Lowest Balance</option>
              <option value="txns_desc">Most Transactions</option>
              <option value="name">Name (A-Z)</option>
            </select>
          </div>

          <div className="h-4 w-px bg-slate-200 mx-1"></div>

          <button
            onClick={expandAll}
            className="text-xs text-slate-600 hover:text-emerald-700 font-medium px-2 py-1 rounded hover:bg-slate-100"
            title="Expand all transactions"
          >
            Expand All
          </button>
          <button
            onClick={collapseAll}
            className="text-xs text-slate-600 hover:text-emerald-700 font-medium px-2 py-1 rounded hover:bg-slate-100"
            title="Collapse all transactions"
          >
            Collapse All
          </button>
        </div>
      </div>

      {/* Main Users Table with Child Dropdown for Transactions */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400">
            <RefreshCw size={36} className="animate-spin text-emerald-600 mb-3" />
            <p className="text-base font-semibold text-slate-700">Loading wallet records...</p>
            <p className="text-xs text-slate-400">Fetching user balances and transactions</p>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400">
            <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 mb-4">
              <Wallet size={32} />
            </div>
            <p className="text-lg font-bold text-slate-700">No Wallet Users Found</p>
            <p className="text-xs text-slate-400 max-w-sm text-center mt-1">
              {search || filterType !== "all"
                ? "Try clearing your search or filters to see more results."
                : "No users have performed wallet transactions or hold wallet balances yet."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-3.5 px-4 w-12 text-center">#</th>
                  <th className="py-3.5 px-4">User Information</th>
                  <th className="py-3.5 px-4 text-right">Wallet Balance</th>
                  <th className="py-3.5 px-4 text-right">Postpaid / Due</th>
                  <th className="py-3.5 px-4 text-right">Total Credited</th>
                  <th className="py-3.5 px-4 text-right">Total Debited</th>
                  <th className="py-3.5 px-4 text-center">Transactions</th>
                  <th className="py-3.5 px-4">Last Activity</th>
                  <th className="py-3.5 px-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {filteredUsers.map((user, idx) => {
                  const isExpanded = expandedUserIds.has(user.id);
                  const txns = user.transactions || [];

                  return (
                    <React.Fragment key={user.id}>
                      {/* Parent User Row */}
                      <tr
                        onClick={() => toggleExpand(user.id)}
                        className={`cursor-pointer transition-colors hover:bg-emerald-50/40 ${
                          isExpanded ? "bg-emerald-50/30 font-medium" : "bg-white"
                        }`}
                      >
                        {/* Serial Number & Expand Indicator */}
                        <td className="py-4 px-4 text-center">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleExpand(user.id);
                            }}
                            className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all ${
                              isExpanded
                                ? "bg-emerald-600 text-white shadow-sm"
                                : "bg-slate-100 text-slate-600 hover:bg-emerald-100 hover:text-emerald-700"
                            }`}
                            title={isExpanded ? "Click to collapse" : "Click to view transactions"}
                          >
                            {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                          </button>
                        </td>

                        {/* User Details */}
                        <td className="py-4 px-4">
                          <div className="flex flex-col">
                            <span className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
                              {user.name || "Unnamed User"}
                              {user.status === "active" ? (
                                <span className="inline-block w-2 h-2 rounded-full bg-emerald-500" title="Active"></span>
                              ) : (
                                <span className="inline-block w-2 h-2 rounded-full bg-slate-300" title="Inactive"></span>
                              )}
                            </span>
                            <span className="text-xs text-slate-500 font-mono mt-0.5">{user.phone}</span>
                            {user.email && (
                              <span className="text-[11px] text-slate-400 truncate max-w-xs">{user.email}</span>
                            )}
                          </div>
                        </td>

                        {/* Wallet Balance */}
                        <td className="py-4 px-4 text-right">
                          <span
                            className={`font-bold text-base px-2.5 py-1 rounded-lg ${
                              user.wallet_balance > 0
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                : user.wallet_balance < 0
                                ? "bg-rose-50 text-rose-700 border border-rose-200"
                                : "bg-slate-50 text-slate-600"
                            }`}
                          >
                            {formatCurrency(user.wallet_balance)}
                          </span>
                        </td>

                        {/* Postpaid / Due Amount */}
                        <td className="py-4 px-4 text-right">
                          {user.due_amount > 0 || user.postpaid_debt > 0 ? (
                            <span className="text-xs font-semibold text-rose-600 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                              {formatCurrency(user.due_amount || user.postpaid_debt)} Due
                            </span>
                          ) : (
                            <span className="text-xs text-slate-400">₹0.00</span>
                          )}
                        </td>

                        {/* Total Credited */}
                        <td className="py-4 px-4 text-right font-medium text-teal-700">
                          {user.total_credit > 0 ? `+${formatCurrency(user.total_credit)}` : "-"}
                        </td>

                        {/* Total Debited */}
                        <td className="py-4 px-4 text-right font-medium text-rose-600">
                          {user.total_debit > 0 ? `-${formatCurrency(user.total_debit)}` : "-"}
                        </td>

                        {/* Total Transactions Count Badge */}
                        <td className="py-4 px-4 text-center">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${
                              user.total_transactions > 0
                                ? "bg-emerald-100/70 text-emerald-800"
                                : "bg-slate-100 text-slate-400"
                            }`}
                          >
                            <Receipt size={12} />
                            {user.total_transactions} txns
                          </span>
                        </td>

                        {/* Last Activity */}
                        <td className="py-4 px-4 text-xs text-slate-500">
                          {user.last_transaction ? (
                            <div>
                              <div className="font-medium text-slate-700">
                                {formatDate(user.last_transaction.created_at)}
                              </div>
                              <div className="text-[11px] text-slate-400 truncate max-w-[150px]">
                                {user.last_transaction.reason || user.last_transaction.type}
                              </div>
                            </div>
                          ) : (
                            <span className="text-slate-400 italic">No activity yet</span>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="py-4 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-center gap-1.5">
                            {/* Toggle child accordion */}
                            <button
                              onClick={() => toggleExpand(user.id)}
                              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all ${
                                isExpanded
                                  ? "bg-emerald-600 text-white"
                                  : "bg-slate-100 text-slate-700 hover:bg-emerald-50 hover:text-emerald-700"
                              }`}
                            >
                              <span>{isExpanded ? "Hide" : "View"}</span>
                              {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                            </button>

                            {/* Adjust wallet modal trigger */}
                            <button
                              onClick={() => {
                                setSelectedUserForAdjust(user);
                                setIsAdjustModalOpen(true);
                              }}
                              className="px-2.5 py-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-lg text-xs font-semibold flex items-center gap-1 border border-emerald-200 transition-all"
                              title="Add or deduct user balance"
                            >
                              <PlusCircle size={13} />
                              <span>Adjust</span>
                            </button>
                          </div>
                        </td>
                      </tr>

                      {/* Child Dropdown / Accordion: Full Wallet Transactions Details */}
                      {isExpanded && (
                        <tr className="bg-slate-50/90 border-b-2 border-emerald-500/30">
                          <td colSpan={9} className="p-0">
                            <div className="p-4 sm:p-6 bg-gradient-to-b from-emerald-50/30 via-slate-50 to-slate-100/70 border-x border-slate-200/80">
                              {/* Child Header banner */}
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 mb-4 border-b border-slate-200/80 gap-3">
                                <div>
                                  <div className="flex items-center gap-2">
                                    <Receipt size={18} className="text-emerald-700" />
                                    <h4 className="text-base font-bold text-slate-800">
                                      Transaction History for {user.name}
                                    </h4>
                                    <span className="text-xs bg-slate-200 text-slate-700 font-mono px-2 py-0.5 rounded">
                                      {user.phone}
                                    </span>
                                  </div>
                                  <p className="text-xs text-slate-500 mt-0.5">
                                    Showing all {txns.length} credit & debit transactions in reverse chronological order
                                  </p>
                                </div>

                                <div className="flex items-center gap-2 text-xs">
                                  <div className="bg-white border border-emerald-200 rounded-lg px-3 py-1.5 shadow-2xs">
                                    <span className="text-slate-400 mr-1.5">Total Credited:</span>
                                    <span className="font-bold text-emerald-700">+{formatCurrency(user.total_credit)}</span>
                                  </div>
                                  <div className="bg-white border border-rose-200 rounded-lg px-3 py-1.5 shadow-2xs">
                                    <span className="text-slate-400 mr-1.5">Total Debited:</span>
                                    <span className="font-bold text-rose-600">-{formatCurrency(user.total_debit)}</span>
                                  </div>
                                </div>
                              </div>

                              {/* Child Transaction Table */}
                              {txns.length === 0 ? (
                                <div className="bg-white rounded-xl p-8 text-center border border-dashed border-slate-300">
                                  <Wallet size={28} className="mx-auto text-slate-300 mb-2" />
                                  <p className="text-sm font-semibold text-slate-600">No Transactions Recorded</p>
                                  <p className="text-xs text-slate-400 mt-1">
                                    This user currently has a wallet balance of {formatCurrency(user.wallet_balance)}, but no transaction receipts are logged.
                                  </p>
                                  <button
                                    onClick={() => {
                                      setSelectedUserForAdjust(user);
                                      setIsAdjustModalOpen(true);
                                    }}
                                    className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 text-white text-xs font-semibold rounded-lg hover:bg-emerald-700 transition-colors"
                                  >
                                    <PlusCircle size={14} />
                                    <span>Add Funds / Transaction</span>
                                  </button>
                                </div>
                              ) : (
                                <div className="bg-white rounded-xl border border-slate-200/90 shadow-sm overflow-hidden">
                                  <table className="w-full text-left border-collapse text-xs">
                                    <thead>
                                      <tr className="bg-slate-100/80 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
                                        <th className="py-3 px-4">Date & Time</th>
                                        <th className="py-3 px-4">Type</th>
                                        <th className="py-3 px-4 text-right">Amount</th>
                                        <th className="py-3 px-4">Reason / Description</th>
                                        <th className="py-3 px-4">Reference ID</th>
                                        <th className="py-3 px-4 text-center">Receipt Proof</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                      {txns.map((t, tIdx) => {
                                        const isCredit = t.type === "credit";
                                        return (
                                          <tr key={t.id || tIdx} className="hover:bg-slate-50/70 transition-colors">
                                            {/* Date & Time */}
                                            <td className="py-3 px-4 font-medium text-slate-700 whitespace-nowrap">
                                              <div className="flex items-center gap-1.5">
                                                <Calendar size={13} className="text-slate-400" />
                                                <span>{formatDate(t.created_at)}</span>
                                              </div>
                                            </td>

                                            {/* Type Badge */}
                                            <td className="py-3 px-4">
                                              <span
                                                className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-bold uppercase text-[10px] tracking-wide ${
                                                  isCredit
                                                    ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                                                    : "bg-rose-100 text-rose-800 border border-rose-200"
                                                }`}
                                              >
                                                {isCredit ? (
                                                  <>
                                                    <ArrowDownLeft size={11} /> Credit
                                                  </>
                                                ) : (
                                                  <>
                                                    <ArrowUpRight size={11} /> Debit
                                                  </>
                                                )}
                                              </span>
                                            </td>

                                            {/* Amount */}
                                            <td className="py-3 px-4 text-right font-bold text-sm whitespace-nowrap">
                                              <span className={isCredit ? "text-emerald-700" : "text-rose-600"}>
                                                {isCredit ? "+" : "-"}
                                                {formatCurrency(t.amount)}
                                              </span>
                                            </td>

                                            {/* Reason */}
                                            <td className="py-3 px-4 text-slate-700 max-w-xs">
                                              <span className="font-medium">{t.reason || "Wallet transaction"}</span>
                                            </td>

                                            {/* Reference ID */}
                                            <td className="py-3 px-4 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                                              {t.reference_id ? (
                                                <span className="bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                                                  {t.reference_id}
                                                </span>
                                              ) : (
                                                <span className="text-slate-400">-</span>
                                              )}
                                            </td>

                                            {/* Proof / Photo Receipt */}
                                            <td className="py-3 px-4 text-center">
                                              {t.photo_url ? (
                                                <button
                                                  type="button"
                                                  onClick={() => setPreviewImage(getImageUrl(t.photo_url))}
                                                  className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-100 hover:bg-emerald-50 text-slate-700 hover:text-emerald-700 rounded border border-slate-200 text-[11px] font-medium transition-all"
                                                >
                                                  <ImageIcon size={12} />
                                                  <span>View Proof</span>
                                                </button>
                                              ) : (
                                                <span className="text-slate-400 italic text-[11px]">None</span>
                                              )}
                                            </td>
                                          </tr>
                                        );
                                      })}
                                    </tbody>
                                  </table>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Image Preview Modal */}
      {previewImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4 animate-fadeIn"
          onClick={() => setPreviewImage(null)}
        >
          <div
            className="bg-white rounded-2xl max-w-2xl w-full p-4 overflow-hidden relative shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 mb-3">
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <ImageIcon size={16} className="text-emerald-600" />
                Transaction Receipt / Payment Proof
              </h3>
              <button
                onClick={() => setPreviewImage(null)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 transition-colors"
              >
                <X size={16} />
              </button>
            </div>
            <div className="flex items-center justify-center max-h-[75vh] overflow-auto rounded-xl bg-slate-900/5 p-2">
              <img
                src={previewImage}
                alt="Payment proof receipt"
                className="max-h-[70vh] w-auto object-contain rounded-lg shadow-sm"
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.src = "https://placehold.co/600x400?text=Receipt+Not+Found";
                }}
              />
            </div>
            <div className="mt-3 flex justify-between items-center text-xs text-slate-500">
              <a
                href={previewImage}
                target="_blank"
                rel="noreferrer"
                className="text-emerald-600 hover:underline inline-flex items-center gap-1 font-semibold"
              >
                Open in new tab <ExternalLink size={12} />
              </a>
              <button
                onClick={() => setPreviewImage(null)}
                className="px-4 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-medium transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Adjust User Wallet Modal */}
      {selectedUserForAdjust && (
        <AdjustWalletModal
          isOpen={isAdjustModalOpen}
          onClose={() => {
            setIsAdjustModalOpen(false);
            setSelectedUserForAdjust(null);
          }}
          user={selectedUserForAdjust}
          onSuccess={() => {
            fetchWallets();
          }}
        />
      )}
    </div>
  );
}
