import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../api/axios";

export default function WaterPage() {
  const navigate = useNavigate();
  const [waters, setWaters] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");
  const [subscribing, setSubscribing] = useState(false);

  // Razorpay simulated checkout state
  const [showRazorpay, setShowRazorpay] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState("idle"); // "idle" | "processing" | "success"
  const [paymentProgressMsg, setPaymentProgressMsg] = useState("");

  // Address states
  const [addresses, setAddresses] = useState([]);
  const [selectedAddressId, setSelectedAddressId] = useState("");
  const [showAddressChoiceModal, setShowAddressChoiceModal] = useState(false);
  const [addressChoiceMode, setAddressChoiceMode] = useState("existing");
  const [showInlineAddressModal, setShowInlineAddressModal] = useState(false);
  const [inlineAddressForm, setInlineAddressForm] = useState({
    address_line: "",
    city: "",
    pincode: "",
    landmark: "",
    is_default: true
  });
  const [savingInlineAddress, setSavingInlineAddress] = useState(false);

  // Form states
  const [selectedType, setSelectedType] = useState("monthly"); // monthly or yearly
  const [form, setForm] = useState({ product_id: "", water_type: "health", container: "glass", frequency: "daily" });

  // Flow step state: "list" | "confirm_date"
  const [step, setStep] = useState("list");
  const [currentSubId, setCurrentSubId] = useState(null);
  const [availableDates, setAvailableDates] = useState([]);
  const [selectedDate, setSelectedDate] = useState("");
  const [confirmingDate, setConfirmingDate] = useState(false);

  // Action states for existing subscriptions
  const [resumingSub, setResumingSub] = useState(null);
  const [resumeDates, setResumeDates] = useState([]);
  const [selectedResumeDate, setSelectedResumeDate] = useState("");
  const [confirmingResume, setConfirmingResume] = useState(false);
  const [resumeMsg, setResumeMsg] = useState("");

  // Pause states
  const [pausingSub, setPausingSub] = useState(null);
  const [pauseType, setPauseType] = useState("monthly");
  const [daysToPause, setDaysToPause] = useState(5);
  const [pauseScope, setPauseScope] = useState("single");
  const [pausingMsg, setPausingMsg] = useState("");
  const [pausingLoader, setPausingLoader] = useState(false);

  const getMinStartDate = () => {
    const now = new Date();
    const minDate = new Date();
    if (now.getHours() < 20) {
      minDate.setDate(minDate.getDate() + 1); // tomorrow
    } else {
      minDate.setDate(minDate.getDate() + 2); // day after tomorrow
    }
    return minDate.toISOString().split('T')[0];
  };

  const fetchWater = () => {
    setLoading(true);
    api.get("/water/subscriptions")
      .then(r => setWaters(r.data.water_subscriptions || []))
      .finally(() => setLoading(false));
  };

  const fetchProducts = () => {
    api.get("/products").then(r => {
      const allProducts = r.data.products || [];
      const waterProds = allProducts.filter(p => p.category === "water" && p.status === "active");
      setProducts(waterProds);
      if (waterProds.length > 0) {
        const first = waterProds[0];
        const container = first.sub_category || "glass";
        const water_type = first.name.toLowerCase().includes("miracle") ? "miracle" : "health";
        setForm(prev => ({
          ...prev,
          product_id: first.id,
          water_type,
          container
        }));
      }
    });
  };

  const handleProductChange = (productId) => {
    const p = products.find(prod => prod.id === parseInt(productId));
    if (p) {
      const container = p.sub_category || "glass";
      const water_type = p.name.toLowerCase().includes("miracle") ? "miracle" : "health";
      setForm(prev => ({
        ...prev,
        product_id: p.id,
        water_type,
        container
      }));
    }
  };

  useEffect(() => {
    fetchWater();
    fetchProducts();
    api.get("/addresses")
      .then(r => {
        const addrs = r.data.addresses || [];
        setAddresses(addrs);
        const defaultAddr = addrs.find(a => a.is_default);
        if (defaultAddr) setSelectedAddressId(defaultAddr.id);
        else if (addrs.length > 0) setSelectedAddressId(addrs[0].id);
      });
  }, []);

  const getMatchedProduct = () => {
    if (form.product_id) {
      const found = products.find(p => p.id === parseInt(form.product_id));
      if (found) return found;
    }
    return products.find(p => {
      const nameLower = p.name.toLowerCase();
      return nameLower.includes(form.water_type.toLowerCase()) && nameLower.includes(form.container.toLowerCase());
    });
  };

  const matchedProduct = getMatchedProduct();
  const pricePerBottle = matchedProduct ? parseFloat(matchedProduct.selling_price_per_gm) : 0;
  
  // Daily: 30 deliveries per month. Alternate: 15 deliveries per month.
  const servicesPerMonth = form.frequency === "daily" ? 30 : 15;
  const totalServices = selectedType === "yearly" ? servicesPerMonth * 12 : servicesPerMonth;
  const rawTotal = pricePerBottle * totalServices;
  const totalPrice = selectedType === "yearly" ? rawTotal * 0.75 : rawTotal;

  const handleSaveInlineAddress = async (e) => {
    e.preventDefault();
    if (!inlineAddressForm.address_line || !inlineAddressForm.city || !inlineAddressForm.pincode) {
      setMsg("❌ Please fill in Address line, City and Pincode");
      return;
    }
    setSavingInlineAddress(true);
    try {
      const res = await api.post("/addresses", inlineAddressForm);
      const newAddress = res.data.address;
      setInlineAddressForm({
        address_line: "",
        city: "",
        pincode: "",
        landmark: "",
        is_default: true
      });
      setShowInlineAddressModal(false);
      
      api.get("/addresses").then(r => {
        const addrs = r.data.addresses || [];
        setAddresses(addrs);
        if (newAddress) {
          setSelectedAddressId(newAddress.id);
        } else if (addrs.length > 0) {
          setSelectedAddressId(addrs[0].id);
        }
      });
      setMsg("✅ Address added successfully!");
      setShowRazorpay(true);
    } catch (err) {
      setMsg(`❌ Address creation failed: ${err.response?.data?.message || err.message}`);
    } finally {
      setSavingInlineAddress(false);
    }
  };

  const handleOpenPayment = (e) => {
    e.preventDefault();
    if (!matchedProduct) {
      setMsg("❌ Selected water container and type combo is not available.");
      return;
    }
    setPaymentStatus("idle");
    setPaymentProgressMsg("");
    setShowAddressChoiceModal(true);
    setAddressChoiceMode("existing");
  };

  const handleSimulatedPayment = async () => {
    setPaymentStatus("processing");
    const msgs = [
      "Connecting to Razorpay Secure API...",
      "Initiating gateway authorization...",
      "Authorizing prepaid water plan transaction...",
      "Verifying payment confirmation... done!",
    ];

    for (let i = 0; i < msgs.length; i++) {
      setPaymentProgressMsg(msgs[i]);
      await new Promise(r => setTimeout(r, 700));
    }

    setPaymentStatus("success");
    await new Promise(r => setTimeout(r, 600));
    setShowRazorpay(false);

    setSubscribing(true); setMsg("");
    try {
      const res = await api.post("/water/subscribe", {
        water_type: form.water_type,
        container: form.container,
        frequency: form.frequency,
        type: selectedType,
        payment_method: "razorpay",
        address_id: parseInt(selectedAddressId)
      });
      setCurrentSubId(res.data.water_subscription_id);
      
      // Fetch available start dates
      const datesRes = await api.get("/water/available-dates");
      setAvailableDates(datesRes.data.available_dates || []);
      setSelectedDate(""); // Compulsory date selection!
      setStep("confirm_date");
      setMsg("✅ Payment successful and water subscription purchased! Please select your delivery start date.");
      fetchWater();
    } catch (err) { setMsg(`❌ ${err.response?.data?.message || "Purchase failed"}`); }
    finally { setSubscribing(false); }
  };

  const handleConfirmDate = async () => {
    if (!selectedDate) return;
    setConfirmingDate(true);
    try {
      await api.post("/water/confirm-start-date", {
        water_subscription_id: currentSubId,
        start_date: selectedDate
      });
      setStep("list");
      setMsg("✅ Start date confirmed! Your alkaline water deliveries are scheduled.");
      fetchWater();
    } catch (err) {
      setMsg(`❌ ${err.response?.data?.message || "Failed to confirm start date"}`);
    } finally {
      setConfirmingDate(false);
    }
  };

  const handleConfirmPause = async () => {
    setPausingLoader(true);
    setPausingMsg("");
    try {
      const res = await api.patch(`/water/${pausingSub.id}/pause`, {
        pause_days: parseInt(daysToPause),
        pause_type: pauseType,
        pause_scope: pauseScope
      });
      setMsg(`✅ ${res.data.message || "Water subscription paused successfully"}`);
      setPausingSub(null);
      fetchWater();
    } catch (err) {
      setPausingMsg(`❌ ${err.response?.data?.message || "Failed to pause water subscription"}`);
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
      const datesRes = await api.get("/water/available-dates");
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
      await api.patch(`/water/${resumingSub.id}/restart`, { restart_date: selectedResumeDate });
      setMsg("✅ Water subscription resumed successfully!");
      setResumingSub(null);
      fetchWater();
    } catch (err) {
      setResumeMsg(`❌ ${err.response?.data?.message || "Failed to resume subscription"}`);
    } finally {
      setConfirmingResume(false);
    }
  };

  const handleCancel = async (id) => {
    if (!confirm("Are you sure you want to cancel this water subscription?")) return;
    setMsg("");
    try {
      await api.patch(`/water/${id}/cancel`);
      setMsg("✅ Water subscription cancelled");
      fetchWater();
    } catch (err) { setMsg(`❌ ${err.response?.data?.message || "Failed to cancel"}`); }
  };

  const statusBadge = (s) => ({
    active: "badge-green",
    paused: "badge-yellow",
    cancelled: "badge-red",
    completed: "badge-blue"
  }[s] || "badge-gray");

  if (loading && waters.length === 0) return <div className="flex items-center justify-center h-64 text-gray-400">Loading water subscriptions...</div>;

  // ─── STEP: CONFIRM START DATE ───────────────────────────────────────────
  if (step === "confirm_date") {
    return (
      <div className="max-w-xl mx-auto space-y-6 animate-slide-up">
        <div>
          <h1 className="page-header">Select Start Date 📅</h1>
          <p className="page-sub">Choose when to start your Alkaline Water deliveries</p>
        </div>

        {msg && (
          <div className="rounded-xl px-4 py-3 text-sm bg-fresh-900/30 text-fresh-400 border border-fresh-700/50">
            {msg}
          </div>
        )}

        <div className="card">
          <p className="text-gray-400 text-sm mb-4">
            Select a start date from our recommended schedule to synchronize with existing delivery routes in your area.
          </p>

          <div className="grid grid-cols-2 gap-3 mb-6">
            {availableDates.map(date => {
              const d = new Date(date);
              const dayName = d.toLocaleDateString("en-IN", { weekday: "long" });
              const formatted = d.toLocaleDateString("en-IN", { day: "numeric", month: "long" });
              return (
                <button
                  key={date}
                  onClick={() => setSelectedDate(date)}
                  className={`p-3 rounded-xl border text-left transition-all duration-200 ${
                    selectedDate === date
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

          {availableDates.length === 0 && (
            <div className="mb-6">
              <label className="label">Enter start date</label>
              <input
                type="date"
                className="input"
                min={getMinStartDate()}
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
              {confirmingDate ? "Confirming..." : "Confirm Start Date & Start Deliveries →"}
            </button>
            <button onClick={() => { setStep("list"); setMsg(""); }} className="btn-secondary">
              Back to List
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="page-header">Water Subscription 💧</h1>
        <p className="page-sub">Subscribe to Premium Alkaline Water (pH 8.0 / pH 9.5) in eco-friendly containers</p>
      </div>

      {msg && (
        <div className={`rounded-xl px-4 py-3 text-sm ${msg.startsWith("✅") ? "bg-fresh-900/30 text-fresh-400 border border-fresh-700/50" : "bg-red-900/30 text-red-400 border border-red-700/50"}`}>
          {msg}
        </div>
      )}

      {/* Pause Configuration Modal */}
      {pausingSub && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 w-full max-w-md animate-slide-up space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-white text-lg font-gradient">Pause Water Subscription ⏸</h3>
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
                  <option value="single">Only this water plan ({pausingSub.water_type} - {pausingSub.container})</option>
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
              <h3 className="font-bold text-white text-lg font-gradient">Resume Water Delivery 📅</h3>
              <button onClick={() => setResumingSub(null)} className="text-gray-400 hover:text-white text-2xl leading-none">&times;</button>
            </div>
            <p className="text-gray-400 text-sm mb-4">
              Select a date to resume your water deliveries. The suggested dates coordinate with our active delivery boy routes.
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
                      className={`p-3 rounded-xl border text-left transition-all duration-200 ${
                        selectedResumeDate === date
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
                <label className="label">Select restart date</label>
                <input
                  type="date"
                  className="input"
                  min={getMinStartDate()}
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Subscribe Form (Only show if no active or paused water subscription exists) */}
        <div className="lg:col-span-1">
          {!waters.some(w => ["active", "paused"].includes(w.status)) ? (
            <div className="card space-y-4">
              <h3 className="font-bold text-white text-lg border-b border-gray-800 pb-3">New Water Plan</h3>
              
              {/* Type toggle */}
              <div className="flex gap-2 bg-gray-800 rounded-xl p-1 w-full">
                {["monthly", "yearly"].map(t => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setSelectedType(t)}
                    className={`flex-1 py-2 rounded-lg text-xs font-medium transition-all ${selectedType === t ? "bg-fresh-600 text-white" : "text-gray-400 hover:text-white"}`}
                  >
                    {t === "yearly" ? "🏆 Yearly (-25%)" : "📅 Monthly"}
                  </button>
                ))}
              </div>

              <form onSubmit={handleOpenPayment} className="space-y-4">
                <div>
                  <label className="label">Select Water Plan</label>
                  <select
                    className="input capitalize"
                    value={form.product_id || ""}
                    onChange={e => handleProductChange(e.target.value)}
                    required
                  >
                    <option value="">Choose water plan...</option>
                    {products.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.name} (₹{parseFloat(p.selling_price_per_gm || 0).toFixed(2)} / bottle)
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label">Frequency</label>
                  <select className="input" value={form.frequency} onChange={e => setForm({...form, frequency: e.target.value})}>
                    <option value="daily">Daily Delivery (30 days)</option>
                    <option value="alternate">Alternate Days (Mon-Wed-Fri...)</option>
                  </select>
                </div>
                <div>
                  <label className="label">Delivery Address</label>
                  {addresses.length === 0 ? (
                    <div className="flex flex-col gap-2">
                      <p className="text-yellow-400 text-xs font-semibold">⚠️ No delivery address found.</p>
                      <button type="button" onClick={() => navigate("/addresses")} className="btn-secondary text-xs py-1.5 w-fit">📍 Add Address</button>
                    </div>
                  ) : (
                    <select 
                      className="input text-sm" 
                      value={selectedAddressId} 
                      onChange={e => setSelectedAddressId(e.target.value)}
                    >
                      {addresses.map(a => (
                        <option key={a.id} value={a.id}>
                          {a.address_line}, {a.city} {a.is_default ? "(Default)" : ""}
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                {/* Price Preview */}
                <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Price per Bottle:</span>
                    <span className="text-white font-semibold">₹{pricePerBottle.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Total Deliveries:</span>
                    <span className="text-white font-semibold">{totalServices}</span>
                  </div>
                  {selectedType === "yearly" && (
                    <div className="flex justify-between text-xs text-fresh-400">
                      <span>Annual Discount Applied:</span>
                      <span>-25%</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm pt-2 border-t border-gray-700 font-bold">
                    <span className="text-white">Amount Due:</span>
                    <span className="text-gradient">₹{totalPrice.toFixed(2)}</span>
                  </div>
                </div>

                <button type="submit" disabled={subscribing || !matchedProduct} className="btn-primary w-full py-2.5">
                  {subscribing ? "Processing Payment..." : "Purchase Water Plan"}
                </button>
              </form>
            </div>
          ) : (
            <div className="card bg-gray-800/10 border-dashed border-gray-800 text-center py-12 text-gray-500">
              <p className="text-4xl mb-3">💧</p>
              <p className="text-sm">You currently have an active or paused Alkaline Water subscription.</p>
            </div>
          )}
        </div>

        {/* Existing Subscriptions List */}
        <div className="lg:col-span-2 space-y-4">
          <h3 className="font-bold text-white text-lg">Your Water Subscriptions</h3>
          {waters.map(w => (
            <div key={w.id} className="card space-y-4">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-3 mb-1">
                    <h3 className="text-lg font-bold text-white capitalize">{w.water_type} Water</h3>
                    <span className={`badge ${statusBadge(w.status)}`}>{w.status}</span>
                    <span className="badge badge-gray capitalize">{w.type}</span>
                  </div>
                   <p className="text-gray-400 text-sm capitalize">{w.container} bottle · {w.frequency} · ₹{w.price_per_bottle}/bottle</p>
                  
                  {w.start_date ? (
                    <p className="text-gray-500 text-xs mt-1.5">
                      📅 {w.start_date} → {w.end_date} · {w.services_completed}/{w.total_services} deliveries done
                    </p>
                  ) : (
                    <p className="text-yellow-400 text-xs mt-1.5 font-semibold">⚠️ Start date not confirmed yet</p>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-3 pt-3 border-t border-gray-800">
                {w.status === "active" && (
                  <>
                    <button onClick={() => {
                      setPausingSub(w);
                      setPauseType("monthly");
                      setDaysToPause(5);
                      setPauseScope("single");
                      setPausingMsg("");
                    }} className="btn-secondary text-xs py-1.5 px-4">
                      ⏸ Pause Plan
                    </button>
                    <button onClick={() => handleCancel(w.id)} className="btn-danger text-xs py-1.5 px-3">✕ Cancel</button>
                  </>
                )}

                {w.status === "paused" && (
                  <>
                    <button onClick={() => startResumeFlow(w)} className="btn-primary text-xs py-1.5 px-4">▶ Resume</button>
                    <button onClick={() => handleCancel(w.id)} className="btn-danger text-xs py-1.5 px-3">✕ Cancel</button>
                  </>
                )}

                {!w.start_date && w.status === "active" && (
                  <button 
                    onClick={() => {
                      setCurrentSubId(w.id);
                      api.get("/water/available-dates").then(res => {
                        setAvailableDates(res.data.available_dates || []);
                        setSelectedDate("");
                        setStep("confirm_date");
                      });
                    }}
                    className="btn-primary text-xs py-1.5 px-4"
                  >
                    Confirm Start Date 📅
                  </button>
                )}
              </div>
            </div>
          ))}

          {waters.length === 0 && (
            <div className="card text-center py-12 text-gray-500">
              <p className="text-5xl mb-3">💧</p>
              <p className="text-lg text-white font-medium mb-1">No water subscriptions yet</p>
              <p className="text-sm">Configure your water type and frequency on the left to start receiving premium alkaline water.</p>
            </div>
          )}
        </div>
      </div>

      {/* Address Choice Modal */}
      {showAddressChoiceModal && matchedProduct && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#0f172a] border border-gray-800 rounded-3xl p-6 w-full max-w-md shadow-2xl relative animate-scale-up">
            <button
              onClick={() => setShowAddressChoiceModal(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-white text-2xl leading-none"
            >
              &times;
            </button>
            <h2 className="text-xl font-bold text-white mb-4">📍 Where to deliver?</h2>
            <p className="text-gray-400 text-sm mb-6">Aap {form.water_type} water deliveries kahan receive karna chahte hain?</p>
            
            <div className="space-y-4">
              <label className={`block p-4 rounded-xl border cursor-pointer transition-all ${addressChoiceMode === 'existing' ? 'border-fresh-500 bg-fresh-900/20' : 'border-gray-700 bg-gray-800/40'}`}>
                <div className="flex items-center gap-3">
                  <input 
                    type="radio" 
                    name="addressChoice" 
                    checked={addressChoiceMode === 'existing'} 
                    onChange={() => setAddressChoiceMode('existing')}
                    className="w-4 h-4 accent-fresh-500"
                  />
                  <span className="text-white font-medium">Use my existing address</span>
                </div>
                {addressChoiceMode === 'existing' && (
                  <div className="mt-3 ml-7">
                    {addresses.length === 0 ? (
                      <p className="text-yellow-400 text-xs">Aapka koi saved address nahi hai.</p>
                    ) : (
                      <select
                        className="input py-2 text-sm w-full"
                        value={selectedAddressId}
                        onChange={e => setSelectedAddressId(e.target.value)}
                      >
                        {addresses.map(a => (
                          <option key={a.id} value={a.id}>
                            {a.address_line}, {a.city} {a.is_default ? "(Default)" : ""}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                )}
              </label>

              <label className={`block p-4 rounded-xl border cursor-pointer transition-all ${addressChoiceMode === 'new' ? 'border-fresh-500 bg-fresh-900/20' : 'border-gray-700 bg-gray-800/40'}`}>
                <div className="flex items-center gap-3">
                  <input 
                    type="radio" 
                    name="addressChoice" 
                    checked={addressChoiceMode === 'new'} 
                    onChange={() => setAddressChoiceMode('new')}
                    className="w-4 h-4 accent-fresh-500"
                  />
                  <span className="text-white font-medium">Deliver to a new address</span>
                </div>
              </label>
            </div>

            <div className="mt-8 flex gap-3">
              <button 
                onClick={() => {
                  setShowAddressChoiceModal(false);
                  if (addressChoiceMode === 'new') {
                    setShowInlineAddressModal(true);
                  } else {
                    if (addresses.length === 0) {
                       setMsg("❌ Please add an address first.");
                       return;
                    }
                    setShowRazorpay(true);
                  }
                }}
                className="btn-primary w-full py-3"
              >
                Continue to Payment →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Inline Address Modal */}
      {showInlineAddressModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-gray-900 border border-gray-800 rounded-3xl p-6 w-full max-w-md animate-scale-up space-y-4 relative">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-white text-base">Add New Address</h3>
              <button
                type="button"
                onClick={() => setShowInlineAddressModal(false)}
                className="text-gray-400 hover:text-white text-2xl leading-none"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleSaveInlineAddress} className="space-y-3">
              <div>
                <label className="label text-xs">Address Line</label>
                <input
                  type="text"
                  className="input py-1.5 text-xs"
                  placeholder="House No, Apartment, Street name..."
                  value={inlineAddressForm.address_line}
                  onChange={e => setInlineAddressForm({ ...inlineAddressForm, address_line: e.target.value })}
                  required
                />
              </div>

              <div>
                <label className="label text-xs">Landmark (Optional)</label>
                <input
                  type="text"
                  className="input py-1.5 text-xs"
                  placeholder="Near temple, hospital..."
                  value={inlineAddressForm.landmark}
                  onChange={e => setInlineAddressForm({ ...inlineAddressForm, landmark: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label text-xs">City</label>
                  <input
                    type="text"
                    className="input py-1.5 text-xs"
                    placeholder="City"
                    value={inlineAddressForm.city}
                    onChange={e => setInlineAddressForm({ ...inlineAddressForm, city: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label className="label text-xs">Pincode</label>
                  <input
                    type="text"
                    className="input py-1.5 text-xs"
                    placeholder="Pincode"
                    value={inlineAddressForm.pincode}
                    onChange={e => setInlineAddressForm({ ...inlineAddressForm, pincode: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="inline-default-chk"
                  className="w-4 h-4 accent-green-500"
                  checked={inlineAddressForm.is_default}
                  onChange={e => setInlineAddressForm({ ...inlineAddressForm, is_default: e.target.checked })}
                />
                <label htmlFor="inline-default-chk" className="text-xs text-gray-300 cursor-pointer">Set as default address</label>
              </div>

              <div className="flex gap-3 pt-3 border-t border-gray-850">
                <button
                  type="submit"
                  disabled={savingInlineAddress}
                  className="btn-primary flex-1 py-1.5 text-xs"
                >
                  {savingInlineAddress ? "Saving..." : "Save & Continue"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowInlineAddressModal(false)}
                  className="btn-secondary py-1.5 text-xs"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Razorpay Simulated Checkout Drawer/Modal */}
      {showRazorpay && matchedProduct && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-[#0b1220] border border-gray-700/80 rounded-3xl p-6 w-full max-w-md shadow-2xl space-y-6 relative overflow-hidden animate-slide-up">
            {/* Razorpay Brand Header */}
            <div className="flex items-center justify-between border-b border-gray-800 pb-4">
              <div className="flex items-center gap-2">
                <span className="text-blue-400 font-extrabold text-xl tracking-tight">Razorpay</span>
                <span className="bg-blue-500/10 text-blue-400 text-[10px] font-bold px-1.5 py-0.5 rounded border border-blue-500/20">SECURE CHECKOUT</span>
              </div>
              <button 
                type="button"
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
                    <span className="text-gray-400">Water Type:</span>
                    <span className="font-semibold text-white capitalize">{form.water_type} Water</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-400">Container:</span>
                    <span className="font-semibold text-white capitalize">{form.container}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-400">Duration:</span>
                    <span className="font-semibold text-white capitalize">{selectedType} Plan</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-400">Deliveries:</span>
                    <span className="font-semibold text-white">{totalServices} services</span>
                  </div>
                  <div className="border-t border-gray-800/80 my-1"></div>
                  <div className="flex justify-between items-center text-base font-bold">
                    <span className="text-gray-200">Amount Due:</span>
                    <span className="text-gradient">
                      ₹{totalPrice.toFixed(2)}
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
                    type="button"
                    onClick={handleSimulatedPayment} 
                    className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition-all duration-300 shadow-lg shadow-blue-950 flex items-center justify-center gap-2"
                  >
                    🔒 Pay ₹{totalPrice.toFixed(2)} Securely
                  </button>
                  <button 
                    type="button"
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
