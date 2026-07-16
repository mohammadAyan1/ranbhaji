import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import useAuthStore from "../store/authStore";

export default function ForgotPasswordPage() {
  const [step, setStep] = useState(1); // 1: phone, 2: otp, 3: new password
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [msg, setMsg] = useState("");

  const { forgotPassword, verifyForgotPasswordOTP, resetPassword, isLoading } = useAuthStore();
  const navigate = useNavigate();

  const handlePhoneSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setMsg("");
    try {
      await forgotPassword(phone);
      setMsg("OTP sent successfully. (Use 123456)");
      setStep(2);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to send OTP");
    }
  };

  const handleOtpSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setMsg("");
    try {
      await verifyForgotPasswordOTP(phone, otp);
      setMsg("OTP verified. Please enter your new password.");
      setStep(3);
    } catch (err) {
      setError(err.response?.data?.message || "Invalid OTP");
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setMsg("");
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    try {
      await resetPassword({ phone, otp, password, confirmPassword });
      setMsg("Password reset successfully. Redirecting to login...");
      setTimeout(() => {
        navigate("/login");
      }, 2000);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to reset password");
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-fresh-600/10 rounded-full blur-3xl"></div>
      </div>

      <div className="relative w-full max-w-md animate-slide-up">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-fresh-600 rounded-2xl text-3xl mb-4 shadow-lg shadow-fresh-600/30">🔑</div>
          <h1 className="text-4xl font-bold text-gray-900">Forgot Password</h1>
          <p className="text-gray-600 mt-1">Reset your account password</p>
        </div>

        <div className="card-glass">
          {error && <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 mb-5 text-red-600 text-sm">{error}</div>}
          {msg && <div className="bg-green-500/10 border border-green-500/30 rounded-xl px-4 py-3 mb-5 text-green-700 text-sm">{msg}</div>}

          {step === 1 && (
            <form onSubmit={handlePhoneSubmit} className="space-y-4">
              <div>
                <label className="label">Registered Phone Number</label>
                <input
                  id="phone"
                  type="tel"
                  className="input"
                  placeholder="9000000001"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                  maxLength={10}
                  required
                />
              </div>
              <button type="submit" disabled={isLoading || phone.length !== 10} className="btn-primary w-full mt-2">
                {isLoading ? "Sending..." : "Send OTP"}
              </button>
            </form>
          )}

          {step === 2 && (
            <form onSubmit={handleOtpSubmit} className="space-y-4">
              <div>
                <label className="label">Enter 6-Digit OTP</label>
                <input
                  id="otp"
                  type="text"
                  className="input text-center tracking-[0.5em] text-2xl font-bold"
                  placeholder="••••••"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  maxLength={6}
                  required
                />
              </div>
              <button type="submit" disabled={isLoading || otp.length !== 6} className="btn-primary w-full mt-2">
                {isLoading ? "Verifying..." : "Verify OTP"}
              </button>
            </form>
          )}

          {step === 3 && (
            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              <div>
                <label className="label">New Password</label>
                <input
                  id="password"
                  type="password"
                  className="input"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="label">Confirm New Password</label>
                <input
                  id="confirmPassword"
                  type="password"
                  className="input"
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
              </div>
              <button type="submit" disabled={isLoading || !password || !confirmPassword} className="btn-primary w-full mt-2">
                {isLoading ? "Resetting..." : "Reset Password"}
              </button>
            </form>
          )}

          <p className="text-center text-gray-600 text-sm mt-5">
            Remember your password?{" "}
            <Link to="/login" className="text-fresh-600 hover:text-fresh-700 font-medium">Sign In</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
