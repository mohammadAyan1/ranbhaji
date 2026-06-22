import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../../api/axios";

export default function MySubscriptions() {
  const [subs, setSubs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");
  const [expandedId, setExpandedId] = useState(null);

  // Pause Configuration Modal state
  const [pausingSub, setPausingSub] = useState(null);
  const [pauseType, setPauseType] = useState("monthly");
  const [daysToPause, setDaysToPause] = useState(5);
  const [pauseScope, setPauseScope] = useState("single");
  const [pausingMsg, setPausingMsg] = useState("");
  const [pausingLoader, setPausingLoader] = useState(false);

  // Seasonal edit state
  const [editingSub, setEditingSub] = useState(null);
  const [seasonalPool, setSeasonalPool] = useState([]);
  const [maxSelectCount, setMaxSelectCount] = useState(0);
  const [selectedItems, setSelectedItems] = useState({});
  const [savingSeasonal, setSavingSeasonal] = useState(false);
  const [seasonalMsg, setSeasonalMsg] = useState("");
  const [seasonalBudget, setSeasonalBudget] = useState(0);
  const [fixedItems, setFixedItems] = useState([]); // [{ product_id, qty_gm, Product }]
  const [perServiceAmount, setPerServiceAmount] = useState(0);

  // Resume state
  const [resumingSub, setResumingSub] = useState(null);
  const [resumeDates, setResumeDates] = useState([]);
  const [selectedResumeDate, setSelectedResumeDate] = useState("");
  const [confirmingResume, setConfirmingResume] = useState(false);
  const [resumeMsg, setResumeMsg] = useState("");

  // Per-schedule seasonal selection states
  const [scheduleSub, setScheduleSub] = useState(null);
  const [upcomingSchedules, setUpcomingSchedules] = useState([]);
  const [schedulesPool, setSchedulesPool] = useState([]);
  const [schedulesFixedItems, setSchedulesFixedItems] = useState([]); // default fixed items
  const [editingScheduleFixedItems, setEditingScheduleFixedItems] = useState({}); // custom fixed items per schedule { product_id: qty_gm }
  const [schedulesMaxCount, setSchedulesMaxCount] = useState(0);
  const [schedulesBudget, setSchedulesBudget] = useState(0);
  const [schedulesPerServiceAmount, setSchedulesPerServiceAmount] = useState(0);
  const [schedulesFixedCost, setSchedulesFixedCost] = useState(0);
  const [selectedScheduleItems, setSelectedScheduleItems] = useState({}); // { product_id: qty_gm }
  const [activeScheduleId, setActiveScheduleId] = useState(null);
  const [savingScheduleSelection, setSavingScheduleSelection] = useState(false);
  const [scheduleSelectionMsg, setScheduleSelectionMsg] = useState("");
  const [loadingSchedules, setLoadingSchedules] = useState(false);

  const fetchSubs = () => {
    setLoading(true);
    api.get("/my-subscriptions")
      .then(r => setSubs(r.data.subscriptions || []))
      .finally(() => setLoading(false));
  };
  useEffect(fetchSubs, []);

  const handleConfirmPause = async () => {
    setPausingLoader(true);
    setPausingMsg("");
    try {
      const res = await api.patch(`/subscriptions/${pausingSub.id}/pause`, {
        pause_days: parseInt(daysToPause),
        pause_type: pauseType,
        pause_scope: pauseScope
      });
      setMsg(`✅ ${res.data.message || "Package(s) paused successfully"}`);
      setPausingSub(null);
      fetchSubs();
    } catch (err) {
      setPausingMsg(`❌ ${err.response?.data?.message || "Failed to pause subscription"}`);
    } finally {
      setPausingLoader(false);
    }
  };

  const startResumeFlow = async (sub) => {
    setResumingSub(sub);
    setSelectedResumeDate("");
    setResumeMsg("");
    setResumeDates([]);
    try {
      const datesRes = await api.get(`/available-dates?package_id=${sub.package_id}`);
      setResumeDates(datesRes.data.available_dates || []);
    } catch (err) {
      setResumeMsg(`❌ Failed to load suggested dates: ${err.response?.data?.message}`);
    }
  };

  const handleConfirmResume = async () => {
    if (!selectedResumeDate) {
      setResumeMsg("❌ Please select a restart date");
      return;
    }
    setConfirmingResume(true);
    setResumeMsg("");
    try {
      await api.patch(`/subscriptions/${resumingSub.id}/restart`, { restart_date: selectedResumeDate });
      setMsg("✅ Subscription resumed successfully!");
      setResumingSub(null);
      fetchSubs();
    } catch (err) {
      setResumeMsg(`❌ ${err.response?.data?.message || "Failed to resume subscription"}`);
    } finally {
      setConfirmingResume(false);
    }
  };

  const handleCancel = async (id) => {
    if (!confirm("Are you sure you want to cancel this subscription?")) return;
    setMsg("");
    try {
      await api.patch(`/subscriptions/${id}/cancel`);
      setMsg("✅ Subscription cancelled");
      fetchSubs();
    } catch (err) { setMsg(`❌ ${err.response?.data?.message}`); }
  };

  // Load seasonal editing for a subscription
  const openSeasonalEdit = async (sub) => {
    setSeasonalMsg("");
    try {
      const res = await api.get(`/seasonal-options/${sub.id}`);
      setSeasonalPool(res.data.seasonal_pool || []);
      setMaxSelectCount(res.data.max_select_count || 0);
      setSeasonalBudget(res.data.seasonal_budget || 0);
      setPerServiceAmount(res.data.per_service_amount || 0);
      setFixedItems(res.data.fixed_items || []);

      // Pre-fill existing seasonal items
      const existing = {};
      sub.Items?.filter(i => i.is_seasonal).forEach(i => {
        existing[i.product_id] = i.qty_gm;
      });
      setSelectedItems(existing);
      setEditingSub(sub);
    } catch (err) { setMsg(`❌ ${err.response?.data?.message}`); }
  };

  const handleSaveSeasonal = async () => {
    if (isOverBudget) {
      alert("Budget exceeded! Please reduce product quantities.");
      return;
    }
    setSavingSeasonal(true);
    setSeasonalMsg("");
    const items = Object.entries(selectedItems)
      .filter(([, qty]) => parseFloat(qty) > 0)
      .map(([product_id, qty_gm]) => ({ product_id: parseInt(product_id), qty_gm: parseFloat(qty_gm) }));

    const fixed = fixedItems.map(fi => ({
      product_id: fi.product_id,
      qty_gm: parseFloat(fi.qty_gm) || 50
    }));

    try {
      await api.patch("/update-seasonal", {
        subscription_id: editingSub.id,
        items,
        fixed_items: fixed
      });
      setSeasonalMsg("✅ Plan customized successfully!");
      setEditingSub(null);
      fetchSubs();
    } catch (err) { setSeasonalMsg(`❌ ${err.response?.data?.message}`); }
    finally { setSavingSeasonal(false); }
  };

  const openScheduleSelection = async (sub) => {
    setScheduleSub(sub);
    setLoadingSchedules(true);
    setScheduleSelectionMsg("");
    setActiveScheduleId(null);
    setSelectedScheduleItems({});
    setEditingScheduleFixedItems({});
    try {
      const res = await api.get(`/subscriptions/${sub.id}/upcoming-selections`);
      setUpcomingSchedules(res.data.schedules || []);
      setSchedulesPool(res.data.seasonal_pool || []);
      setSchedulesFixedItems(res.data.fixed_items || []);
      setSchedulesMaxCount(res.data.max_select_count || 0);
      setSchedulesBudget(res.data.seasonal_budget || 0);
      setSchedulesPerServiceAmount(res.data.per_service_amount || 0);
      setSchedulesFixedCost(res.data.fixed_cost_per_service || 0);
    } catch (err) {
      setMsg(`❌ Failed to load upcoming schedules: ${err.response?.data?.message || err.message}`);
      setScheduleSub(null);
    } finally {
      setLoadingSchedules(false);
    }
  };

  const startEditSchedule = (schedule) => {
    setActiveScheduleId(schedule.id);
    setScheduleSelectionMsg("");
    const fixedIds = schedulesFixedItems.map(f => f.product_id);

    const customFixed = {};
    schedulesFixedItems.forEach(f => {
      const found = schedule.selections.find(sel => sel.product_id === f.product_id);
      customFixed[f.product_id] = found ? parseFloat(found.qty_gm) : parseFloat(f.qty_gm);
    });
    setEditingScheduleFixedItems(customFixed);

    const customSeasonal = {};
    schedule.selections.forEach(sel => {
      if (!fixedIds.includes(sel.product_id)) {
        customSeasonal[sel.product_id] = parseFloat(sel.qty_gm);
      }
    });
    setSelectedScheduleItems(customSeasonal);
  };

  const handleSaveScheduleSelection = async (scheduleId) => {
    if (isActiveOverBudget) {
      alert("Budget exceeded! Please reduce product quantities.");
      return;
    }
    setSavingScheduleSelection(true);
    setScheduleSelectionMsg("");
    const items = Object.entries(selectedScheduleItems)
      .filter(([, qty]) => parseFloat(qty) > 0)
      .map(([product_id, qty_gm]) => ({ product_id: parseInt(product_id), qty_gm: parseFloat(qty_gm) }));

    const fixedItemsList = Object.entries(editingScheduleFixedItems)
      .map(([product_id, qty_gm]) => ({ product_id: parseInt(product_id), qty_gm: parseFloat(qty_gm) }));

    const invalidFixed = fixedItemsList.find(fi => fi.qty_gm <= 0);
    if (invalidFixed) {
      setScheduleSelectionMsg("❌ Fixed item quantity must be greater than 0");
      setSavingScheduleSelection(false);
      return;
    }

    try {
      const res = await api.post(`/subscriptions/${scheduleSub.id}/schedule-seasonal`, {
        schedule_id: scheduleId,
        items,
        fixed_items: fixedItemsList
      });
      setScheduleSelectionMsg("✅ Selections saved for this date!");
      setActiveScheduleId(null);

      // Refresh selections
      const updatedRes = await api.get(`/subscriptions/${scheduleSub.id}/upcoming-selections`);
      setUpcomingSchedules(updatedRes.data.schedules || []);
    } catch (err) {
      setScheduleSelectionMsg(`❌ ${err.response?.data?.message || "Failed to save picks"}`);
    } finally {
      setSavingScheduleSelection(false);
    }
  };

  const activeFixedCost = Object.entries(editingScheduleFixedItems).reduce((sum, [pid, qty]) => {
    const fi = schedulesFixedItems.find(item => item.product_id === parseInt(pid));
    if (fi && fi.Product) {
      return sum + (parseFloat(qty || 0) * parseFloat(fi.Product.purchase_price_per_gm || 0));
    }
    return sum;
  }, 0);

  const activeSeasonalCost = Object.entries(selectedScheduleItems).reduce((sum, [pid, qty]) => {
    const sp = schedulesPool.find(item => item.product_id === parseInt(pid));
    if (sp && sp.Product) {
      return sum + (parseFloat(qty || 0) * parseFloat(sp.Product.purchase_price_per_gm || 0));
    }
    return sum;
  }, 0);

  const activeTotalCost = activeFixedCost + activeSeasonalCost;
  const activeRemainingBudget = schedulesPerServiceAmount - activeTotalCost;
  const isActiveOverBudget = activeTotalCost > schedulesPerServiceAmount;
  const activeSelectedCount = Object.values(selectedScheduleItems).filter(v => parseFloat(v) > 0).length;

  const selectedCount = Object.values(selectedItems).filter(v => parseFloat(v) > 0).length;

  const fixedCost = fixedItems.reduce((sum, item) => {
    const qty = parseFloat(item.qty_gm || 0);
    return sum + (qty * parseFloat(item.Product?.purchase_price_per_gm || 0));
  }, 0);

  const seasonalCost = Object.entries(selectedItems).reduce((sum, [pid, qty]) => {
    const sp = seasonalPool.find(item => item.product_id === parseInt(pid));
    if (sp && sp.Product) {
      return sum + (parseFloat(qty || 0) * parseFloat(sp.Product.purchase_price_per_gm || 0));
    }
    return sum;
  }, 0);

  const totalCost = fixedCost + seasonalCost;
  const remainingBudget = perServiceAmount - totalCost;
  const isOverBudget = totalCost > perServiceAmount;

  const updateFixedQty = (productId, value) => {
    setFixedItems(fixedItems.map(fi => {
      if (fi.product_id === productId) {
        return { ...fi, qty_gm: value };
      }
      return fi;
    }));
  };

  const updateScheduleFixedQty = (productId, value) => {
    setEditingScheduleFixedItems(prev => ({
      ...prev,
      [productId]: value
    }));
  };

  const statusBadge = (s) => {
    const map = { active: "badge-green", paused: "badge-yellow", cancelled: "badge-red", completed: "badge-blue" };
    return <span className={`${map[s] || "badge-gray"} badge`}>{s}</span>;
  };

  if (loading) return <div className="flex items-center justify-center h-64 text-gray-400">Loading subscriptions...</div>;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-header">My Subscriptions 🔄</h1>
          <p className="page-sub">Manage your active and past subscriptions</p>
        </div>
        <Link to="/packages" className="btn-primary text-sm py-2 px-4">+ New Subscription</Link>
      </div>

      {msg && (
        <div className={`rounded-xl px-4 py-3 text-sm ${msg.startsWith("✅") ? "bg-fresh-900/30 text-fresh-400 border border-fresh-700/50" : "bg-red-900/30 text-red-400 border border-red-700/50"}`}>
          {msg}
        </div>
      )}

      {/* Seasonal Edit Modal */}
      {editingSub && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto animate-slide-up space-y-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-bold text-white text-lg">Customize Plan Items</h3>
              <button onClick={() => setEditingSub(null)} className="text-gray-400 hover:text-white text-2xl leading-none">&times;</button>
            </div>
            <p className="text-gray-400 text-xs">
              Modify the quantities of fixed products or adjust your seasonal item selections within your budget.
            </p>

            {/* Live Budget Tracking Box */}
            {isOverBudget && (
              <div className="p-4 border rounded-xl text-sm border-red-500/50 bg-red-950/20 text-red-200">
                <p className="text-xs text-red-400 font-medium mt-1">
                  ⚠️ Limit exceeded. Please reduce product quantities.
                </p>
              </div>
            )}

            {seasonalMsg && (
              <div className={`rounded-xl px-4 py-3 text-sm ${seasonalMsg.startsWith("✅") ? "bg-fresh-900/30 text-fresh-400 border border-fresh-700/50" : "bg-red-900/30 text-red-400 border border-red-700/50"}`}>
                {seasonalMsg}
              </div>
            )}

            {/* 1. Customize Fixed Items */}
            <div className="space-y-3">
              <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">1. Fixed Items</h4>
              <div className="space-y-2">
                {fixedItems.map(fi => {
                  const qty = fi.qty_gm;
                  const itemCost = parseFloat(qty || 0) * parseFloat(fi.Product?.purchase_price_per_gm || 0);

                  return (
                    <div key={fi.product_id} className="rounded-xl p-3 border border-gray-800 bg-gray-850/20">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="font-medium text-white text-sm">{fi.Product?.name}</p>
                          <p className="text-[10px] text-gray-500 capitalize">
                            Fixed Item
                          </p>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <div className="flex items-center gap-1">
                            <input
                              type="number"
                              min="50"
                              step="50"
                              value={qty}
                              onChange={e => updateFixedQty(fi.product_id, e.target.value)}
                              className="input w-24 py-1 text-sm text-center"
                              required
                            />
                            <span className="text-gray-500 text-xs">{fi.Product?.unit || "gm"}</span>
                          </div>
                          {(() => {
                            const maxAddable = remainingBudget > 0 && fi.Product?.purchase_price_per_gm ? Math.floor(remainingBudget / (parseFloat(fi.Product.purchase_price_per_gm) * 50)) * 50 : 0;
                            return maxAddable >= 50 ? (
                              <button
                                type="button"
                                onClick={() => updateFixedQty(fi.product_id, parseFloat(qty || 0) + maxAddable)}
                                className="text-[10px] text-fresh-400 hover:text-fresh-300 bg-fresh-950/40 border border-fresh-800/30 px-2 py-0.5 rounded-lg cursor-pointer transition-all"
                              >
                                💡 {maxAddable}g add kar sakte ho
                              </button>
                            ) : null;
                          })()}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 2. Pick Seasonal Items */}
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">2. Seasonal Items</h4>
                <span className="text-gray-400 text-xs">Selected: {selectedCount} / {maxSelectCount}</span>
              </div>
              <div className="space-y-2">
                {seasonalPool.map(sp => {
                  const pid = sp.product_id;
                  const isSelected = parseFloat(selectedItems[pid] || 0) > 0;
                  const qty = selectedItems[pid] || "";
                  const itemCost = isSelected ? parseFloat(qty || 0) * parseFloat(sp.Product?.purchase_price_per_gm || 0) : 0;

                  return (
                    <div key={sp.id} className={`rounded-xl p-3 border transition-all ${isSelected ? "border-fresh-600/50 bg-fresh-900/20" : "border-gray-700 bg-gray-800/30"}`}>
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          id={`edit-chk-${pid}`}
                          checked={isSelected}
                          onChange={e => {
                            if (!e.target.checked) {
                              const updated = { ...selectedItems }; delete updated[pid]; setSelectedItems(updated);
                            } else {
                              if (selectedCount >= maxSelectCount) { setSeasonalMsg(`❌ Max ${maxSelectCount} items allowed`); return; }
                              setSeasonalMsg("");
                              setSelectedItems({ ...selectedItems, [pid]: 100 });
                            }
                          }}
                          className="w-4 h-4 accent-green-500"
                        />
                        <label htmlFor={`edit-chk-${pid}`} className="flex-1 cursor-pointer">
                          <p className="font-medium text-white text-sm">{sp.Product?.name}</p>
                          <p className="text-xs text-gray-500 capitalize">
                            {sp.Product?.category}
                          </p>
                        </label>
                        {isSelected && (
                          <div className="flex flex-col items-end gap-1">
                            <div className="flex items-center gap-1.5">
                              <input
                                type="number" min="50" max="5000" step="50"
                                value={qty}
                                onChange={e => setSelectedItems({ ...selectedItems, [pid]: e.target.value })}
                                className="input w-24 py-1 text-sm text-center"
                                required
                              />
                              <span className="text-gray-500 text-xs">{sp.Product?.unit}</span>
                            </div>
                            {(() => {
                              const maxAddable = remainingBudget > 0 && sp.Product?.purchase_price_per_gm ? Math.floor(remainingBudget / (parseFloat(sp.Product.purchase_price_per_gm) * 50)) * 50 : 0;
                              return maxAddable >= 50 ? (
                                <button
                                  type="button"
                                  onClick={() => setSelectedItems({ ...selectedItems, [pid]: parseFloat(qty || 0) + maxAddable })}
                                  className="text-[10px] text-fresh-400 hover:text-fresh-300 bg-fresh-950/40 border border-fresh-800/30 px-2 py-0.5 rounded-lg cursor-pointer transition-all"
                                >
                                  💡 {maxAddable}g add kar sakte ho
                                </button>
                              ) : null;
                            })()}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
                {seasonalPool.length === 0 && <p className="text-center text-gray-500 py-4">No seasonal options for this package.</p>}
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button onClick={handleSaveSeasonal} disabled={savingSeasonal} className="btn-primary flex-1">
                {savingSeasonal ? "Saving..." : "✅ Save Changes"}
              </button>
              <button onClick={() => setEditingSub(null)} className="btn-secondary">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Pause Configuration Modal */}
      {pausingSub && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 w-full max-w-md animate-slide-up space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-white text-lg font-gradient">Pause Subscription ⏸</h3>
              <button onClick={() => setPausingSub(null)} className="text-gray-400 hover:text-white text-2xl leading-none">&times;</button>
            </div>

            {pausingMsg && (
              <div className="rounded-xl px-4 py-3 text-sm bg-red-900/30 text-red-400 border border-red-700/50">
                {pausingMsg}
              </div>
            )}

            <div className="space-y-3">
              <div>
                <label className="label">Pause Plan Type</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => { setPauseType("monthly"); setDaysToPause(5); }}
                    className={`py-2 px-3 text-xs font-semibold rounded-xl border transition-all ${pauseType === "monthly" ? "border-fresh-500 bg-fresh-900/40 text-fresh-400" : "border-gray-800 text-gray-400 hover:border-gray-700"}`}
                  >
                    📅 Monthly Pause
                    <span className="block text-[10px] text-gray-500 font-normal mt-0.5">Max 15 days total</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => { setPauseType("yearly"); setDaysToPause(10); }}
                    className={`py-2 px-3 text-xs font-semibold rounded-xl border transition-all ${pauseType === "yearly" ? "border-fresh-500 bg-fresh-900/40 text-fresh-400" : "border-gray-800 text-gray-400 hover:border-gray-700"}`}
                  >
                    🏆 Yearly Pause
                    <span className="block text-[10px] text-gray-500 font-normal mt-0.5">Max 45 days (once a year)</span>
                  </button>
                </div>
              </div>

              <div>
                <label className="label">Pause Duration (Days)</label>
                <input
                  type="number"
                  min="1"
                  max={pauseType === "monthly" ? 15 : 45}
                  className="input"
                  value={daysToPause}
                  onChange={e => setDaysToPause(e.target.value)}
                  required
                />
                <p className="text-[10px] text-gray-500 mt-1">
                  {pauseType === "monthly"
                    ? "Allows multiple pauses as long as total doesn't exceed 15 days this cycle."
                    : "⚠️ Can only be paused once per year. Any unused days of the 45-day limit will be forfeited."}
                </p>
              </div>

              <div>
                <label className="label">Apply To</label>
                <select
                  className="input text-sm"
                  value={pauseScope}
                  onChange={e => setPauseScope(e.target.value)}
                >
                  <option value="single">Only this package ({pausingSub.Package?.name})</option>
                  <option value="all">All active packages (Standard & Water plans)</option>
                </select>
              </div>
            </div>

            <div className="flex gap-3 pt-4 border-t border-gray-800">
              <button
                onClick={handleConfirmPause}
                disabled={pausingLoader || !daysToPause}
                className="btn-primary flex-1 py-2"
              >
                {pausingLoader ? "Pausing..." : "Confirm Pause"}
              </button>
              <button type="button" onClick={() => setPausingSub(null)} className="btn-secondary py-2">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Resume Date Modal */}
      {resumingSub && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 w-full max-w-md animate-slide-up">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-white text-lg font-gradient">Resume Delivery 📅</h3>
              <button onClick={() => setResumingSub(null)} className="text-gray-400 hover:text-white text-2xl leading-none">&times;</button>
            </div>
            <p className="text-gray-400 text-sm mb-4">
              Choose a start date to resume your deliveries. The suggested dates are synchronized with other deliveries of this package type.
            </p>

            {resumeMsg && (
              <div className="rounded-xl px-4 py-3 text-sm mb-4 bg-red-900/30 text-red-400 border border-red-700/50">
                {resumeMsg}
              </div>
            )}

            {resumeDates.length > 0 ? (
              <div className="grid grid-cols-2 gap-3 mb-6">
                {resumeDates.map(date => {
                  const d = new Date(date);
                  const dayName = d.toLocaleDateString("en-IN", { weekday: "long" });
                  const formatted = d.toLocaleDateString("en-IN", { day: "numeric", month: "long" });
                  return (
                    <button
                      key={date}
                      type="button"
                      onClick={() => setSelectedResumeDate(date)}
                      className={`p-3 rounded-xl border text-left transition-all duration-200 ${selectedResumeDate === date
                        ? "border-fresh-500 bg-fresh-900/40 text-fresh-400"
                        : "border-gray-700 bg-gray-800/50 text-gray-300 hover:border-gray-600"
                        }`}
                    >
                      <p className="font-semibold text-sm">{dayName}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{formatted}</p>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="mb-6">
                <label className="label">Select custom restart date</label>
                <input
                  type="date"
                  className="input"
                  min={new Date(Date.now() + 86400000).toISOString().split("T")[0]}
                  value={selectedResumeDate}
                  onChange={e => setSelectedResumeDate(e.target.value)}
                  required
                />
              </div>
            )}

            <div className="flex gap-3">
              <button
                type="button"
                onClick={handleConfirmResume}
                disabled={!selectedResumeDate || confirmingResume}
                className="btn-primary flex-1"
              >
                {confirmingResume ? "Resuming..." : "Confirm Resume & Continue →"}
              </button>
              <button type="button" onClick={() => setResumingSub(null)} className="btn-secondary">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Schedule Seasonal Selection Modal */}
      {scheduleSub && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto animate-slide-up space-y-4">
            <div className="flex items-center justify-between mb-2">
              <div>
                <h3 className="font-bold text-white text-lg font-gradient">🥦 Select Seasonal Sabji</h3>
                <p className="text-gray-400 text-xs mt-0.5">Choose seasonal vegetables for each upcoming delivery service of {scheduleSub.Package?.name}</p>
              </div>
              <button onClick={() => setScheduleSub(null)} className="text-gray-400 hover:text-white text-2xl leading-none">&times;</button>
            </div>

            {loadingSchedules ? (
              <div className="flex items-center justify-center h-48 text-gray-400">Loading delivery dates...</div>
            ) : (
              <div className="space-y-4">
                {scheduleSelectionMsg && (
                  <div className={`rounded-xl px-4 py-3 text-sm ${scheduleSelectionMsg.startsWith("✅") ? "bg-fresh-900/30 text-fresh-400 border border-fresh-700/50" : "bg-red-900/30 text-red-400 border border-red-700/50"}`}>
                    {scheduleSelectionMsg}
                  </div>
                )}

                <div className="space-y-3">
                  {upcomingSchedules.length === 0 ? (
                    <p className="text-center text-gray-500 py-6">No upcoming pending deliveries found for this subscription.</p>
                  ) : (
                    upcomingSchedules.map(schedule => {
                      const isEditing = activeScheduleId === schedule.id;
                      const hasSelections = schedule.selections.length > 0;
                      const dateObj = new Date(schedule.scheduled_date);
                      const formattedDate = dateObj.toLocaleDateString("en-IN", { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

                      return (
                        <div key={schedule.id} className="border border-gray-800 rounded-xl p-4 bg-gray-950/20 space-y-3">
                          <div className="flex items-start justify-between">
                            <div>
                              <p className="font-semibold text-white text-sm">{formattedDate}</p>
                              <div className="flex flex-wrap gap-2 mt-1">
                                {schedule.is_window_open ? (
                                  <span className="badge badge-green text-[10px]">⏳ Open for changes</span>
                                ) : (
                                  <span className="badge badge-red text-[10px]">🔒 Locked (Past 8 PM before delivery)</span>
                                )}
                                {hasSelections ? (
                                  <span className="badge badge-blue text-[10px]">✅ Selected</span>
                                ) : (
                                  <span className="badge badge-gray text-[10px]">⏳ No selection yet (Will auto-fill)</span>
                                )}
                              </div>
                            </div>

                            {schedule.is_window_open && !isEditing && (
                              <button
                                onClick={() => startEditSchedule(schedule)}
                                className="btn-primary text-xs py-1.5 px-3"
                              >
                                {hasSelections ? "✏️ Edit Picks" : "🥦 Select Sabji"}
                              </button>
                            )}
                          </div>

                          {/* Display selected items when not editing */}
                          {!isEditing && (
                            <div className="bg-gray-900/50 rounded-xl p-3 border border-gray-800/50">
                              <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider mb-1.5">Tomorrow's picks / default preferences:</p>
                              {hasSelections ? (
                                <div className="flex flex-wrap gap-1.5">
                                  {schedule.selections.map(sel => (
                                    <span key={sel.id} className="bg-fresh-950/40 border border-fresh-800/50 text-fresh-400 text-xs px-2 py-0.5 rounded-lg">
                                      {sel.Product?.name} ({parseFloat(sel.qty_gm)}{sel.Product?.unit})
                                    </span>
                                  ))}
                                </div>
                              ) : (
                                <p className="text-xs text-gray-500 italic">No per-service picks. Subscription defaults will be delivered.</p>
                              )}
                            </div>
                          )}
                          {/* Editing Area */}
                          {isEditing && (
                            <div className="border-t border-gray-800 pt-3 space-y-3 animate-fade-in">
                              <div className="text-xs text-yellow-400 font-medium">
                                ⚠️ Selection deadline: 8:00 PM on {new Date(new Date(schedule.scheduled_date).getTime() - 86400000).toLocaleDateString("en-IN", { day: 'numeric', month: 'long' })}
                              </div>

                              {/* Budget Status */}
                              {isActiveOverBudget && (
                                <div className="p-3 border rounded-xl text-xs border-red-500/50 bg-red-950/20 text-red-200">
                                  <p className="text-xs text-red-400 font-medium mt-1">
                                    ⚠️ Limit exceeded. Please reduce product quantities.
                                  </p>
                                </div>
                              )}

                              {/* 1. Customize Fixed Items */}
                              <div className="space-y-2">
                                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">1. Fixed Items (Cannot be removed, adjust quantity)</p>
                                <div className="space-y-2">
                                  {schedulesFixedItems.map(fi => {
                                    const qty = editingScheduleFixedItems[fi.product_id] || fi.qty_gm;
                                    const itemCost = parseFloat(qty || 0) * parseFloat(fi.Product?.purchase_price_per_gm || 0);

                                    return (
                                      <div key={fi.product_id} className="rounded-xl p-3 border border-gray-800 bg-gray-850/20">
                                        <div className="flex items-center justify-between gap-3">
                                          <div>
                                            <p className="font-medium text-white text-sm">{fi.Product?.name}</p>
                                            <p className="text-[10px] text-gray-500 capitalize">
                                              Fixed Item
                                            </p>
                                          </div>
                                          <div className="flex flex-col items-end gap-1">
                                            <div className="flex items-center gap-1">
                                              <input
                                                type="number"
                                                min="50"
                                                step="50"
                                                value={qty}
                                                onChange={e => updateScheduleFixedQty(fi.product_id, e.target.value)}
                                                className="input w-20 py-0.5 px-1.5 text-xs text-center border border-gray-700 bg-gray-850"
                                                required
                                              />
                                              <span className="text-gray-500 text-xs">{fi.Product?.unit || "gm"}</span>
                                            </div>
                                            {(() => {
                                              const maxAddable = activeRemainingBudget > 0 && fi.Product?.purchase_price_per_gm ? Math.floor(activeRemainingBudget / (parseFloat(fi.Product.purchase_price_per_gm) * 50)) * 50 : 0;
                                              return maxAddable >= 50 ? (
                                                <button
                                                  type="button"
                                                  onClick={() => updateScheduleFixedQty(fi.product_id, parseFloat(qty || 0) + maxAddable)}
                                                  className="text-[9px] text-fresh-400 hover:text-fresh-300 bg-fresh-950/40 border border-fresh-800/30 px-1.5 py-0.5 rounded cursor-pointer transition-all"
                                                >
                                                  💡 {maxAddable}g add kar sakte ho
                                                </button>
                                              ) : null;
                                            })()}
                                          </div>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>

                              {/* 2. Customize Seasonal Items */}
                              <div className="space-y-2">
                                <div className="flex justify-between items-center">
                                  <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">2. Seasonal Items</p>
                                  <span className="text-gray-400 text-xs">Chosen: {activeSelectedCount}/{schedulesMaxCount}</span>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                  {schedulesPool.map(sp => {
                                    const qty = selectedScheduleItems[sp.product_id] || "";
                                    const isChecked = parseFloat(qty) > 0;

                                    return (
                                      <div key={sp.product_id} className={`rounded-xl p-2.5 border transition-all ${isChecked ? "border-fresh-700/50 bg-fresh-950/10" : "border-gray-800 bg-gray-900/30"}`}>
                                        <div className="flex items-center justify-between gap-2">
                                          <div className="flex items-center gap-2">
                                            <input
                                              type="checkbox"
                                              checked={isChecked}
                                              onChange={e => {
                                                const newItems = { ...selectedScheduleItems };
                                                if (e.target.checked) {
                                                  // Respect max select count limit
                                                  if (schedulesMaxCount && activeSelectedCount >= schedulesMaxCount) {
                                                    alert(`Maximum of ${schedulesMaxCount} items allowed.`);
                                                    return;
                                                  }
                                                  newItems[sp.product_id] = 250; // default to 250g
                                                } else {
                                                  delete newItems[sp.product_id];
                                                }
                                                setSelectedScheduleItems(newItems);
                                              }}
                                              className="rounded text-fresh-500 focus:ring-fresh-500 bg-gray-800 border-gray-700 w-4 h-4"
                                            />
                                            <div>
                                              <p className="text-xs font-medium text-white">{sp.Product?.name}</p>
                                            </div>
                                          </div>

                                          {isChecked && (
                                            <div className="flex flex-col items-end gap-1">
                                              <div className="flex items-center gap-1">
                                                <input
                                                  type="number"
                                                  min="50"
                                                  step="50"
                                                  value={qty}
                                                  onChange={e => {
                                                    const val = e.target.value;
                                                    setSelectedScheduleItems({
                                                      ...selectedScheduleItems,
                                                      [sp.product_id]: val ? parseFloat(val) : 0
                                                    });
                                                  }}
                                                  className="input w-16 py-0.5 px-1.5 text-xs text-center border border-gray-700 bg-gray-850"
                                                />
                                                <span className="text-[10px] text-gray-400">{sp.Product?.unit}</span>
                                              </div>
                                              {(() => {
                                                const maxAddable = activeRemainingBudget > 0 && sp.Product?.purchase_price_per_gm ? Math.floor(activeRemainingBudget / (parseFloat(sp.Product.purchase_price_per_gm) * 50)) * 50 : 0;
                                                return maxAddable >= 50 ? (
                                                  <button
                                                    type="button"
                                                    onClick={() => setSelectedScheduleItems({
                                                      ...selectedScheduleItems,
                                                      [sp.product_id]: parseFloat(qty || 0) + maxAddable
                                                    })}
                                                    className="text-[9px] text-fresh-400 hover:text-fresh-300 bg-fresh-950/40 border border-fresh-800/30 px-1.5 py-0.5 rounded cursor-pointer transition-all"
                                                  >
                                                    💡 {maxAddable}g add kar sakte ho
                                                  </button>
                                                ) : null;
                                              })()}
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>

                              <div className="flex gap-2 justify-end pt-2">
                                <button
                                  onClick={() => handleSaveScheduleSelection(schedule.id)}
                                  disabled={savingScheduleSelection || (schedulesMaxCount && activeSelectedCount > schedulesMaxCount)}
                                  className="btn-primary text-xs py-1.5 px-4"
                                >
                                  {savingScheduleSelection ? "Saving..." : "💾 Save Date Picks"}
                                </button>
                                <button
                                  onClick={() => setActiveScheduleId(null)}
                                  className="btn-secondary text-xs py-1.5 px-3"
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}

            <div className="flex justify-end border-t border-gray-800 pt-3">
              <button onClick={() => setScheduleSub(null)} className="btn-secondary text-sm">Close</button>
            </div>
          </div>
        </div>
      )}

      {subs.length === 0 ? (
        <div className="card text-center py-12 text-gray-500">
          <p className="text-5xl mb-4">📦</p>
          <p className="text-lg font-medium text-white mb-2">No subscriptions yet</p>
          <p className="mb-4">Browse our packages and start your fresh delivery journey.</p>
          <Link to="/packages" className="btn-primary inline-block">Browse Packages</Link>
        </div>
      ) : (
        <div className="space-y-4">
          {subs.map(sub => {
            const isExpanded = expandedId === sub.id;
            return (
              <div key={sub.id} className="card">
                {/* Header */}
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-1">
                      <h2 className="text-lg font-bold text-white">{sub.Package?.name}</h2>
                      {statusBadge(sub.status)}
                      <span className="badge badge-gray capitalize">{sub.type}</span>
                    </div>
                    <p className="text-gray-400 text-sm">{sub.Package?.services_per_month} deliveries/month · ₹{sub.Package?.price}/month</p>
                    {sub.start_date ? (
                      <p className="text-gray-500 text-xs mt-1">📅 {sub.start_date} → {sub.end_date} · {sub.services_completed}/{sub.total_services} deliveries done</p>
                    ) : (
                      <p className="text-yellow-400 text-xs mt-1">⚠️ Start date not confirmed yet</p>
                    )}
                  </div>
                  <button onClick={() => setExpandedId(isExpanded ? null : sub.id)} className="text-gray-400 hover:text-white text-sm px-3 py-1 rounded-lg hover:bg-gray-800 transition-all">
                    {isExpanded ? "▲ Less" : "▼ More"}
                  </button>
                </div>

                {isExpanded && (
                  <div className="mt-5 pt-4 border-t border-gray-800 space-y-4 animate-fade-in">
                    {/* Fixed Items */}
                    {sub.Items?.filter(i => i.is_fixed).length > 0 && (
                      <div>
                        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Subscription Fixed Items</p>
                        <div className="flex flex-wrap gap-2">
                          {sub.Items.filter(i => i.is_fixed).map(item => (
                            <span key={item.id} className="bg-gray-800 text-gray-300 text-xs px-2.5 py-1 rounded-lg border border-gray-700 font-medium">
                              {item.Product?.name} ({parseFloat(item.qty_gm)}{item.Product?.unit})
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Delivery Schedule & Selections */}
                    {sub.Package?.SeasonalConfig && (
                      <div className="space-y-3">
                        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Delivery Schedule & Vegetable Selections 🥦</p>
                        <div className="grid grid-cols-1 gap-2 max-h-[300px] overflow-y-auto pr-1">
                          {sub.Schedules && sub.Schedules.length > 0 ? (
                            sub.Schedules.map(sched => {
                              const dateObj = new Date(sched.scheduled_date);
                              const formattedDate = dateObj.toLocaleDateString("en-IN", { weekday: 'short', day: 'numeric', month: 'short' });

                              const fixedProductIds = sub.Items?.filter(i => i.is_fixed).map(i => i.product_id) || [];
                              const selections = sched.SeasonalSelections || [];

                              const customFixed = selections.filter(sel => fixedProductIds.includes(sel.product_id));
                              const customSeasonal = selections.filter(sel => !fixedProductIds.includes(sel.product_id));

                              const hasSeasonalSelections = customSeasonal.length > 0;

                              return (
                                <div key={sched.id} className="bg-gray-900/40 border border-gray-800 rounded-xl p-3 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
                                  <div>
                                    <p className="font-semibold text-white">{formattedDate} ({sched.status})</p>

                                    {/* Seasonal Selections */}
                                    <div className="mt-1.5 flex flex-wrap gap-1.5 items-center">
                                      <span className="text-[9px] text-gray-500 font-semibold uppercase tracking-wider mr-1">Seasonal:</span>
                                      {hasSeasonalSelections ? (
                                        customSeasonal.map(sel => (
                                          <span key={sel.id} className="bg-fresh-950/40 border border-fresh-850/50 text-fresh-400 text-xs px-2 py-0.5 rounded-lg">
                                            {sel.Product?.name} ({parseFloat(sel.qty_gm)}{sel.Product?.unit})
                                          </span>
                                        ))
                                      ) : (
                                        <span className="text-xs text-yellow-500/80 italic">No seasonal vegetables selected</span>
                                      )}
                                    </div>

                                    {/* Fixed Selections */}
                                    <div className="mt-1 flex flex-wrap gap-1.5 items-center">
                                      <span className="text-[9px] text-gray-500 font-semibold uppercase tracking-wider mr-1">Fixed:</span>
                                      {customFixed.length > 0 ? (
                                        customFixed.map(sel => (
                                          <span key={sel.id} className="bg-gray-800 border border-gray-700 text-gray-300 text-xs px-2 py-0.5 rounded-lg">
                                            {sel.Product?.name} ({parseFloat(sel.qty_gm)}{sel.Product?.unit})
                                          </span>
                                        ))
                                      ) : (
                                        sub.Items?.filter(i => i.is_fixed).map(item => (
                                          <span key={item.id} className="bg-gray-800/60 border border-gray-750 text-gray-400 text-xs px-2 py-0.5 rounded-lg">
                                            {item.Product?.name} ({parseFloat(item.qty_gm)}{item.Product?.unit})
                                          </span>
                                        ))
                                      )}
                                    </div>
                                  </div>
                                </div>
                              );
                            })
                          ) : (
                            <p className="text-xs text-gray-500 italic">No schedules generated yet.</p>
                          )}
                        </div>
                      </div>
                    )}


                    <div className="flex flex-wrap gap-3 pt-2 border-t border-gray-800">
                      {sub.status === "active" && (
                        <>
                          {sub.Package?.SeasonalConfig && (
                            <button
                              onClick={() => openScheduleSelection(sub)}
                              className="btn-primary text-sm py-1.5 px-4 bg-fresh-600 hover:bg-fresh-500"
                            >
                              🥦 Select Sabji (Per-Service)
                            </button>
                          )}
                          <button onClick={() => {
                            setPausingSub(sub);
                            setPauseType("monthly");
                            setDaysToPause(5);
                            setPauseScope("single");
                            setPausingMsg("");
                          }} className="btn-secondary text-sm py-1.5 px-4">
                            ⏸ Pause Package
                          </button>
                          <button onClick={() => handleCancel(sub.id)} className="btn-danger text-sm py-1.5 px-3">✕ Cancel</button>
                        </>
                      )}
                      {sub.status === "paused" && (
                        <button onClick={() => startResumeFlow(sub)} className="btn-primary text-sm py-1.5 px-4">▶ Resume</button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
