"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { CheckCircle, XCircle, Clock, ArrowRight, Loader2 } from "lucide-react";

export default function PaymentSuccessPage() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get("merchantOrderId");
  const state = searchParams.get("state");

  const [status, setStatus] = useState<string>(state || "PENDING");
  const [plan, setPlan] = useState<string>("");
  const [polling, setPolling] = useState(true);

  useEffect(() => {
    if (!orderId) return;

    let attempts = 0;
    const maxAttempts = 30; // Poll for up to 60 seconds

    const pollStatus = async () => {
      try {
        const res = await fetch(`/api/payment/status?orderId=${orderId}`);
        if (res.ok) {
          const data = await res.json();
          setStatus(data.status);
          setPlan(data.plan);

          if (data.status !== "PENDING") {
            setPolling(false);
            // Dispatch event so sidebar updates
            window.dispatchEvent(new Event("credits-updated"));
            return;
          }
        }
      } catch { /* continue polling */ }

      attempts++;
      if (attempts >= maxAttempts) {
        setPolling(false);
      }
    };

    const interval = setInterval(pollStatus, 2000);
    pollStatus(); // Initial check

    return () => clearInterval(interval);
  }, [orderId]);

  const isSuccess = status === "SUCCESS" || state === "SUCCESS";
  const isFailed = ["ERROR", "CANCELLED", "TIMEOUT", "DECLINED", "SYSTEM_ERROR"].includes(status);
  const isPending = !isSuccess && !isFailed;

  return (
    <div className="h-full flex items-center justify-center bg-white">
      <div className="max-w-md w-full mx-auto px-6 text-center">
        {/* Icon */}
        <div className="mb-6">
          {isSuccess ? (
            <div className="w-20 h-20 mx-auto rounded-full bg-blue-50 flex items-center justify-center">
              <CheckCircle className="w-10 h-10 text-blue-600" />
            </div>
          ) : isFailed ? (
            <div className="w-20 h-20 mx-auto rounded-full bg-red-50 flex items-center justify-center">
              <XCircle className="w-10 h-10 text-red-500" />
            </div>
          ) : (
            <div className="w-20 h-20 mx-auto rounded-full bg-gray-50 flex items-center justify-center">
              {polling ? (
                <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
              ) : (
                <Clock className="w-10 h-10 text-gray-400" />
              )}
            </div>
          )}
        </div>

        {/* Title */}
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          {isSuccess
            ? "Payment Successful!"
            : isFailed
            ? "Payment Failed"
            : "Processing Payment..."}
        </h1>

        {/* Description */}
        <p className="text-sm text-gray-500 mb-8">
          {isSuccess
            ? `Your ${plan === "pro" ? "Pro" : "Plus"} plan is now active. Enjoy all premium features!`
            : isFailed
            ? "Something went wrong with your payment. Please try again."
            : polling
            ? "Please wait while we confirm your payment..."
            : "Payment is still being processed. Check back in a moment."}
        </p>

        {/* Action Buttons */}
        <div className="flex flex-col gap-3">
          {isSuccess ? (
            <Link
              href="/dashboard"
              className="flex items-center justify-center gap-2 w-full py-3 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 transition-colors"
            >
              Go to Dashboard <ArrowRight className="w-4 h-4" />
            </Link>
          ) : isFailed ? (
            <Link
              href="/pricing"
              className="flex items-center justify-center gap-2 w-full py-3 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 transition-colors"
            >
              Try Again <ArrowRight className="w-4 h-4" />
            </Link>
          ) : null}

          <Link
            href="/dashboard/settings"
            className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
          >
            View Settings
          </Link>
        </div>

        {/* Order ID */}
        {orderId && (
          <p className="mt-8 text-[10px] text-gray-300">
            Order: {orderId}
          </p>
        )}
      </div>
    </div>
  );
}
