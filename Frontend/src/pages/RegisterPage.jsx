import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import useAuthStore from "../store/authStore";
import api from "../api/axios";

export default function RegisterPage() {
  const [form, setForm] = useState({ name: "", phone: "", email: "", password: "", gender: "male", disliked_products: [] });
  const [error, setError] = useState("");
  const [vegetables, setVegetables] = useState([]);
  const { register, isLoading } = useAuthStore();
  const navigate = useNavigate();

  useEffect(() => {
    api.get("/products/public/vegetables").then(res => {
      setVegetables(res.data.products || []);
    }).catch(console.error);
  }, []);

  const handleCheckboxChange = (id) => {
    setForm(prev => {
      const dislikes = prev.disliked_products.includes(id)
        ? prev.disliked_products.filter(pId => pId !== id)
        : [...prev.disliked_products, id];
      return { ...prev, disliked_products: dislikes };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    try {
      await register(form);
      navigate("/verify-otp", { state: { phone: form.phone } });
    } catch (err) {
      setError(err.response?.data?.message || "Registration failed");
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-fresh-600/10 rounded-full blur-3xl"></div>
      </div>

      <div className="relative w-full max-w-md animate-slide-up">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-fresh-600 rounded-2xl text-3xl mb-4 shadow-lg shadow-fresh-600/30">🥦</div>
          <h1 className="text-4xl font-bold text-gray-900">RamBhaji</h1>
          <p className="text-gray-600 mt-1">Create your account</p>
        </div>

        <div className="card-glass">
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 mb-5 text-red-600 text-sm">{error}</div>
          )}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">Full Name</label>
              <input id="name" type="text" className="input" placeholder="Raju Kumar" value={form.name} onChange={e => setForm({...form, name: e.target.value})} required />
            </div>
            <div>
              <label className="label">Phone Number</label>
              <input id="reg-phone" type="tel" className="input" placeholder="9876543210" value={form.phone} onChange={e => {
                const val = e.target.value.replace(/\D/g, "").slice(0, 10);
                setForm({...form, phone: val});
              }} maxLength={10} required />
            </div>
            <div>
              <label className="label">Email (optional)</label>
              <input id="reg-email" type="email" className="input" placeholder="raju@example.com" value={form.email} onChange={e => setForm({...form, email: e.target.value})} />
            </div>
            <div>
              <label className="label">Password</label>
              <input id="reg-password" type="password" className="input" placeholder="••••••••" value={form.password} onChange={e => setForm({...form, password: e.target.value})} required />
            </div>
            <div>
              <label className="label">Gender</label>
              <select id="reg-gender" className="input" value={form.gender} onChange={e => setForm({...form, gender: e.target.value})}>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </div>
            
            {/* Disliked Vegetables Section */}
            {vegetables.length > 0 && (
              <div className="pt-2 border-t border-gray-100">
                <label className="label">Select vegetables you don't like (Optional)</label>
                <div className="text-xs text-gray-500 mb-2">We will not include these in your automated deliveries.</div>
                <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto p-2 bg-gray-50 rounded-lg border border-gray-100">
                  {vegetables.map(veg => (
                    <label key={veg.id} className="flex items-center space-x-2 text-sm cursor-pointer hover:bg-gray-100 p-1 rounded">
                      <input 
                        type="checkbox" 
                        className="rounded border-gray-300 text-fresh-600 focus:ring-fresh-500"
                        checked={form.disliked_products.includes(veg.id)}
                        onChange={() => handleCheckboxChange(veg.id)}
                      />
                      <span>{veg.name} <span className="text-gray-400 text-xs">({veg.hindi_name})</span></span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            <button type="submit" id="register-btn" disabled={isLoading} className="btn-primary w-full mt-2">
              {isLoading ? "Creating account..." : "Create Account"}
            </button>
          </form>
          <p className="text-center text-gray-600 text-sm mt-5">
            Already have an account? <Link to="/login" className="text-fresh-600 hover:text-fresh-700 font-medium">Sign In</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
