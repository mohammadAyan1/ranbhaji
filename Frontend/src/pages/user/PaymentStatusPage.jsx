import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import api from "../../api/axios";

export default function PaymentStatusPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const txnId = searchParams.get("txnId");
  const type = searchParams.get("type"); // "package" | "retail"
  const isSimulated = searchParams.get("simulated") === "true";

  const [status, setStatus] = useState("checking"); // "checking" | "success" | "failed"
  const [errorMsg, setErrorMsg] = useState("");
  const [dots, setDots] = useState(".");

  // Loading animation
  useEffect(() => {
    if (status !== "checking") return;
    const interval = setInterval(() => {
      setDots(d => (d.length >= 3 ? "." : d + "."));
    }, 400);
    return () => clearInterval(interval);
  }, [status]);

  // Polling backend status
  useEffect(() => {
    if (!txnId) {
      setStatus("failed");
      setErrorMsg("Transaction ID is missing.");
      return;
    }

    let attempts = 0;
    const maxAttempts = 15; // 15 attempts * 2 seconds = 30 seconds max poll

    const checkStatus = async () => {
      try {
        const res = await api.get(`/payment/phonepe/status/${txnId}?simulated=${isSimulated ? "true" : "false"}`);
        if (res.data.status === "success") {
          setStatus("success");
          clearInterval(pollInterval);
        } else if (res.data.status === "failed") {
          setStatus("failed");
          setErrorMsg(res.data.message || "Payment failed at PhonePe gateway.");
          clearInterval(pollInterval);
        }
      } catch (err) {
        attempts++;
        if (attempts >= maxAttempts) {
          setStatus("failed");
          setErrorMsg("Payment verification timed out. Please check your transaction history.");
          clearInterval(pollInterval);
        }
      }
    };

    // Run first check immediately
    checkStatus();

    const pollInterval = setInterval(checkStatus, 2000);

    return () => clearInterval(pollInterval);
  }, [txnId, isSimulated]);

  // Navigation handlers
  const handleRedirect = () => {
    if (type === "package") {
      navigate("/my-subscriptions");
    } else {
      navigate("/my-retail-orders");
    }
  };

  return (
    <div className="min-h-[70vh] flex items-center justify-center p-4">
      <div className="card max-w-md w-full border border-gray-800 text-center p-8 space-y-6">
        {status === "checking" && (
          <div className="space-y-4">
            <div className="relative w-16 h-16 mx-auto">
              <div className="absolute inset-0 rounded-full border-4 border-blue-500/20"></div>
              <div className="absolute inset-0 rounded-full border-4 border-blue-500 border-t-transparent animate-spin"></div>
            </div>
            <div className="space-y-2">
              <h2 className="text-xl font-bold text-white">Verifying Payment{dots}</h2>
              <p className="text-gray-500 text-xs">Connecting to PhonePe secure gateway for transaction lookup. Please do not close this window.</p>
            </div>
          </div>
        )}

        {status === "success" && (
          <div className="space-y-5 animate-scale-up">
            <div className="w-16 h-16 bg-green-500/10 border border-green-500/30 rounded-full flex items-center justify-center text-green-400 text-3xl mx-auto">
              ✓
            </div>
            <div className="space-y-2">
              <h2 className="text-xl font-bold text-white">Payment Successful 🎉</h2>
              <p className="text-gray-400 text-xs">
                Your payment for the {type === "package" ? "Subscription Package" : "Retail Shop Order"} was successfully verified.
              </p>
              <p className="text-gray-500 text-[10px]">Txn ID: {txnId}</p>
            </div>

            <button onClick={handleRedirect} className="w-full btn-primary py-2.5 text-sm">
              Go to {type === "package" ? "My Subscriptions" : "My Orders"}
            </button>
          </div>
        )}

        {status === "failed" && (
          <div className="space-y-5 animate-scale-up">
            <div className="w-16 h-16 bg-red-500/10 border border-red-500/30 rounded-full flex items-center justify-center text-red-400 text-3xl mx-auto font-bold">
              !
            </div>
            <div className="space-y-2">
              <h2 className="text-xl font-bold text-white">Payment Verification Failed</h2>
              <p className="text-red-400 text-xs">{errorMsg || "We were unable to verify your payment."}</p>
            </div>

            <button onClick={() => navigate("/retail-store")} className="w-full btn-secondary py-2.5 text-sm">
              Return to Store
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
