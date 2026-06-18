import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import useAuthStore from "../store/authStore";

export default function LoginPage() {
  const [form, setForm] = useState({ phone: "", password: "" });
  const [error, setError] = useState("");
  const { login, isLoading } = useAuthStore();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    try {
      const user = await login(form.phone, form.password);
      if (user.role === "admin") navigate("/admin");
      else if (user.role === "delivery") navigate("/delivery");
      else navigate("/dashboard");
    } catch (err) {
      setError(err.response?.data?.message || "Login failed");
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      {/* Background glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-fresh-600/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-fresh-400/5 rounded-full blur-3xl"></div>
      </div>

      <div className="relative w-full max-w-md animate-slide-up">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-fresh-600 rounded-2xl text-3xl mb-4 shadow-lg shadow-fresh-600/30">
            🥦
          </div>
          <h1 className="text-4xl font-bold text-white">FreshBox</h1>
          <p className="text-gray-400 mt-1">Sign in to your account</p>
        </div>

        <div className="card-glass">
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 mb-5 text-red-400 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">Phone Number</label>
              <input
                id="phone"
                type="tel"
                className="input"
                placeholder="9000000001"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="label">Password</label>
              <input
                id="password"
                type="password"
                className="input"
                placeholder="••••••••"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                required
              />
            </div>

            <button type="submit" id="login-btn" disabled={isLoading} className="btn-primary w-full mt-2">
              {isLoading ? "Signing in..." : "Sign In"}
            </button>
          </form>

          <p className="text-center text-gray-400 text-sm mt-5">
            Don't have an account?{" "}
            <Link to="/register" className="text-fresh-400 hover:text-fresh-300 font-medium">Register</Link>
          </p>

          {/* Demo credentials */}
          <div className="mt-5 p-3 bg-gray-800/50 rounded-xl border border-gray-700/50 text-xs text-gray-500 space-y-1">
            <p className="font-medium text-gray-400 mb-1">Demo accounts:</p>
            <p>🛡️ Admin: 9000000001 / Admin@123</p>
            <p>🛒 Customer: 9000000002 / User@123</p>
            <p>🚚 Delivery: 9000000004 / Delivery@123</p>
          </div>
        </div>
      </div>
    </div>
  );
}
