import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../api/axios";

/**
 * Full subscription flow after clicking "Subscribe":
 * Step 1: Date selection
 * Step 2: Seasonal item selection
 */
export default function PackagesPage() {
  const [packages, setPackages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [subscribing, setSubscribing] = useState(null);
  const [selectedType, setSelectedType] = useState("monthly");
  const [msg, setMsg] = useState("");
  const [mySubscriptions, setMySubscriptions] = useState([]); // track active/paused subs
  const navigate = useNavigate();

  // Flow state
  const [step, setStep] = useState("list"); // "list" | "confirm_date" | "seasonal"
  const [currentSub, setCurrentSub] = useState(null); // { subscription_id, package_id, package_name }
  const [availableDates, setAvailableDates] = useState([]);
  const [selectedDate, setSelectedDate] = useState("");
  const [confirmingDate, setConfirmingDate] = useState(false);

  // Razorpay simulated checkout state
  const [showRazorpay, setShowRazorpay] = useState(false);
  const [razorpayPkg, setRazorpayPkg] = useState(null);
  const [paymentStatus, setPaymentStatus] = useState("idle"); // "idle" | "processing" | "success"
  const [paymentProgressMsg, setPaymentProgressMsg] = useState("");

  // Seasonal state
  const [seasonalPool, setSeasonalPool] = useState([]);
  const [maxSelectCount, setMaxSelectCount] = useState(0);
  const [selectedItems, setSelectedItems] = useState({}); // { product_id: qty_gm }
  const [savingSeasonal, setSavingSeasonal] = useState(false);
  const [seasonalMsg, setSeasonalMsg] = useState("");
  const [seasonalBudget, setSeasonalBudget] = useState(0);
  const [fixedItems, setFixedItems] = useState([]); // [{ product_id, qty_gm, Product }]
  const [perServiceAmount, setPerServiceAmount] = useState(0);

  const [addresses, setAddresses] = useState([]);
  const [selectedAddressId, setSelectedAddressId] = useState("");

  useEffect(() => {
    api.get("/packages")
      .then(r => setPackages(r.data.packages || []))
      .finally(() => setLoading(false));

    api.get("/addresses")
      .then(r => {
        const addrs = r.data.addresses || [];
        setAddresses(addrs);
        const defaultAddr = addrs.find(a => a.is_default);
        if (defaultAddr) setSelectedAddressId(defaultAddr.id);
        else if (addrs.length > 0) setSelectedAddressId(addrs[0].id);
      });

    // Fetch user's current subscriptions to detect duplicates
    api.get("/my-subscriptions")
      .then(r => {
        const subs = r.data.subscriptions || [];
        // Only keep active/paused ones
        setMySubscriptions(subs.filter(s => s.status === 'active' || s.status === 'paused'));
      })
      .catch(() => {}); // silently ignore if fails
  }, []);

  // Helper: check if user already has this package active/paused
  const isPackageAlreadyActive = (pkgId) =>
    mySubscriptions.some(s => s.package_id === pkgId);

  const handleOpenPayment = (pkg) => {
    if (isPackageAlreadyActive(pkg.id)) {
      setMsg(`❌ Aap pehle se "${pkg.name}" package ke subscriber hain. Subscription end hone ke baad renew karein.`);
      return;
    }
    if (!selectedAddressId) {
      setMsg("❌ Please add or select a delivery address first");
      return;
    }
    setRazorpayPkg(pkg);
    setPaymentStatus("idle");
    setPaymentProgressMsg("");
    setShowRazorpay(true);
  };

  const handleOverageSave = async () => {
    if (isOverBudget) {
      setRazorpayPkg({
        name: `${currentSub?.package_name || 'Package'} (Extra Overage)`,
        price: (totalCost - perServiceAmount)
      });
      setPaymentStatus("idle");
      setPaymentProgressMsg("");
      setShowRazorpay(true);
    } else {
      await handleSaveSeasonal();
    }
  };

  const handleSimulatedPayment = async () => {
    if (!razorpayPkg) return;
    setPaymentStatus("processing");
    const msgs = [
      "Connecting to Razorpay Secure API...",
      "Initiating gateway authorization...",
      "Authorizing prepaid package transaction...",
      "Verifying payment confirmation... done!",
    ];

    for (let i = 0; i < msgs.length; i++) {
      setPaymentProgressMsg(msgs[i]);
      await new Promise(r => setTimeout(r, 700));
    }

    setPaymentStatus("success");
    await new Promise(r => setTimeout(r, 600));
    setShowRazorpay(false);

    if (step === "seasonal") {
      await handleSaveSeasonal(selectedItems, "razorpay");
      return;
    }

    setSubscribing(razorpayPkg.id);
    setMsg("");
    try {
      const res = await api.post("/subscribe", {
        package_id: razorpayPkg.id,
        type: selectedType,
        payment_method: "razorpay",
        address_id: parseInt(selectedAddressId)
      });
      const sub_id = res.data.subscription_id;
      setCurrentSub({ subscription_id: sub_id, package_id: razorpayPkg.id, package_name: razorpayPkg.name });

      // Fetch available dates for this package
      const datesRes = await api.get(`/available-dates?package_id=${razorpayPkg.id}`);
      setAvailableDates(datesRes.data.available_dates || []);
      setSelectedDate("");
      setStep("confirm_date");
      setMsg(`✅ Payment successful and subscribed to ${razorpayPkg.name}! Please select your delivery start date.`);
    } catch (err) {
      const errMsg = err.response?.data?.message || "Subscription failed";
      setMsg(`❌ ${errMsg}`);
      // If 409 (duplicate), refresh subscriptions list
      if (err.response?.status === 409) {
        api.get("/my-subscriptions").then(r => {
          const subs = r.data.subscriptions || [];
          setMySubscriptions(subs.filter(s => s.status === 'active' || s.status === 'paused'));
        }).catch(() => {});
      }
    } finally {
      setSubscribing(null);
    }
  };

  // Step 2: Confirm start date → generate schedule → go to seasonal
  const handleConfirmDate = async () => {
    if (!selectedDate) return;
    setConfirmingDate(true);
    try {
      await api.post("/confirm-start-date", {
        subscription_id: currentSub.subscription_id,
        start_date: selectedDate,
      });

      // Fetch seasonal options
      const res = await api.get(`/seasonal-options/${currentSub.subscription_id}`);
      setSeasonalPool(res.data.seasonal_pool || []);
      setMaxSelectCount(res.data.max_select_count || 0);
      setPerServiceAmount(res.data.per_service_amount || 0);
      setFixedItems(res.data.fixed_items || []);
      setSelectedItems({});
      setSeasonalMsg("");
      setStep("seasonal");
    } catch (err) {
      setMsg(`❌ ${err.response?.data?.message || "Date confirmation failed"}`);
    } finally {
      setConfirmingDate(false);
    }
  };

  // Step 3: Save seasonal items and customized fixed items
  const handleSaveSeasonal = async (customSeasonal = selectedItems, paymentMethod = "wallet") => {
    setSavingSeasonal(true);
    setSeasonalMsg("");
    const items = Object.entries(customSeasonal)
      .filter(([, qty]) => qty > 0)
      .map(([product_id, qty_gm]) => ({ product_id: parseInt(product_id), qty_gm: parseFloat(qty_gm) }));

    const fixed = fixedItems.map(fi => ({
      product_id: fi.product_id,
      qty_gm: parseFloat(fi.qty_gm) || 50
    }));

    try {
      await api.post("/select-seasonal", {
        subscription_id: currentSub.subscription_id,
        items,
        fixed_items: fixed,
        payment_method: paymentMethod
      });
      setStep("list");
      setMsg(`✅ All done! Your subscription is active. Navigating to My Subscriptions...`);
      setTimeout(() => navigate("/my-subscriptions"), 2000);
    } catch (err) {
      setSeasonalMsg(`❌ ${err.response?.data?.message || "Failed to save items"}`);
    } finally {
      setSavingSeasonal(false);
    }
  };

  const selectedCount = Object.values(selectedItems).filter(v => v > 0).length;

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

  const calcYearly = (price) => (price * 12 * 0.75).toFixed(0);

  if (loading) return (
    <div className="flex items-center justify-center h-64 text-gray-400">Loading packages...</div>
  );

  // ─── STEP: CONFIRM DATE ─────────────────────────────────────────────────────
  if (step === "confirm_date") {
    return (
      <div className="max-w-xl mx-auto space-y-6 animate-slide-up">
        <div>
          <h1 className="page-header">Select Start Date 📅</h1>
          <p className="page-sub">Package: <span className="text-white font-semibold">{currentSub?.package_name}</span></p>
        </div>

        {msg && (
          <div className={`rounded-xl px-4 py-3 text-sm ${msg.startsWith("✅") ? "bg-fresh-900/30 text-fresh-400 border border-fresh-700/50" : "bg-red-900/30 text-red-400 border border-red-700/50"}`}>
            {msg}
          </div>
        )}

        <div className="card">
          <p className="text-gray-400 text-sm mb-4">
            Choose from available delivery start dates. These dates are synchronized with other active subscribers of the same package.
          </p>

          <div className="grid grid-cols-2 gap-3 mb-6">
            {availableDates.map(date => {
              const d = new Date(date);
              const dayName = d.toLocaleDateString("en-IN", { weekday: "long" });
              const formatted = d.toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });
              return (
                <button
                  key={date}
                  onClick={() => setSelectedDate(date)}
                  className={`p-3 rounded-xl border text-left transition-all duration-200 ${selectedDate === date
                      ? "border-fresh-500 bg-fresh-900/40 text-fresh-400"
                      : "border-gray-700 bg-gray-800/50 text-gray-300 hover:border-gray-600"
                    }`}
                >
                  <p className="font-semibold text-sm">{dayName}</p>
                  <p className="text-xs mt-0.5 text-gray-400">{formatted}</p>
                </button>
              );
            })}
          </div>

          {availableDates.length === 0 && (
            <div className="mb-6">
              <label className="label">Enter custom date</label>
              <input
                type="date"
                className="input"
                min={new Date(Date.now() + 86400000).toISOString().split("T")[0]}
                value={selectedDate}
                onChange={e => setSelectedDate(e.target.value)}
              />
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={handleConfirmDate}
              disabled={!selectedDate || confirmingDate}
              className="btn-primary flex-1"
            >
              {confirmingDate ? "Confirming..." : "Confirm Date & Continue →"}
            </button>
            <button onClick={() => { setStep("list"); setMsg(""); }} className="btn-secondary">
              Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ─── STEP: SEASONAL ITEM SELECTION ───────────────────────────────────────────
  if (step === "seasonal") {
    return (
      <div className="max-w-2xl mx-auto space-y-6 animate-slide-up">
        <div>
          <h1 className="page-header">Customize Your Plan 🌿</h1>
          <p className="page-sub">
            Adjust fixed item quantities and choose up to <span className="text-white font-semibold">{maxSelectCount}</span> seasonal items.
          </p>
        </div>

        {seasonalMsg && (
          <div className={`rounded-xl px-4 py-3 text-sm ${seasonalMsg.startsWith("✅") ? "bg-fresh-900/30 text-fresh-400 border border-fresh-700/50" : "bg-red-900/30 text-red-400 border border-red-700/50"}`}>
            {seasonalMsg}
          </div>
        )}

        {/* Live Budget Tracking Box */}
        {isOverBudget && (
          <div className="card p-5 border border-red-500/50 bg-red-950/20 text-red-200 flex flex-col gap-2 rounded-2xl">
            <p className="text-xs text-red-400 font-medium mt-1 animate-pulse">
              ⚠️ You have exceeded the delivery budget limit. Please reduce product quantities.
            </p>
          </div>
        )}

        {/* 1. Customize Fixed Items */}
        <div className="card space-y-4">
          <div>
            <h3 className="font-semibold text-white text-base">1. Customize Fixed Items</h3>
            <p className="text-xs text-gray-500">You cannot remove fixed products, but you can decrease their quantity to save budget.</p>
          </div>
          <div className="space-y-3">
            {fixedItems.map(fi => {
              const qty = fi.qty_gm;

              return (
                <div key={fi.product_id} className="rounded-xl p-4 border border-gray-700 bg-gray-800/30">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="font-medium text-white">{fi.Product?.name}</p>
                      <p className="text-xs text-gray-500 capitalize">
                        Fixed Item
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min="50"
                          step="50"
                          value={qty}
                          onChange={e => updateFixedQty(fi.product_id, e.target.value)}
                          placeholder="Qty"
                          className="input w-28 py-1.5 text-sm text-center"
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
        <div className="card space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-white text-base">2. Pick Seasonal Items</h3>
              <p className="text-xs text-gray-500">Select up to {maxSelectCount} seasonal items from the pool.</p>
            </div>
            <p className="text-gray-400 text-sm">
              Selected: <span className={`font-bold ${selectedCount > maxSelectCount ? "text-red-400" : "text-fresh-400"}`}>{selectedCount}</span> / {maxSelectCount}
            </p>
          </div>

          <div className="space-y-3">
            {seasonalPool.map(sp => {
              const pid = sp.product_id;
              const isSelected = (selectedItems[pid] || 0) > 0;
              const qty = selectedItems[pid] || "";
              const itemCost = isSelected ? parseFloat(qty || 0) * parseFloat(sp.Product?.purchase_price_per_gm || 0) : 0;

              return (
                <div
                  key={sp.id}
                  className={`rounded-xl p-4 border transition-all duration-200 ${isSelected
                      ? "border-fresh-600/50 bg-fresh-900/20"
                      : "border-gray-700 bg-gray-800/30"
                    }`}
                >
                  <div className="flex items-center gap-4">
                    <input
                      type="checkbox"
                      id={`chk-${pid}`}
                      checked={isSelected}
                      onChange={e => {
                        if (!e.target.checked) {
                          const updated = { ...selectedItems };
                          delete updated[pid];
                          setSelectedItems(updated);
                        } else {
                          if (selectedCount >= maxSelectCount) {
                            setSeasonalMsg(`❌ You can only select ${maxSelectCount} items. Remove one first.`);
                            return;
                          }
                          setSeasonalMsg("");
                          setSelectedItems({ ...selectedItems, [pid]: 100 });
                        }
                      }}
                      className="w-4 h-4 accent-green-500"
                    />
                    <label htmlFor={`chk-${pid}`} className="flex-1 cursor-pointer">
                      <p className="font-medium text-white">{sp.Product?.name}</p>
                      <p className="text-xs text-gray-500 capitalize">
                        {sp.Product?.category}
                      </p>
                    </label>
                    {isSelected && (
                      <div className="flex flex-col items-end gap-1">
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            min="50"
                            max="5000"
                            step="50"
                            value={qty}
                            onChange={e => setSelectedItems({ ...selectedItems, [pid]: e.target.value })}
                            placeholder="Qty"
                            className="input w-28 py-1.5 text-sm text-center"
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
          </div>

          {seasonalPool.length === 0 && (
            <p className="text-center text-gray-500 py-6">No seasonal items available for this package.</p>
          )}
        </div>

        <div className="flex gap-3">
          <button onClick={() => handleOverageSave()} disabled={savingSeasonal} className="btn-primary flex-1">
            {savingSeasonal ? "Saving..." : isOverBudget ? `🔒 Pay Overage ₹${Math.abs(remainingBudget).toFixed(2)} & Save` : "✅ Save & Activate Subscription"}
          </button>
          <button onClick={() => handleSaveSeasonal({})} className="btn-secondary text-sm">
            Skip (use defaults)
          </button>
        </div>
      </div>
    );
  }

  // ─── STEP: PACKAGE LIST ───────────────────────────────────────────────────────
  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="page-header">Browse Packages 📦</h1>
        <p className="page-sub">Choose a subscription plan that works for you</p>
      </div>

      {msg && (
        <div className={`rounded-xl px-4 py-3 text-sm ${msg.startsWith("✅") ? "bg-fresh-900/30 text-fresh-400 border border-fresh-700/50" : "bg-red-900/30 text-red-400 border border-red-700/50"}`}>
          {msg}
        </div>
      )}

      {/* Address Selector Section */}
      <div className="card max-w-xl space-y-2">
        <h3 className="font-semibold text-white text-sm">📍 Delivery Address</h3>
        {addresses.length === 0 ? (
          <div className="flex flex-col gap-2">
            <p className="text-yellow-400 text-xs font-semibold">⚠️ No delivery address found. You must add an address before subscribing.</p>
            <button onClick={() => navigate("/addresses")} className="btn-secondary text-xs py-1.5 w-fit">📍 Go to My Addresses</button>
          </div>
        ) : (
          <div className="flex items-center gap-4">
            <select
              className="input py-2 text-sm flex-1"
              value={selectedAddressId}
              onChange={e => setSelectedAddressId(e.target.value)}
            >
              {addresses.map(a => (
                <option key={a.id} value={a.id}>
                  {a.address_line}, {a.city} {a.is_default ? "(Default)" : ""}
                </option>
              ))}
            </select>
            <button onClick={() => navigate("/addresses")} className="text-xs text-fresh-400 hover:underline">Manage Addresses</button>
          </div>
        )}
      </div>

      {/* Type toggle */}
      <div className="flex gap-2 bg-gray-800 rounded-xl p-1 w-fit">
        {["monthly", "yearly"].map(t => (
          <button
            key={t}
            onClick={() => setSelectedType(t)}
            className={`px-6 py-2 rounded-lg text-sm font-medium transition-all ${selectedType === t ? "bg-fresh-600 text-white" : "text-gray-400 hover:text-white"}`}
          >
            {t === "yearly" ? "🏆 Yearly (25% off)" : "📅 Monthly"}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {packages.map(pkg => {
          const alreadyActive = isPackageAlreadyActive(pkg.id);
          return (
          <div key={pkg.id} className={`card transition-all duration-300 flex flex-col ${
            alreadyActive
              ? "border-fresh-600/60 bg-fresh-950/20 hover:scale-[1.005]"
              : "hover:border-fresh-700/50 hover:scale-[1.01]"
          }`}>
            <div className="flex items-start justify-between mb-4">
              <div>
                <h2 className="text-xl font-bold text-white">{pkg.name}</h2>
                <p className="text-gray-400 text-sm">{pkg.num_persons} persons · {pkg.services_per_month} deliveries/month</p>
              </div>
              <div className="flex flex-col items-end gap-1.5">
                <span className={`badge ${pkg.type === "custom" ? "badge-blue" : "badge-green"}`}>{pkg.type}</span>
                {alreadyActive && (
                  <span className="inline-flex items-center gap-1 bg-fresh-900/60 text-fresh-400 border border-fresh-600/50 text-[10px] font-bold px-2 py-0.5 rounded-full">
                    ✅ Active
                  </span>
                )}
              </div>
            </div>

            {/* Price */}
            <div className="bg-gray-800/60 rounded-xl p-4 mb-4">
              {selectedType === "yearly" ? (
                <div>
                  <p className="text-gray-400 text-xs line-through">₹{(pkg.price * 12).toFixed(0)}/year</p>
                  <p className="text-2xl font-bold text-gradient">₹{calcYearly(pkg.price)}<span className="text-sm text-gray-400 font-normal">/year</span></p>
                  <p className="text-fresh-400 text-xs mt-1">💰 Save ₹{(pkg.price * 12 * 0.25).toFixed(0)} (25% off)</p>
                </div>
              ) : (
                <p className="text-2xl font-bold text-gradient">₹{pkg.price}<span className="text-sm text-gray-400 font-normal">/month</span></p>
              )}
              <p className="text-gray-500 text-xs mt-1">₹{(pkg.price / pkg.services_per_month).toFixed(1)} per delivery</p>
            </div>

            {/* Fixed items */}
            {pkg.FixedItems?.length > 0 && (
              <div className="mb-3">
                <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">Fixed Items (every delivery)</p>
                <div className="flex flex-wrap gap-2">
                  {pkg.FixedItems.map(fi => (
                    <span key={fi.id} className="bg-gray-800 text-gray-300 text-xs px-2.5 py-1 rounded-lg border border-gray-700">
                      {fi.Product?.name} ({fi.default_qty_gm}g)
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Seasonal pool */}
            {pkg.SeasonalPool?.length > 0 && (
              <div className="mb-4">
                <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">
                  Seasonal Options <span className="text-fresh-400">(choose {pkg.SeasonalConfig?.max_select_count})</span>
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {pkg.SeasonalPool.map(sp => (
                    <span key={sp.id} className="bg-fresh-900/30 text-fresh-400 text-xs px-2 py-1 rounded-lg border border-fresh-800/50">
                      🌿 {sp.Product?.name}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-auto">
              {alreadyActive ? (
                <div className="space-y-2">
                  <div className="w-full py-2.5 bg-fresh-900/30 border border-fresh-700/40 text-fresh-400 font-semibold rounded-xl text-sm text-center">
                    ✅ Already Subscribed
                  </div>
                  <p className="text-[11px] text-gray-500 text-center">
                    Subscription end hone ke baad renew kar sakte hain
                  </p>
                </div>
              ) : (
                <button
                  id={`subscribe-${pkg.id}`}
                  onClick={() => handleOpenPayment(pkg)}
                  disabled={subscribing === pkg.id}
                  className="btn-primary w-full"
                >
                  {subscribing === pkg.id ? "Processing..." : `Subscribe ${selectedType === "yearly" ? "Yearly 🏆" : "Monthly"}`}
                </button>
              )}
            </div>
          </div>
          );
        })}
      </div>

      {packages.length === 0 && (
        <div className="card text-center py-12 text-gray-500">
          <p className="text-4xl mb-3">📦</p>
          <p>No packages available at the moment.</p>
        </div>
      )}

      {/* Razorpay Simulated Checkout Drawer/Modal */}
      {showRazorpay && razorpayPkg && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-[#0b1220] border border-gray-700/80 rounded-3xl p-6 w-full max-w-md shadow-2xl space-y-6 relative overflow-hidden animate-slide-up">
            {/* Razorpay Brand Header */}
            <div className="flex items-center justify-between border-b border-gray-800 pb-4">
              <div className="flex items-center gap-2">
                <span className="text-blue-400 font-extrabold text-xl tracking-tight">Razorpay</span>
                <span className="bg-blue-500/10 text-blue-400 text-[10px] font-bold px-1.5 py-0.5 rounded border border-blue-500/20">SECURE CHECKOUT</span>
              </div>
              <button
                onClick={() => setShowRazorpay(false)}
                className="text-gray-400 hover:text-white text-2xl leading-none transition-colors"
                disabled={paymentStatus === "processing"}
              >
                &times;
              </button>
            </div>

            {paymentStatus === "idle" && (
              <div className="space-y-5">
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Merchant</p>
                  <p className="text-sm font-bold text-white">FreshBox Delivery Subscriptions</p>
                </div>

                <div className="bg-gray-900/50 rounded-2xl p-4 border border-gray-800 space-y-3">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-400">Package Name:</span>
                    <span className="font-semibold text-white">{razorpayPkg.name}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-400">Duration:</span>
                    <span className="font-semibold text-white capitalize">{selectedType} Plan</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-400">Deliveries:</span>
                    <span className="font-semibold text-white">{selectedType === "yearly" ? razorpayPkg.services_per_month * 12 : razorpayPkg.services_per_month} services</span>
                  </div>
                  <div className="border-t border-gray-800/80 my-1"></div>
                  <div className="flex justify-between items-center text-base font-bold">
                    <span className="text-gray-200">Amount Due:</span>
                    <span className="text-gradient">
                      ₹{selectedType === "yearly" ? calcYearly(razorpayPkg.price) : razorpayPkg.price}
                    </span>
                  </div>
                </div>

                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-1">Delivery Address</p>
                  <div className="bg-gray-900/30 rounded-xl p-3 border border-gray-800 text-xs text-gray-300">
                    {(() => {
                      const addr = addresses.find(a => a.id === parseInt(selectedAddressId));
                      return addr ? `${addr.address_line}, ${addr.city} - ${addr.pincode}` : "No address selected";
                    })()}
                  </div>
                </div>

                <div className="flex flex-col gap-3 pt-2">
                  <button
                    onClick={handleSimulatedPayment}
                    className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition-all duration-300 shadow-lg shadow-blue-950 flex items-center justify-center gap-2"
                  >
                    🔒 Pay ₹{selectedType === "yearly" ? calcYearly(razorpayPkg.price) : razorpayPkg.price} Securely
                  </button>
                  <button
                    onClick={() => setShowRazorpay(false)}
                    className="w-full py-2.5 bg-transparent hover:bg-gray-800/50 text-gray-400 hover:text-white font-medium rounded-xl transition-all text-sm"
                  >
                    Cancel Payment
                  </button>
                </div>
              </div>
            )}

            {paymentStatus === "processing" && (
              <div className="flex flex-col items-center justify-center py-10 space-y-6">
                <div className="relative w-16 h-16">
                  <div className="absolute inset-0 rounded-full border-4 border-blue-500/20"></div>
                  <div className="absolute inset-0 rounded-full border-4 border-blue-500 border-t-transparent animate-spin"></div>
                </div>
                <div className="text-center space-y-2">
                  <p className="text-white font-semibold text-base">Processing Payment...</p>
                  <p className="text-xs text-gray-400 animate-pulse">{paymentProgressMsg}</p>
                </div>
              </div>
            )}

            {paymentStatus === "success" && (
              <div className="flex flex-col items-center justify-center py-10 space-y-4 animate-scale-up">
                <div className="w-16 h-16 bg-green-500/10 border border-green-500/30 rounded-full flex items-center justify-center text-green-400 text-3xl">
                  ✓
                </div>
                <div className="text-center space-y-1">
                  <p className="text-white font-bold text-lg">Payment Successful</p>
                  <p className="text-xs text-gray-400">Reference: pay_sim_{Math.random().toString(36).substr(2, 9)}</p>
                </div>
              </div>
            )}

            <div className="text-[10px] text-gray-600 text-center pt-2">
              Protected by Razorpay Secure. Do not close or refresh this drawer.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
