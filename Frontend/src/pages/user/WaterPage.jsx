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
  const [activeBatches, setActiveBatches] = useState([]);
  const [selectedBatchId, setSelectedBatchId] = useState("");
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
  const [form, setForm] = useState({ product_id: "", water_type: "health", container: "glass", frequency: "daily", bottles_per_day: 1 });

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
  const [pauseFromDate, setPauseFromDate] = useState("");
  const [pauseToDate, setPauseToDate] = useState("");
  const [pauseScope, setPauseScope] = useState("single");
  const [pausingMsg, setPausingMsg] = useState("");
  const [pausingLoader, setPausingLoader] = useState(false);

  const getMinStartDate = () => {
    const now = new Date();
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: "Asia/Kolkata",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false
    });
    const parts = formatter.formatToParts(now);
    const getPart = (type) => parts.find(p => p.type === type)?.value;
    const year = parseInt(getPart("year"), 10);
    const month = parseInt(getPart("month"), 10);
    const day = parseInt(getPart("day"), 10);
    const hour = parseInt(getPart("hour"), 10);

    const daysToAdd = hour < 20 ? 1 : 2;
    const target = new Date(Date.UTC(year, month - 1, day + daysToAdd));
    return target.toISOString().split("T")[0];
  };

  const calculatePauseDays = (from, to) => {
    if (!from || !to) return 0;
    const d1 = new Date(from);
    const d2 = new Date(to);
    const diffTime = d2 - d1;
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24)) + 1;
    return diffDays > 0 ? diffDays : 0;
  };

  const getResumeDateFromToDate = (to) => {
    if (!to) return "";
    const parts = to.split('-').map(Number);
    const d = new Date(Date.UTC(parts[0], parts[1] - 1, parts[2] + 1));
    return d.toISOString().split('T')[0];
  };

  const openPauseModal = (w) => {
    const minStart = getMinStartDate();
    setPausingSub(w);
    setPauseType("monthly");
    setPauseFromDate(minStart);
    const parts = minStart.split('-').map(Number);
    const d = new Date(Date.UTC(parts[0], parts[1] - 1, parts[2] + 4));
    setPauseToDate(d.toISOString().split('T')[0]);
    setPauseScope("single");
    setPausingMsg("");
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

    api.get("/user/batches")
      .then(r => {
        const b = r.data.batches || [];
        setActiveBatches(b);
        if (b.length > 0) setSelectedBatchId(b[0].id);
      })
      .catch(() => { });
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
  const bottleCapacity = matchedProduct ? (parseFloat(matchedProduct.water_capacity_liters) || 1) : 1;
  const bottlesCount = parseInt(form.bottles_per_day || 1);

  // Daily: 30 deliveries per month. Alternate: 15 deliveries per month.
  const servicesPerMonth = form.frequency === "daily" ? 30 : 15;
  const totalServices = selectedType === "yearly" ? servicesPerMonth * 12 : servicesPerMonth;
  const totalBottlesInPlan = totalServices * bottlesCount;
  const rawTotal = pricePerBottle * totalBottlesInPlan;
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

  const handleWalletPayment = async () => {
    setSubscribing(true); setMsg("");
    try {
      const res = await api.post("/water/subscribe", {
        product_id: form.product_id,
        water_type: form.water_type,
        container: form.container,
        frequency: form.frequency,
        type: selectedType,
        payment_method: "wallet",
        address_id: parseInt(selectedAddressId),
        batch_id: parseInt(selectedBatchId),
        capacity_liters: bottleCapacity,
        bottles_per_delivery: bottlesCount
      });
      setCurrentSubId(res.data.water_subscription_id);

      // Fetch available start dates
      const datesRes = await api.get("/water/available-dates");
      setAvailableDates(datesRes.data.available_dates || []);
      setSelectedDate("");
      setStep("confirm_date");
      setShowRazorpay(false);
      setMsg("✅ Wallet payment successful and water subscription purchased! Please select your delivery start date.");
      fetchWater();
    } catch (err) { setMsg(`❌ ${err.response?.data?.message || "Purchase failed"}`); }
    finally { setSubscribing(false); }
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
        product_id: form.product_id,
        water_type: form.water_type,
        container: form.container,
        frequency: form.frequency,
        type: selectedType,
        payment_method: "razorpay",
        address_id: parseInt(selectedAddressId),
        batch_id: parseInt(selectedBatchId),
        capacity_liters: bottleCapacity,
        bottles_per_delivery: bottlesCount
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
    if (!pauseFromDate || !pauseToDate) {
      setPausingMsg("❌ Please select both From Date and To Date");
      return;
    }
    const days = calculatePauseDays(pauseFromDate, pauseToDate);
    if (days <= 0) {
      setPausingMsg("❌ To Date must be on or after From Date");
      return;
    }
    const maxDays = pauseType === "monthly" ? 15 : 45;
    if (days > maxDays) {
      setPausingMsg(`❌ Maximum pause duration for ${pauseType} plan is ${maxDays} days. Selected: ${days} days.`);
      return;
    }

    setPausingLoader(true);
    setPausingMsg("");
    try {
      const res = await api.patch(`/water/${pausingSub.id}/pause`, {
        from_date: pauseFromDate,
        to_date: pauseToDate,
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
    const minDate = getMinStartDate();
    setSelectedResumeDate(minDate);
    setResumeMsg("");
    setResumeDates([]);
    try {
      const datesRes = await api.get("/water/available-dates");
      const validDates = (datesRes.data.available_dates || []).filter(d => d >= minDate);
      setResumeDates(validDates);
      if (validDates.length > 0 && !validDates.includes(minDate)) {
        setSelectedResumeDate(validDates[0]);
      }
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

  if (loading && waters.length === 0) return <div className="flex items-center justify-center h-64 text-gray-600">Loading water subscriptions...</div>;

  // ─── STEP: CONFIRM START DATE ───────────────────────────────────────────
  if (step === "confirm_date") {
    return (
      <div className="max-w-xl mx-auto space-y-6 animate-slide-up">
        <div>
          <h1 className="page-header">Select Start Date 📅</h1>
          <p className="page-sub">Choose when to start your Alkaline Water deliveries</p>
        </div>

        {msg && (
          <div className="rounded-xl px-4 py-3 text-sm bg-fresh-100/30 text-fresh-600 border border-fresh-700/50">
            {msg}
          </div>
        )}

        <div className="card">
          <p className="text-gray-600 text-sm mb-4">
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
                  className={`p-3 rounded-xl border text-left transition-all duration-200 ${selectedDate === date
                    ? "border-fresh-500 bg-fresh-50 border-fresh-200 text-fresh-600"
                    : "border-gray-300 bg-white text-gray-700 hover:border-gray-600"
                    }`}
                >
                  <p className="font-semibold text-sm">{dayName}</p>
                  <p className="text-xs text-gray-600 mt-0.5">{formatted}</p>
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
        <div className={`rounded-xl px-4 py-3 text-sm ${msg.startsWith("✅") ? "bg-fresh-100/30 text-fresh-600 border border-fresh-700/50" : "bg-red-900/30 text-red-600 border border-red-700/50"}`}>
          {msg}
        </div>
      )}

      {/* Pause Configuration Modal */}
      {pausingSub && (
        <div className="fixed inset-0 bg-gray-900/10 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-gray-300 rounded-2xl p-6 w-full max-w-md animate-slide-up space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-gray-900 text-lg font-gradient">Pause Water Subscription ⏸</h3>
              <button onClick={() => setPausingSub(null)} className="text-gray-600 hover:text-gray-900 text-2xl leading-none">&times;</button>
            </div>

            {pausingMsg && (
              <div className="rounded-xl px-4 py-3 text-sm bg-red-900/30 text-red-600 border border-red-700/50">
                {pausingMsg}
              </div>
            )}

            <div className="space-y-3">
              <div>
                <label className="label">Pause Plan Type</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setPauseType("monthly");
                      if (pauseFromDate) {
                        const parts = pauseFromDate.split('-').map(Number);
                        const d = new Date(Date.UTC(parts[0], parts[1] - 1, parts[2] + 4));
                        setPauseToDate(d.toISOString().split('T')[0]);
                      }
                    }}
                    className={`py-2 px-3 text-xs font-semibold rounded-xl border transition-all ${pauseType === "monthly" ? "border-fresh-500 bg-fresh-50 border-fresh-200 text-fresh-600" : "border-gray-200 text-gray-600 hover:border-gray-300"}`}
                  >
                    📅 Monthly Pause
                    <span className="block text-[10px] text-gray-500 font-normal mt-0.5">Max 15 days total</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setPauseType("yearly");
                      if (pauseFromDate) {
                        const parts = pauseFromDate.split('-').map(Number);
                        const d = new Date(Date.UTC(parts[0], parts[1] - 1, parts[2] + 9));
                        setPauseToDate(d.toISOString().split('T')[0]);
                      }
                    }}
                    className={`py-2 px-3 text-xs font-semibold rounded-xl border transition-all ${pauseType === "yearly" ? "border-fresh-500 bg-fresh-50 border-fresh-200 text-fresh-600" : "border-gray-200 text-gray-600 hover:border-gray-300"}`}
                  >
                    🏆 Yearly Pause
                    <span className="block text-[10px] text-gray-500 font-normal mt-0.5">Max 45 days (once a year)</span>
                  </button>
                </div>
              </div>

              {/* Date Pickers: From Date & To Date */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">From Date</label>
                  <input
                    type="date"
                    min={getMinStartDate()}
                    className="input text-sm"
                    value={pauseFromDate}
                    onChange={e => {
                      const newFrom = e.target.value;
                      setPauseFromDate(newFrom);
                      if (pauseToDate && newFrom > pauseToDate) {
                        setPauseToDate(newFrom);
                      }
                    }}
                    required
                  />
                  <p className="text-[10px] text-gray-500 mt-1">
                    Earliest cutoff: {getMinStartDate()}
                  </p>
                </div>
                <div>
                  <label className="label">To Date</label>
                  <input
                    type="date"
                    min={pauseFromDate || getMinStartDate()}
                    className="input text-sm"
                    value={pauseToDate}
                    onChange={e => setPauseToDate(e.target.value)}
                    required
                  />
                  <p className="text-[10px] text-gray-500 mt-1">
                    End of pause period
                  </p>
                </div>
              </div>

              {/* Dynamic Calculation Summary */}
              {(() => {
                const totalDays = calculatePauseDays(pauseFromDate, pauseToDate);
                const maxDays = pauseType === "monthly" ? 15 : 45;
                const isOverLimit = totalDays > maxDays;
                const resumeDate = getResumeDateFromToDate(pauseToDate);

                return (
                  <div className={`p-3 rounded-xl border text-xs space-y-1.5 ${isOverLimit ? 'bg-red-50 border-red-200 text-red-700' : 'bg-fresh-50/50 border-fresh-200 text-gray-700'}`}>
                    <div className="flex justify-between items-center">
                      <span className="font-medium">Total Pause Days:</span>
                      <span className={`font-bold ${isOverLimit ? 'text-red-600' : 'text-fresh-700'}`}>
                        {totalDays} day{totalDays !== 1 ? 's' : ''} (Max: {maxDays} days)
                      </span>
                    </div>
                    {resumeDate && (
                      <div className="flex justify-between items-center text-gray-600">
                        <span>Deliveries Resume On:</span>
                        <span className="font-semibold text-gray-900">{resumeDate}</span>
                      </div>
                    )}
                    <p className="text-[10px] text-gray-500 pt-1 border-t border-gray-200">
                      💧 Unfulfilled water servings during this pause window will be automatically shifted forward starting on {resumeDate || "the day after pause"}.
                    </p>
                  </div>
                );
              })()}

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

            <div className="flex gap-3 pt-4 border-t border-gray-200">
              <button
                onClick={handleConfirmPause}
                disabled={pausingLoader || !pauseFromDate || !pauseToDate || calculatePauseDays(pauseFromDate, pauseToDate) <= 0 || calculatePauseDays(pauseFromDate, pauseToDate) > (pauseType === "monthly" ? 15 : 45)}
                className="btn-primary flex-1 py-2 disabled:opacity-50 disabled:cursor-not-allowed"
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
        <div className="fixed inset-0 bg-gray-900/10 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-gray-300 rounded-2xl p-6 w-full max-w-md animate-slide-up">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-gray-900 text-lg font-gradient">Resume Water Delivery 📅</h3>
              <button onClick={() => setResumingSub(null)} className="text-gray-600 hover:text-gray-900 text-2xl leading-none">&times;</button>
            </div>
            <p className="text-gray-600 text-sm mb-4">
              Select a date to resume your water deliveries. The suggested dates coordinate with our active delivery boy routes.
            </p>

            {resumeMsg && (
              <div className="rounded-xl px-4 py-3 text-sm mb-4 bg-red-900/30 text-red-600 border border-red-700/50">
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
                        ? "border-fresh-500 bg-fresh-50 border-fresh-200 text-fresh-600"
                        : "border-gray-300 bg-white text-gray-700 hover:border-gray-600"
                        }`}
                    >
                      <p className="font-semibold text-sm">{dayName}</p>
                      <p className="text-xs text-gray-600 mt-0.5">{formatted}</p>
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
              <h3 className="font-bold text-gray-900 text-lg border-b border-gray-200 pb-3">New Water Plan</h3>

              {/* Type toggle */}
              <div className="flex gap-2 bg-gray-100 rounded-xl p-1 w-full">
                {["monthly", "yearly"].map(t => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setSelectedType(t)}
                    className={`flex-1 py-2 rounded-lg text-xs font-medium transition-all ${selectedType === t ? "bg-fresh-600 text-gray-900" : "text-gray-600 hover:text-gray-900"}`}
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
                        {p.name} {p.hindi_name ? `(${p.hindi_name})` : ""} - ₹{parseFloat(p.selling_price_per_gm || 0).toFixed(2)} / bottle ({parseFloat(p.water_capacity_liters || 1)}L)
                      </option>
                    ))}
                  </select>
                </div>

                {matchedProduct && (
                  <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-xs space-y-1.5 animate-fade-in">
                    <div className="flex justify-between items-center text-gray-700">
                      <span className="font-medium">Bottle Capacity:</span>
                      <span className="font-bold text-blue-700 bg-blue-100 px-2.5 py-0.5 rounded-full">{bottleCapacity} Liter ({bottleCapacity}L)</span>
                    </div>
                    <div className="flex justify-between items-center text-gray-700">
                      <span className="font-medium">Container Material:</span>
                      <span className="font-semibold text-gray-900 capitalize">{form.container} Bottle</span>
                    </div>
                  </div>
                )}

                <div>
                  <label className="label">Frequency</label>
                  <select className="input" value={form.frequency} onChange={e => setForm({ ...form, frequency: e.target.value })}>
                    <option value="daily">Daily Delivery (30 days)</option>
                    <option value="alternate">Alternate Days (Mon-Wed-Fri...)</option>
                  </select>
                </div>

                {/* Bottles per delivery / day selector */}
                <div>
                  <label className="label flex justify-between items-center">
                    <span>Bottles per Delivery ({form.frequency === 'daily' ? 'Per Day' : 'Per Service'})</span>
                    <span className="text-xs text-fresh-600 font-bold">{bottlesCount * bottleCapacity} Litres per delivery</span>
                  </label>
                  <div className="flex items-center gap-3 bg-gray-50 p-2 rounded-xl border border-gray-200">
                    <button
                      type="button"
                      onClick={() => setForm(prev => ({ ...prev, bottles_per_day: Math.max(1, bottlesCount - 1) }))}
                      disabled={bottlesCount <= 1}
                      className="w-9 h-9 rounded-lg bg-white border border-gray-300 font-bold text-gray-700 hover:bg-gray-100 disabled:opacity-40 transition-all flex items-center justify-center text-lg shadow-sm"
                    >
                      -
                    </button>
                    <div className="flex-1 text-center">
                      <span className="text-sm font-bold text-gray-900">{bottlesCount} Bottle{bottlesCount > 1 ? "s" : ""}</span>
                      <p className="text-[11px] text-gray-500">({bottlesCount * bottleCapacity} Litres / delivery)</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setForm(prev => ({ ...prev, bottles_per_day: bottlesCount + 1 }))}
                      className="w-9 h-9 rounded-lg bg-white border border-gray-300 font-bold text-gray-700 hover:bg-gray-100 transition-all flex items-center justify-center text-lg shadow-sm"
                    >
                      +
                    </button>
                  </div>
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
                <div>
                  <label className="label">Delivery Batch</label>
                  {activeBatches.length === 0 ? (
                    <div className="flex flex-col gap-2">
                      <p className="text-yellow-400 text-xs font-semibold">⚠️ No batches found.</p>
                    </div>
                  ) : (
                    <select
                      className="input text-sm"
                      value={selectedBatchId}
                      onChange={e => setSelectedBatchId(e.target.value)}
                    >
                      {activeBatches.map(b => (
                        <option key={b.id} value={b.id}>
                          {b.name} ({b.time_range})
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                {/* Price Preview */}
                <div className="bg-white rounded-xl p-4 border border-gray-300 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Price per Bottle:</span>
                    <span className="text-gray-900 font-semibold">₹{pricePerBottle.toFixed(2)} ({bottleCapacity}L)</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Daily Bottles:</span>
                    <span className="text-gray-900 font-semibold">{bottlesCount} bottle{bottlesCount > 1 ? "s" : ""} ({bottlesCount * bottleCapacity}L)</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Total Deliveries:</span>
                    <span className="text-gray-900 font-semibold">{totalServices} days</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Total Bottles in Plan:</span>
                    <span className="text-blue-600 font-bold">{totalBottlesInPlan} bottles ({totalBottlesInPlan * bottleCapacity}L)</span>
                  </div>
                  {selectedType === "yearly" && (
                    <div className="flex justify-between text-xs text-fresh-600">
                      <span>Annual Discount Applied:</span>
                      <span>-25%</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm pt-2 border-t border-gray-300 font-bold">
                    <span className="text-gray-900">Amount Due:</span>
                    <span className="text-gradient">₹{totalPrice.toFixed(2)}</span>
                  </div>
                </div>

                <button type="submit" disabled={subscribing || !matchedProduct} className="btn-primary w-full py-2.5">
                  {subscribing ? "Processing Payment..." : "Purchase Water Plan"}
                </button>
              </form>
            </div>
          ) : (
            <div className="card bg-gray-100/10 border-dashed border-gray-200 text-center py-12 text-gray-500">
              <p className="text-4xl mb-3">💧</p>
              <p className="text-sm">You currently have an active or paused Alkaline Water subscription.</p>
            </div>
          )}
        </div>

        {/* Existing Subscriptions List */}
        <div className="lg:col-span-2 space-y-4">
          <h3 className="font-bold text-gray-900 text-lg">Your Water Subscriptions</h3>
          {waters.map(w => (
            <div key={w.id} className="card space-y-4">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-3 mb-1">
                    <h3 className="text-lg font-bold text-gray-900 capitalize">{w.water_type} Water</h3>
                    <span className={`badge ${statusBadge(w.status)}`}>{w.status}</span>
                    <span className="badge badge-gray capitalize">{w.type}</span>
                  </div>
                  <p className="text-gray-600 text-sm capitalize">{w.bottles_per_delivery || 1} × {w.container} bottle ({parseFloat(w.capacity_liters || 1)}L) · {w.frequency} · ₹{w.price_per_bottle}/bottle</p>

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
              <div className="flex flex-wrap items-center gap-3 pt-3 border-t border-gray-200">
                {w.status === "active" && (
                  <>
                    <button onClick={() => openPauseModal(w)} className="btn-secondary text-xs py-1.5 px-4">
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
              <p className="text-lg text-gray-900 font-medium mb-1">No water subscriptions yet</p>
              <p className="text-sm">Configure your water type and frequency on the left to start receiving premium alkaline water.</p>
            </div>
          )}
        </div>
      </div>

      {/* Address Choice Modal */}
      {showAddressChoiceModal && matchedProduct && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#0f172a] border border-gray-200 rounded-3xl p-6 w-full max-w-md shadow-2xl relative animate-scale-up">
            <button
              onClick={() => setShowAddressChoiceModal(false)}
              className="absolute top-4 right-4 text-gray-600 hover:text-gray-900 text-2xl leading-none"
            >
              &times;
            </button>
            <h2 className="text-xl font-bold text-gray-900 mb-4">📍 Where to deliver?</h2>
            <p className="text-gray-600 text-sm mb-6">Aap {form.water_type} water deliveries kahan receive karna chahte hain?</p>

            <div className="space-y-4">
              <label className={`block p-4 rounded-xl border cursor-pointer transition-all ${addressChoiceMode === 'existing' ? 'border-fresh-500 bg-fresh-100/20' : 'border-gray-300 bg-gray-100/40'}`}>
                <div className="flex items-center gap-3">
                  <input
                    type="radio"
                    name="addressChoice"
                    checked={addressChoiceMode === 'existing'}
                    onChange={() => setAddressChoiceMode('existing')}
                    className="w-4 h-4 accent-fresh-500"
                  />
                  <span className="text-gray-900 font-medium">Use my existing address</span>
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

              <label className={`block p-4 rounded-xl border cursor-pointer transition-all ${addressChoiceMode === 'new' ? 'border-fresh-500 bg-fresh-100/20' : 'border-gray-300 bg-gray-100/40'}`}>
                <div className="flex items-center gap-3">
                  <input
                    type="radio"
                    name="addressChoice"
                    checked={addressChoiceMode === 'new'}
                    onChange={() => setAddressChoiceMode('new')}
                    className="w-4 h-4 accent-fresh-500"
                  />
                  <span className="text-gray-900 font-medium">Deliver to a new address</span>
                </div>
              </label>

              <div className="space-y-1.5 mt-2">
                <label className="text-gray-600 text-xs font-bold uppercase tracking-wider">⏱ Delivery Batch</label>
                {activeBatches.length === 0 ? (
                  <div className="bg-yellow-950/15 border border-yellow-800/30 rounded-xl p-3 text-center">
                    <p className="text-yellow-400 text-xs font-medium">⚠️ No batches available.</p>
                  </div>
                ) : (
                  <select
                    className="input py-2 text-sm w-full"
                    value={selectedBatchId}
                    onChange={e => setSelectedBatchId(e.target.value)}
                  >
                    <option value="" disabled>-- Select a batch --</option>
                    {activeBatches.map(b => (
                      <option key={b.id} value={b.id}>
                        {b.name} ({b.time_range})
                      </option>
                    ))}
                  </select>
                )}
              </div>
            </div>

            <div className="mt-8 flex gap-3">
              <button
                onClick={() => {
                  if (addressChoiceMode === 'new') {
                    setShowAddressChoiceModal(false);
                    setShowInlineAddressModal(true);
                  } else {
                    if (addresses.length === 0) {
                      setMsg("❌ Please add an address first.");
                      return;
                    }
                    if (!selectedBatchId) {
                      setMsg("❌ Please select a delivery batch.");
                      return;
                    }
                    setShowAddressChoiceModal(false);
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
          <div className="bg-white border border-gray-200 rounded-3xl p-6 w-full max-w-md animate-scale-up space-y-4 relative">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-gray-900 text-base">Add New Address</h3>
              <button
                type="button"
                onClick={() => setShowInlineAddressModal(false)}
                className="text-gray-600 hover:text-gray-900 text-2xl leading-none"
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
                <label htmlFor="inline-default-chk" className="text-xs text-gray-700 cursor-pointer">Set as default address</label>
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
          <div className="bg-[#0b1220] border border-gray-300/80 rounded-3xl p-6 w-full max-w-md shadow-2xl space-y-6 relative overflow-hidden animate-slide-up">
            {/* Razorpay Brand Header */}
            <div className="flex items-center justify-between border-b border-gray-200 pb-4">
              <div className="flex items-center gap-2">
                <span className="text-blue-400 font-extrabold text-xl tracking-tight">Razorpay</span>
                <span className="bg-blue-500/10 text-blue-400 text-[10px] font-bold px-1.5 py-0.5 rounded border border-blue-500/20">SECURE CHECKOUT</span>
              </div>
              <button
                type="button"
                onClick={() => setShowRazorpay(false)}
                className="text-gray-600 hover:text-gray-900 text-2xl leading-none transition-colors"
                disabled={paymentStatus === "processing"}
              >
                &times;
              </button>
            </div>

            {paymentStatus === "idle" && (
              <div className="space-y-5">
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Merchant</p>
                  <p className="text-sm font-bold text-gray-900">RamBhaji Delivery Subscriptions</p>
                </div>

                <div className="bg-white/50 rounded-2xl p-4 border border-gray-200 space-y-3">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-600">Water Type:</span>
                    <span className="font-semibold text-gray-900 capitalize">{form.water_type} Water</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-600">Container:</span>
                    <span className="font-semibold text-gray-900 capitalize">{form.container}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-600">Duration:</span>
                    <span className="font-semibold text-gray-900 capitalize">{selectedType} Plan</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-600">Deliveries:</span>
                    <span className="font-semibold text-gray-900">{totalServices} services</span>
                  </div>
                  <div className="border-t border-gray-200/80 my-1"></div>
                  <div className="flex justify-between items-center text-base font-bold">
                    <span className="text-gray-800">Amount Due:</span>
                    <span className="text-gradient">
                      ₹{totalPrice.toFixed(2)}
                    </span>
                  </div>
                </div>

                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-1">Delivery Info</p>
                  <div className="bg-white/30 rounded-xl p-3 border border-gray-200 text-xs text-gray-700 flex flex-col gap-1.5">
                    <div className="flex justify-between">
                      <span className="text-gray-600 font-medium">Address:</span>
                      <span className="text-right max-w-[200px] truncate">
                        {(() => {
                          const addr = addresses.find(a => a.id === parseInt(selectedAddressId));
                          return addr ? `${addr.address_line}, ${addr.city}` : "New Address";
                        })()}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 font-medium">Batch:</span>
                      <span className="text-right font-semibold text-gray-900">
                        {activeBatches.find(b => b.id === parseInt(selectedBatchId))?.name || "Not selected"}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-3 pt-2">
                  <button
                    type="button"
                    onClick={handleSimulatedPayment}
                    className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-gray-900 font-bold rounded-xl transition-all duration-300 shadow-lg shadow-blue-950 flex items-center justify-center gap-2"
                  >
                    🔒 Pay ₹{totalPrice.toFixed(2)} Securely
                  </button>
                  <button
                    type="button"
                    onClick={handleWalletPayment}
                    disabled={subscribing}
                    className="w-full py-3 bg-green-600 hover:bg-green-500 text-white font-bold rounded-xl transition-all duration-300 shadow-lg shadow-green-900/50 flex items-center justify-center gap-2"
                  >
                    {subscribing ? "Processing..." : `💳 Pay ₹${totalPrice.toFixed(2)} via Wallet`}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowRazorpay(false)}
                    className="w-full py-2.5 bg-transparent hover:bg-white text-gray-600 hover:text-gray-900 font-medium rounded-xl transition-all text-sm"
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
                  <p className="text-gray-900 font-semibold text-base">Processing Payment...</p>
                  <p className="text-xs text-gray-600 animate-pulse">{paymentProgressMsg}</p>
                </div>
              </div>
            )}

            {paymentStatus === "success" && (
              <div className="flex flex-col items-center justify-center py-10 space-y-4 animate-scale-up">
                <div className="w-16 h-16 bg-green-500/10 border border-green-500/30 rounded-full flex items-center justify-center text-green-400 text-3xl">
                  ✓
                </div>
                <div className="text-center space-y-1">
                  <p className="text-gray-900 font-bold text-lg">Payment Successful</p>
                  <p className="text-xs text-gray-600">Reference: pay_sim_{Math.random().toString(36).substr(2, 9)}</p>
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
