import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import useAuthStore from "../store/authStore";

export default function VerifyOTPPage() {
  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");
  const [msg, setMsg] = useState("");
  const [countdown, setCountdown] = useState(300); // 5 minutes in seconds
  const navigate = useNavigate();
  const location = useLocation();
  const phone = location.state?.phone || "";

  const { verifyRegistrationOTP, resendOTP, isLoading } = useAuthStore();

  useEffect(() => {
    if (!phone) {
      navigate("/login");
    }
  }, [phone, navigate]);

  useEffect(() => {
    let timer;
    if (countdown > 0) {
      timer = setInterval(() => {
        setCountdown((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [countdown]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setMsg("");
    try {
      const data = await verifyRegistrationOTP(phone, otp);
      if (data.user?.role === "admin") navigate("/admin");
      else if (data.user?.role === "delivery") navigate("/delivery");
      else navigate("/dashboard");
    } catch (err) {
      setError(err.response?.data?.message || "Invalid OTP");
    }
  };

  const handleResend = async () => {
    if (countdown > 0) return;
    setError("");
    setMsg("");
    try {
      await resendOTP(phone);
      setMsg("OTP resent successfully. (Use 123456)");
      setCountdown(300); // Reset to 5 minutes
    } catch (err) {
      setError(err.response?.data?.message || "Failed to resend OTP");
    }
  };

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-fresh-600/10 rounded-full blur-3xl"></div>
      </div>

      <div className="relative w-full max-w-md animate-slide-up">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-fresh-600 rounded-2xl text-3xl mb-4 shadow-lg shadow-fresh-600/30">🔐</div>
          <h1 className="text-4xl font-bold text-gray-900">Verify OTP</h1>
          <p className="text-gray-600 mt-1">Enter the 6-digit code sent to {phone}</p>
        </div>

        <div className="card-glass">
          {error && <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 mb-5 text-red-600 text-sm">{error}</div>}
          {msg && <div className="bg-green-500/10 border border-green-500/30 rounded-xl px-4 py-3 mb-5 text-green-700 text-sm">{msg}</div>}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">6-Digit OTP</label>
              <input
                id="otp"
                type="text"
                className="input text-center tracking-[0.5em] text-2xl font-bold"
                placeholder="••••••"
                value={otp}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, "").slice(0, 6);
                  setOtp(val);
                }}
                maxLength={6}
                required
              />
            </div>
            
            <button type="submit" disabled={isLoading || otp.length !== 6} className="btn-primary w-full mt-2">
              {isLoading ? "Verifying..." : "Verify OTP"}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600 mb-2">
              {countdown > 0 ? (
                <>Resend OTP in <span className="font-semibold text-gray-900">{formatTime(countdown)}</span></>
              ) : (
                "Didn't receive the code?"
              )}
            </p>
            <button
              type="button"
              onClick={handleResend}
              disabled={countdown > 0}
              className={`text-sm font-medium ${countdown > 0 ? "text-gray-400 cursor-not-allowed" : "text-fresh-600 hover:text-fresh-700"}`}
            >
              Resend OTP
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
