"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Crown,
  Sparkles,
  Check,
  Coins,
  ArrowRight,
  Loader2,
  Zap,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const PROVIDERS = [
  { name: "KBZ Pay", method: "QR", icon: "💳" },
  { name: "KBZ Pay", method: "PWA", icon: "📱" },
  { name: "AYA Pay", method: "QR", icon: "💳" },
  { name: "AYA Pay", method: "PIN", icon: "🔢" },
  { name: "Wave Pay", method: "PIN", icon: "🌊" },
  { name: "CB Pay", method: "QR", icon: "🏦" },
  { name: "Onepay", method: "PIN", icon: "1️⃣" },
  { name: "MPU", method: "OTP", icon: "💳" },
];

interface PlanFeature {
  text: string;
  included: boolean;
}

interface Plan {
  id: string;
  name: string;
  price: string;
  priceNum: number;
  period: string;
  description: string;
  icon: React.ReactNode;
  features: PlanFeature[];
  popular?: boolean;
  buttonText: string;
}

const plans: Plan[] = [
  {
    id: "free",
    name: "Free",
    price: "0",
    priceNum: 0,
    period: "forever",
    description: "Get started with essential AI tools",
    icon: <Coins className="w-5 h-5" />,
    features: [
      { text: "All 25+ tools", included: true },
      { text: "50 credits per day", included: true },
      { text: "Kay AI 1.0", included: true },
      { text: "Standard speed", included: true },
      { text: "Kay AI 2.0", included: false },
      { text: "Priority processing", included: false },
    ],
    buttonText: "Current Plan",
  },
  {
    id: "plus",
    name: "Plus",
    price: "7,500",
    priceNum: 7500,
    period: "month",
    description: "Unlock Kay AI 2.0 for smarter results",
    icon: <Sparkles className="w-5 h-5" />,
    popular: true,
    features: [
      { text: "All 25+ tools", included: true },
      { text: "500 credits per day", included: true },
      { text: "Kay AI 1.0 + Kay AI 2.0", included: true },
      { text: "Priority speed", included: true },
      { text: "Email support", included: true },
      { text: "Unlimited credits", included: false },
    ],
    buttonText: "Get Plus",
  },
  {
    id: "pro",
    name: "Pro",
    price: "15,000",
    priceNum: 15000,
    period: "month",
    description: "Unlimited access to everything",
    icon: <Crown className="w-5 h-5" />,
    features: [
      { text: "All 25+ tools", included: true },
      { text: "Unlimited credits", included: true },
      { text: "Kay AI 1.0 + Kay AI 2.0", included: true },
      { text: "Fastest speed", included: true },
      { text: "Priority support", included: true },
      { text: "Early access features", included: true },
    ],
    buttonText: "Get Pro",
  },
];

