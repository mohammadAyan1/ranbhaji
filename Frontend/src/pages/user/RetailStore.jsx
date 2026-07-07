import { useEffect, useState } from "react";
import api from "../../api/axios";

export default function RetailStore() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");

  // Cart State: { product_id: { product, quantity } }
  const [cart, setCart] = useState({});

  // Addresses State
  const [addresses, setAddresses] = useState([]);
  const [selectedAddressId, setSelectedAddressId] = useState("");

  // Inline Address Modal State
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [addressForm, setAddressForm] = useState({
    address_line: "",
    city: "",
    pincode: "",
    landmark: "",
    is_default: true
  });
  const [savingAddress, setSavingAddress] = useState(false);

  // Checkout State
  const [paymentMethod, setPaymentMethod] = useState("cod");
  const [checkingOut, setCheckingOut] = useState(false);
  const [showAddressChoiceModal, setShowAddressChoiceModal] = useState(false);
  const [addressChoiceMode, setAddressChoiceMode] = useState("existing");

  // 8 PM Cutoff calculation
  const now = new Date();
  const currentHour = now.getHours();
  const deliveryTomorrow = currentHour < 20;

  const getExpectedDeliveryDate = () => {
    const d = new Date();
    if (currentHour < 20) {
      d.setDate(d.getDate() + 1);
    } else {
      d.setDate(d.getDate() + 2);
    }
    return d.toLocaleDateString("en-IN", { day: "numeric", month: "long", weekday: "long" });
  };

  const fetchProducts = () => {
    api.get("/products")
      .then(r => setProducts(r.data.products || []))
      .finally(() => setLoading(false));
  };

  const fetchAddresses = () => {
    api.get("/addresses").then(r => {
      const addrs = r.data.addresses || [];
      setAddresses(addrs);
      const def = addrs.find(a => a.is_default);
      if (def) setSelectedAddressId(def.id);
      else if (addrs.length > 0) setSelectedAddressId(addrs[0].id);
    });
  };

  useEffect(() => {
    fetchProducts();
    fetchAddresses();
  }, []);

  const addToCart = (product) => {
    setCart(prev => {
      const existing = prev[product.id];
      const initialQty = product.unit === 'piece' ? 1 : 0.1; // default 100gm (0.1kg) or 1 piece
      return {
        ...prev,
        [product.id]: {
          product,
          quantity: existing ? parseFloat((existing.quantity + initialQty).toFixed(2)) : initialQty
        }
      };
    });
  };

  const updateCartQty = (productId, qty) => {
    if (qty <= 0) {
      removeFromCart(productId);
      return;
    }
    setCart(prev => ({
      ...prev,
      [productId]: {
        ...prev[productId],
        quantity: parseFloat(qty)
      }
    }));
  };

  const removeFromCart = (productId) => {
    setCart(prev => {
      const updated = { ...prev };
      delete updated[productId];
      return updated;
    });
  };

  // Inline Address Submission
  const handleSaveAddress = async (e) => {
    e.preventDefault();
    if (!addressForm.address_line || !addressForm.city || !addressForm.pincode) {
      setMsg("❌ Please fill all required fields for address");
      return;
    }
    setSavingAddress(true);
    setMsg("");

    try {
      const res = await api.post("/addresses", addressForm);
      const newAddress = res.data.address;
      setAddressForm({
        address_line: "",
        city: "",
        pincode: "",
        landmark: "",
        is_default: true
      });
      setShowAddressModal(false);
      fetchAddresses();
      if (newAddress) setSelectedAddressId(newAddress.id);
      setMsg("✅ Address added successfully!");
      if (cartItems.length > 0) {
        processCheckout();
      }
    } catch (err) {
      setMsg(`❌ Failed to add address: ${err.response?.data?.message || err.message}`);
    } finally {
      setSavingAddress(false);
    }
  };

  // Place Retail Order / Initiate payment
  const handleCheckout = () => {
    const cartItems = Object.values(cart);
    if (cartItems.length === 0) {
      setMsg("❌ Your cart is empty.");
      return;
    }

    setShowAddressChoiceModal(true);
    setAddressChoiceMode("existing");
  };

  const processCheckout = async () => {
    if (!selectedAddressId) {
      setMsg("❌ Please select a delivery address first.");
      return;
    }
    const cartItems = Object.values(cart);
    if (cartItems.length === 0) {
      setMsg("❌ Your cart is empty.");
      return;
    }

    setCheckingOut(true);
    setMsg("");

    const itemsPayload = cartItems.map(item => ({
      product_id: item.product.id,
      quantity: item.quantity
    }));

    try {
      if (paymentMethod === "cod" || paymentMethod === "wallet") {
        await api.post("/retail", {
          address_id: parseInt(selectedAddressId),
          items: itemsPayload,
          payment_method: paymentMethod
        });
        setCart({});
        setMsg(paymentMethod === "wallet" ? "✅ Order placed successfully (Paid via Wallet)!" : "✅ Order placed successfully (COD)! Delivery team will contact you.");
        window.scrollTo({ top: 0, behavior: "smooth" });
      } else {
        // PhonePe Pay Online
        const res = await api.post("/payment/phonepe/initiate", {
          type: "retail",
          address_id: parseInt(selectedAddressId),
          items: itemsPayload
        });
        if (res.data.redirectUrl) {
          window.location.href = res.data.redirectUrl;
        }
      }
    } catch (err) {
      setMsg(`❌ Checkout failed: ${err.response?.data?.message || err.message}`);
    } finally {
      setCheckingOut(false);
    }
  };

  const getPricePerKg = (product) => {
    const prc = parseFloat(product.selling_price_per_gm || 0);
    if (product.unit === 'gm' || product.unit === 'ml') {
      return prc * 1000;
    }
    return prc;
  };

  const formatProductPrice = (product) => {
    const rate = getPricePerKg(product);
    if (product.unit === 'gm') return `₹${rate.toFixed(2)} / kg`;
    if (product.unit === 'ml') return `₹${rate.toFixed(2)} / Liter`;
    return `₹${rate.toFixed(2)} / piece`;
  };

  // Cart Calculations
  const cartItems = Object.values(cart);
  const subtotal = cartItems.reduce((sum, item) => {
    const rate = getPricePerKg(item.product);
    return sum + (item.quantity * rate);
  }, 0);
  const deliveryCharge = cartItems.length > 0 ? 30.00 : 0;
  const grandTotal = subtotal + deliveryCharge;

  const filteredProducts = products.filter(p => filterCategory === "all" || p.category === filterCategory);

  if (loading) return <div className="flex items-center justify-center h-64 text-gray-600">Loading shop products...</div>;

  return (
    <div className="space-y-6 animate-fade-in relative">
      <div>
        <h1 className="page-header">Retail Store 🛒</h1>
        <p className="page-sub">Directly buy fresh vegetables, fruits, water, and salads</p>
      </div>

      {/* 8 PM Cutoff Banner */}
      <div className={`rounded-2xl p-4 border flex items-center justify-between gap-4 ${deliveryTomorrow
        ? "bg-fresh-950/20 border-fresh-800/40 text-fresh-600"
        : "bg-orange-950/20 border-orange-850/40 text-orange-400"
        }`}>
        <div>
          <p className="font-bold text-sm">
            {deliveryTomorrow
              ? "⚡ Ordered before 8:00 PM: Delivery Tomorrow!"
              : "⏳ Ordered after 8:00 PM: Delivery day after tomorrow!"}
          </p>
          <p className="text-xs text-gray-600 mt-0.5">
            Expected Delivery: <strong className="text-gray-900">{getExpectedDeliveryDate()}</strong>
          </p>
        </div>
        <span className="text-2xl">{deliveryTomorrow ? "🚚" : "🌙"}</span>
      </div>

      {msg && (
        <div className={`rounded-xl px-4 py-3 text-sm ${msg.startsWith("✅") ? "bg-fresh-100/30 text-fresh-600 border border-fresh-700/50" : "bg-red-900/30 text-red-600 border border-red-700/50"}`}>
          {msg}
        </div>
      )}

      {/* Shopping Layout: Catalog left, Cart right */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Products Grid */}
        <div className="lg:col-span-2 space-y-6">
          {/* Category Tabs */}
          <div className="flex flex-wrap gap-1.5 bg-gray-100/60 p-1.5 rounded-xl border border-gray-300 w-fit">
            {["all", "vegetable", "fruit", "water", "exotic", "salad"].map(c => (
              <button
                key={c}
                onClick={() => setFilterCategory(c)}
                className={`px-4 py-2 text-xs font-semibold capitalize rounded-lg transition-all ${filterCategory === c ? "bg-fresh-600 text-gray-900" : "text-gray-600 hover:text-gray-900"
                  }`}
              >
                {c === "all" ? "All Shop" : c}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {filteredProducts.map(p => {
              const inStock = true; // Always in stock as per requirement
              const cartItem = cart[p.id];

              return (
                <div key={p.id} className="card hover:border-fresh-700/40 hover:scale-[1.01] transition-all flex flex-col justify-between">
                  <div className="flex gap-4">
                    {p.image_url ? (
                      <div className="w-20 h-20 shrink-0">
                        <img 
                          src={`${import.meta.env.VITE_API_URL}${p.image_url}`} 
                          alt={p.name} 
                          className="w-full h-full object-cover rounded-xl border border-gray-300 bg-gray-100"
                        />
                      </div>
                    ) : (
                      <div className="w-20 h-20 shrink-0 rounded-xl bg-gray-100 border border-gray-300 flex items-center justify-center text-gray-500 text-xs">
                        No Img
                      </div>
                    )}
                    <div className="space-y-1 w-full">
                      <div className="flex items-start justify-between">
                        <h3 className="font-bold text-gray-900 text-lg">
                          {p.name} {p.hindi_name ? <span className="text-gray-600 font-normal text-sm block">({p.hindi_name})</span> : ""}
                        </h3>
                        <span className="badge badge-blue text-[10px] capitalize shrink-0 ml-2">{p.category}</span>
                      </div>
                      <p className="text-gray-600 text-xs capitalize">{p.sub_category || "Fresh Produce"}</p>
                      <p className="text-xl font-extrabold text-gradient pt-1">{formatProductPrice(p)}</p>
                    </div>
                  </div>

                  <div className="pt-4 mt-4 border-t border-gray-850 flex items-center justify-between">
                    <span className="text-[10px] font-bold text-fresh-600 bg-fresh-950/20 border border-fresh-800/30 px-2 py-0.5 rounded-full">
                      In Stock
                    </span>

                    {cartItem ? (
                      <div className="flex items-center gap-2 bg-gray-100 border border-gray-300 rounded-lg p-0.5">
                        <button
                          onClick={() => updateCartQty(p.id, parseFloat((cartItem.quantity - (p.unit === 'piece' ? 1 : 0.1)).toFixed(2)))}
                          className="w-7 h-7 flex items-center justify-center font-bold text-gray-600 hover:text-gray-900 hover:bg-gray-700 rounded-md transition-all"
                        >
                          -
                        </button>
                        <span className="text-gray-900 text-xs font-semibold px-1 min-w-[36px] text-center">
                          {cartItem.quantity} {p.unit === 'piece' ? 'pcs' : 'kg'}
                        </span>
                        <button
                          onClick={() => updateCartQty(p.id, parseFloat((cartItem.quantity + (p.unit === 'piece' ? 1 : 0.1)).toFixed(2)))}
                          className="w-7 h-7 flex items-center justify-center font-bold text-gray-600 hover:text-gray-900 hover:bg-gray-700 rounded-md transition-all"
                        >
                          +
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => addToCart(p)}
                        className="btn-primary text-xs py-1.5 px-4"
                      >
                        🛒 Add to Cart
                      </button>
                    )}
                  </div>
                </div>
              );
            })}

            {filteredProducts.length === 0 && (
              <div className="col-span-2 card text-center py-12 text-gray-500">No active products found in this category.</div>
            )}
          </div>
        </div>

        {/* Sidebar Shopping Cart */}
        <div className="lg:col-span-1 space-y-6">
          <div className="card sticky top-6 space-y-6">
            <div>
              <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                Shopping Cart 🛍️
                {cartItems.length > 0 && (
                  <span className="bg-fresh-600 text-gray-900 text-[10px] font-bold px-2 py-0.5 rounded-full">
                    {cartItems.length}
                  </span>
                )}
              </h2>
              <p className="text-gray-500 text-xs">Checkout and place order</p>
            </div>

            {/* Cart Items List */}
            {cartItems.length > 0 ? (
              <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
                {cartItems.map(item => {
                  const rate = getPricePerKg(item.product);
                  const cost = item.quantity * rate;

                  return (
                    <div key={item.product.id} className="flex items-center justify-between gap-4 py-2 border-b border-gray-850 last:border-b-0 text-sm">
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-gray-900 truncate">{item.product.name}</p>
                        <p className="text-gray-500 text-xs">
                          {item.quantity} {item.product.unit === 'piece' ? 'pcs' : 'kg'} @ ₹{rate.toFixed(2)}
                        </p>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className="text-gray-900 font-bold">₹{cost.toFixed(2)}</span>
                        <button
                          onClick={() => removeFromCart(item.product.id)}
                          className="text-gray-500 hover:text-red-600 text-base"
                        >
                          &times;
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500 text-xs">
                Your cart is empty. Add products from store.
              </div>
            )}

            {/* Delivery Location Section */}
            <div className="border-t border-gray-200 pt-4 space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-gray-600 text-xs uppercase tracking-wider font-bold">📍 Delivery Location</label>
              </div>

              {addresses.length === 0 ? (
                <div className="bg-yellow-950/10 border border-yellow-800/30 rounded-xl p-3 text-center space-y-2">
                  <p className="text-yellow-400 text-xs font-semibold">⚠️ Address required before checkout</p>
                  <button
                    onClick={() => setShowAddressModal(true)}
                    className="w-full btn-secondary py-1 text-xs"
                  >
                    + Create Address
                  </button>
                </div>
              ) : (
                <div className="bg-white/30 rounded-xl p-3 border border-gray-200 text-xs text-gray-700">
                  {(() => {
                    const addr = addresses.find(a => a.id === parseInt(selectedAddressId));
                    return addr ? `${addr.address_line}, ${addr.city} - ${addr.pincode}` : "No address selected";
                  })()}
                </div>
              )}
            </div>

            {/* Price Calculations */}
            {cartItems.length > 0 && (
              <div className="border-t border-gray-200 pt-4 space-y-2 text-xs">
                <div className="flex justify-between text-gray-600">
                  <span>Subtotal:</span>
                  <span>₹{subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>Delivery Charges:</span>
                  <span>₹{deliveryCharge.toFixed(2)}</span>
                </div>
                <div className="border-t border-gray-850/80 my-1"></div>
                <div className="flex justify-between text-sm font-bold text-gray-900">
                  <span>Grand Total:</span>
                  <span className="text-gradient">₹{grandTotal.toFixed(2)}</span>
                </div>
              </div>
            )}

            {/* Checkout Form */}
            {cartItems.length > 0 && (
              <div className="space-y-4">
                {/* Payment Selection */}
                <div className="space-y-2">
                  <p className="text-gray-600 text-xs font-bold uppercase tracking-wider">Payment Mode</p>
                  <div className="grid grid-cols-1 gap-2">
                    <button
                      onClick={() => setPaymentMethod("wallet")}
                      className={`py-2 rounded-xl border text-xs font-semibold transition-all ${paymentMethod === "wallet"
                        ? "border-purple-600 bg-purple-950/20 text-purple-400"
                        : "border-gray-200 bg-white/50 text-gray-600 hover:text-gray-900"
                        }`}
                    >
                      💳 Pay via Package Wallet
                    </button>
                    <div className="grid grid-cols-2 gap-2 mt-1">
                      <button
                        onClick={() => setPaymentMethod("cod")}
                        className={`py-2 rounded-xl border text-xs font-semibold transition-all ${paymentMethod === "cod"
                          ? "border-fresh-600 bg-fresh-950/20 text-fresh-600"
                          : "border-gray-200 bg-white/50 text-gray-600 hover:text-gray-900"
                          }`}
                      >
                        💵 Cash on Delivery
                      </button>
                      <button
                        onClick={() => setPaymentMethod("phonepe")}
                        className={`py-2 rounded-xl border text-xs font-semibold transition-all ${paymentMethod === "phonepe"
                          ? "border-blue-600 bg-blue-950/20 text-blue-400"
                          : "border-gray-200 bg-white/50 text-gray-600 hover:text-gray-900"
                          }`}
                      >
                        🌐 Pay Online
                      </button>
                    </div>
                  </div>
                </div>

                <button
                  onClick={handleCheckout}
                  disabled={checkingOut || !selectedAddressId}
                  className="w-full btn-primary py-3 font-bold"
                >
                  {checkingOut ? "Processing checkout..." : paymentMethod === 'phonepe' ? "Proceed to PhonePe Pay" : "Place COD Order"}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Address Choice Modal */}
      {showAddressChoiceModal && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#0f172a] border border-gray-200 rounded-3xl p-6 w-full max-w-md shadow-2xl relative animate-scale-up">
            <button
              onClick={() => setShowAddressChoiceModal(false)}
              className="absolute top-4 right-4 text-gray-600 hover:text-gray-900 text-2xl leading-none"
            >
              &times;
            </button>
            <h2 className="text-xl font-bold text-gray-900 mb-4">📍 Where to deliver?</h2>
            <p className="text-gray-600 text-sm mb-6">Aap apne retail order ki delivery kahan receive karna chahte hain?</p>

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
            </div>

            <div className="mt-8 flex gap-3">
              <button
                onClick={() => {
                  setShowAddressChoiceModal(false);
                  if (addressChoiceMode === 'new') {
                    setShowAddressModal(true);
                  } else {
                    if (addresses.length === 0) {
                      setMsg("❌ Please add an address first.");
                      return;
                    }
                    processCheckout();
                  }
                }}
                className="btn-primary w-full py-3"
              >
                Confirm Address & Pay →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Inline Address Creation Modal */}
      {showAddressModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-gray-200 rounded-3xl p-6 w-full max-w-md animate-scale-up space-y-4 relative">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-gray-900 text-lg">Add Delivery Address</h3>
              <button
                onClick={() => setShowAddressModal(false)}
                className="text-gray-600 hover:text-gray-900 text-2xl leading-none"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleSaveAddress} className="space-y-4">
              <div>
                <label className="label">Address Line</label>
                <input
                  type="text"
                  className="input"
                  placeholder="House No, Apartment, Street name..."
                  value={addressForm.address_line}
                  onChange={e => setAddressForm({ ...addressForm, address_line: e.target.value })}
                  required
                />
              </div>

              <div>
                <label className="label">Landmark (Optional)</label>
                <input
                  type="text"
                  className="input"
                  placeholder="Near temple, hospital..."
                  value={addressForm.landmark}
                  onChange={e => setAddressForm({ ...addressForm, landmark: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">City</label>
                  <input
                    type="text"
                    className="input"
                    placeholder="City"
                    value={addressForm.city}
                    onChange={e => setAddressForm({ ...addressForm, city: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label className="label">Pincode</label>
                  <input
                    type="text"
                    className="input"
                    placeholder="Pincode"
                    value={addressForm.pincode}
                    onChange={e => setAddressForm({ ...addressForm, pincode: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="modal-default-chk"
                  className="w-4 h-4 accent-green-500 animate-fade-in"
                  checked={addressForm.is_default}
                  onChange={e => setAddressForm({ ...addressForm, is_default: e.target.checked })}
                />
                <label htmlFor="modal-default-chk" className="text-xs text-gray-700 cursor-pointer">Set as default delivery address</label>
              </div>

              <div className="flex gap-3 pt-4 border-t border-gray-850">
                <button
                  type="submit"
                  disabled={savingAddress}
                  className="btn-primary flex-1 py-2 text-sm"
                >
                  {savingAddress ? "Saving Address..." : "Save and Select"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddressModal(false)}
                  className="btn-secondary py-2 text-sm"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
