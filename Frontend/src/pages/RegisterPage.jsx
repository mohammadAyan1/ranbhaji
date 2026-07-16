import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import useAuthStore from "../store/authStore";

export default function RegisterPage() {
  const [form, setForm] = useState({ name: "", phone: "", email: "", password: "" });
  const [error, setError] = useState("");
  const { register, isLoading } = useAuthStore();
  const navigate = useNavigate();

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
          <h1 className="text-4xl font-bold text-gray-900">FreshBox</h1>
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