export default function PlansPage() {
  const router = useRouter();
  const [currentPlan, setCurrentPlan] = useState("free");
  const [mounted, setMounted] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [selectedProvider, setSelectedProvider] = useState<typeof PROVIDERS[0] | null>(null);
  const [phone, setPhone] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setMounted(true);
    async function fetchPlan() {
      try {
        const res = await fetch("/api/user/credits");
        if (res.ok) {
          const data = await res.json();
          setCurrentPlan(data.plan || "free");
        }
      } catch { /* default free */ }
    }
    fetchPlan();
  }, []);

  const handleSelectPlan = (planId: string) => {
    if (planId === "free" || planId === currentPlan) return;
    setSelectedPlan(planId);
    setSelectedProvider(null);
    setPhone("");
    setError("");
    setShowPaymentModal(true);
  };

  const handlePay = async () => {
    if (!selectedPlan || !selectedProvider || !phone) {
      setError("Please fill in all fields");
      return;
    }
    if (phone.length < 9) {
      setError("Please enter a valid phone number");
      return;
    }

    setIsProcessing(true);
    setError("");

    try {
      const res = await fetch("/api/payment/initiate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          plan: selectedPlan,
          providerName: selectedProvider.name,
          methodName: selectedProvider.method,
          customerPhone: phone,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Payment failed");
        setIsProcessing(false);
        return;
      }

      if (data.redirectUrl) {
        window.location.href = data.redirectUrl;
        return;
      }

      router.push(`/dashboard/payment/success?merchantOrderId=${data.merchantOrderId}&state=PENDING`);
    } catch {
      setError("Network error. Please try again.");
      setIsProcessing(false);
    }
  };

  if (!mounted) return null;

  return (
    <div className="h-full overflow-y-auto bg-white">
      <div className="w-full px-4 sm:px-6 lg:px-8 py-6">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-50 text-blue-600 rounded-full text-xs font-medium mb-3">
            <Zap className="w-3 h-3" />
            Choose Your Plan
          </div>
          <h1 className="text-xl font-bold text-gray-900 mb-1">
            Upgrade Your Experience
          </h1>
          <p className="text-xs text-gray-400 max-w-md mx-auto">
            Unlock Kay AI 2.0 and get more credits
          </p>
        </div>

        {/* Plans Grid */}
        <div className="max-w-4xl mx-auto grid md:grid-cols-3 gap-4">
          {plans.map((plan) => {
            const isCurrent = plan.id === currentPlan;
            return (
              <div
                key={plan.id}
                className={`relative rounded-2xl border p-5 transition-all duration-300 ${
                  plan.popular
                    ? "border-blue-200 bg-blue-50/30 shadow-lg shadow-blue-100/50"
                    : "border-gray-100 bg-white hover:border-gray-200 hover:shadow-md"
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="px-3 py-1 bg-blue-600 text-white text-[10px] font-semibold rounded-full shadow-lg">
                      Most Popular
                    </span>
                  </div>
                )}

                <div className="flex items-center gap-2.5 mb-4">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${plan.popular ? "bg-blue-600" : plan.id === "pro" ? "bg-gray-900" : "bg-gray-100"}`}>
                    <span className={plan.popular || plan.id === "pro" ? "text-white" : "text-gray-500"}>
                      {plan.icon}
                    </span>
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900 text-sm">{plan.name}</h3>
                    <p className="text-[10px] text-gray-400">{plan.description}</p>
                  </div>
                </div>

                <div className="mb-4">
                  <div className="flex items-baseline gap-1">
                    {plan.priceNum > 0 ? (
                      <>
                        <span className="text-2xl font-black text-gray-900">{plan.price}</span>
                        <span className="text-xs text-gray-400">MMK/{plan.period}</span>
                      </>
                    ) : (
                      <span className="text-2xl font-black text-gray-900">Free</span>
                    )}
                  </div>
                </div>

                <div className="space-y-2 mb-5">
                  {plan.features.map((feature, i) => (
                    <div key={i} className="flex items-center gap-2">
                      {feature.included ? (
                        <div className={`w-4 h-4 rounded-full flex items-center justify-center ${plan.popular ? "bg-blue-100" : "bg-gray-100"}`}>
                          <Check className={`w-2.5 h-2.5 ${plan.popular ? "text-blue-600" : "text-gray-500"}`} />
                        </div>
                      ) : (
                        <div className="w-4 h-4 rounded-full bg-gray-50 flex items-center justify-center">
                          <span className="text-[8px] text-gray-300">&mdash;</span>
                        </div>
                      )}
                      <span className={`text-xs ${feature.included ? "text-gray-700" : "text-gray-400 line-through"}`}>
                        {feature.text}
                      </span>
                    </div>
                  ))}
                </div>

                <Button
                  onClick={() => handleSelectPlan(plan.id)}
                  disabled={isCurrent || plan.id === "free"}
                  className={`w-full h-9 rounded-xl text-xs font-medium transition-all ${
                    isCurrent
                      ? "bg-gray-100 text-gray-400 cursor-not-allowed border-0"
                      : plan.popular
                      ? "bg-blue-600 hover:bg-blue-700 text-white border-0"
                      : plan.id === "free"
                      ? "bg-gray-100 text-gray-500 border-0"
                      : "bg-gray-900 hover:bg-gray-800 text-white border-0"
                  }`}
                >
                  {isCurrent ? "Current Plan" : (
                    <span className="flex items-center gap-1.5">
                      {plan.buttonText} <ArrowRight className="w-3 h-3" />
                    </span>
                  )}
                </Button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Payment Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 fade-in duration-200">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <div>
                <h3 className="text-sm font-bold text-gray-900">
                  {selectedPlan === "pro" ? "Pro Plan" : "Plus Plan"}
                </h3>
                <p className="text-xs text-gray-400">
                  {selectedPlan === "pro" ? "15,000" : "7,500"} MMK / month
                </p>
              </div>
              <button
                onClick={() => setShowPaymentModal(false)}
                className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div>
                <label className="text-xs font-medium text-gray-700 mb-2 block">Payment Method</label>
                <div className="grid grid-cols-2 gap-2">
                  {PROVIDERS.map((p) => (
                    <button
                      key={`${p.name}-${p.method}`}
                      onClick={() => setSelectedProvider(p)}
                      className={`flex items-center gap-2 px-3 py-2.5 rounded-lg border text-left transition-all text-xs ${
                        selectedProvider?.name === p.name && selectedProvider?.method === p.method
                          ? "border-blue-600 bg-blue-50 text-blue-700"
                          : "border-gray-200 hover:border-gray-300 text-gray-700"
                      }`}
                    >
                      <span className="text-base">{p.icon}</span>
                      <div>
                        <p className="font-medium leading-tight">{p.name}</p>
                        <p className="text-[10px] text-gray-400">{p.method}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-gray-700 mb-1.5 block">Phone Number</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="09xxxxxxxxx"
                  className="w-full px-3 py-2.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {error && (
                <p className="text-xs text-red-500 bg-red-50 px-3 py-2 rounded-lg">{error}</p>
              )}

              <button
                onClick={handlePay}
                disabled={isProcessing || !selectedProvider || !phone}
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-200 disabled:text-gray-400 text-white text-sm font-medium rounded-xl transition-colors flex items-center justify-center gap-2"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    Pay {selectedPlan === "pro" ? "15,000" : "7,500"} MMK
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>

              <p className="text-[10px] text-gray-400 text-center">
                Secured by Dinger Payment Gateway
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
