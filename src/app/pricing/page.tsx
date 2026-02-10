"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { SessionProvider, useSession } from "next-auth/react";
import {
  Check,
  ArrowRight,
  Zap,
  Crown,
  Rocket,
  Sparkles,
  Shield,
  Clock,
  Users,
  MessageSquare,
  Loader2,
  X,
} from "lucide-react";

const plans = [
  {
    name: "Free",
    price: "0",
    period: "",
    desc: "Get started with essential AI tools",
    icon: Zap,
    color: "gray",
    cta: "Start Free",
    planId: "free",
    popular: false,
    credits: "50 credits/day",
    features: [
      "All 25+ tools",
      "50 credits per day",
      "Kay AI 1.0",
      "Standard speed",
      "Community support",
    ],
    excluded: [
      "Kay AI 2.0",
      "Priority processing",
      "Unlimited credits",
    ],
  },
  {
    name: "Plus",
    price: "7,500",
    currency: "MMK",
    period: "/mo",
    desc: "Unlock Kay AI 2.0 for smarter results",
    icon: Rocket,
    color: "blue",
    cta: "Get Plus Plan",
    planId: "plus",
    popular: true,
    credits: "500 credits/day",
    features: [
      "All 25+ tools",
      "500 credits per day",
      "Kay AI 1.0 + Kay AI 2.0",
      "Priority processing speed",
      "AI Detector & Humanizer",
      "Assignment Worker",
      "Video Explainer",
      "PDF Q&A with citations",
      "Email support",
    ],
    excluded: [
      "Unlimited credits",
    ],
  },
  {
    name: "Pro",
    price: "15,000",
    currency: "MMK",
    period: "/mo",
    desc: "Unlimited access to everything",
    icon: Crown,
    color: "gray",
    cta: "Get Pro Plan",
    planId: "pro",
    popular: false,
    credits: "Unlimited",
    features: [
      "All 25+ tools",
      "Unlimited credits",
      "Kay AI 1.0 + Kay AI 2.0",
      "Fastest processing speed",
      "All Plus features",
      "Priority support",
      "Early access to new tools",
      "Project auto-save & library",
      "Export in all formats",
    ],
    excluded: [],
  },
];

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

const faqs = [
  {
    q: "What are credits?",
    a: "Credits are used each time you use a tool. Different tools cost different amounts. Simple tools cost 1-2 credits, while advanced tools like Video Explainer cost 5-10 credits. Credits reset daily.",
  },
  {
    q: "What's the difference between Kay AI 1.0 and 2.0?",
    a: "Kay AI 1.0 is our fast, reliable model available on all plans. Kay AI 2.0 is our most powerful model with superior accuracy and reasoning — available on Plus (7,500 MMK) and Pro (15,000 MMK) plans.",
  },
  {
    q: "Can I cancel anytime?",
    a: "Yes, your plan remains active until the end of your 30-day billing period. You won't be charged again.",
  },
  {
    q: "Which payment methods are supported?",
    a: "We accept KBZ Pay, AYA Pay, Wave Pay, CB Pay, Onepay, MPU, and more through our payment partner Dinger.",
  },
  {
    q: "Can I upgrade or downgrade?",
    a: "Yes, you can change your plan at any time. When upgrading, you'll get immediate access to new features.",
  },
];

export default function PricingPage() {
  return (
    <SessionProvider>
      <PricingContent />
    </SessionProvider>
  );
}

function PricingContent() {
  const { data: session } = useSession();
  const router = useRouter();
  const isLoggedIn = !!session?.user;
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [selectedProvider, setSelectedProvider] = useState<typeof PROVIDERS[0] | null>(null);
  const [phone, setPhone] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState("");

  const handleGetPlan = (planId: string) => {
    if (planId === "free") {
      if (isLoggedIn) {
        router.push("/dashboard");
      } else {
        router.push("/register");
      }
      return;
    }

    if (!isLoggedIn) {
      router.push(`/register?plan=${planId}`);
      return;
    }

    // Open payment modal
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

      // If redirect URL (form-based payment)
      if (data.redirectUrl) {
        window.location.href = data.redirectUrl;
        return;
      }

      // If QR code, redirect to success page to poll
      if (data.qrCode || data.merchantOrderId) {
        router.push(`/dashboard/payment/success?merchantOrderId=${data.merchantOrderId}&state=PENDING`);
        return;
      }

      // Fallback - go to success page
      router.push(`/dashboard/payment/success?merchantOrderId=${data.merchantOrderId}`);
    } catch {
      setError("Network error. Please try again.");
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="bg-white/95 backdrop-blur-xl border-b border-gray-100 sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-3">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center">
              <Image src="/kabyar-logo.png" alt="Kabyar" width={280} height={74} className="object-contain h-10 sm:h-14 w-auto" />
            </Link>
            <nav className="hidden md:flex items-center gap-6 text-sm">
              <Link href="/" className="text-gray-500 hover:text-gray-900 transition">Home</Link>
              <Link href="/tools" className="text-gray-500 hover:text-gray-900 transition">Tools</Link>
              <Link href="/pricing" className="font-medium text-gray-900">Pricing</Link>
            </nav>
            <div className="flex items-center gap-2">
              {isLoggedIn ? (
                <Link href="/dashboard" className="px-4 py-2 bg-blue-600 text-white text-xs sm:text-sm font-medium rounded-xl hover:bg-blue-700 transition-colors">
                  Dashboard
                </Link>
              ) : (
                <>
                  <Link href="/login" className="text-xs sm:text-sm text-gray-500 hover:text-gray-900 px-3 py-2 rounded-lg hover:bg-gray-50 transition">
                    Log in
                  </Link>
                  <Link href="/register" className="px-4 py-2 bg-blue-600 text-white text-xs sm:text-sm font-medium rounded-xl hover:bg-blue-700 transition-colors">
                    Start Free
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="pt-12 sm:pt-20 pb-4 sm:pb-8 px-4 sm:px-6">
        <div className="max-w-3xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-50 border border-blue-100 text-xs font-medium text-blue-600 mb-5">
            <Sparkles className="w-3 h-3" />
            Simple, transparent pricing
          </div>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-gray-900 mb-3 sm:mb-4 tracking-tight">
            Pick Your Plan
          </h1>
          <p className="text-sm sm:text-base text-gray-400 max-w-md mx-auto">
            Start free. Upgrade when you&apos;re ready. Cancel anytime.
          </p>
        </div>
      </section>

      {/* Plans */}
      <section className="py-10 sm:py-16 px-4 sm:px-6">
        <div className="max-w-4xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-5">
            {plans.map((plan) => {
              const PlanIcon = plan.icon;
              const isPopular = plan.popular;

              return (
                <div
                  key={plan.name}
                  className={`relative rounded-2xl border p-5 sm:p-6 transition-all duration-300 ${
                    isPopular
                      ? "border-blue-200 bg-blue-50/30 shadow-lg shadow-blue-100/50 scale-[1.02] md:scale-105"
                      : "border-gray-100 bg-white hover:border-gray-200 hover:shadow-md"
                  }`}
                >
                  {isPopular && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <span className="px-3 py-1 bg-blue-600 text-white text-[10px] sm:text-xs font-semibold rounded-full shadow-lg shadow-blue-600/30">
                        Most Popular
                      </span>
                    </div>
                  )}

                  <div className="flex items-center gap-2.5 mb-4">
                    <div className={`w-8 h-8 sm:w-9 sm:h-9 rounded-lg flex items-center justify-center ${isPopular ? "bg-blue-600" : "bg-gray-100"}`}>
                      <PlanIcon className={`w-4 h-4 ${isPopular ? "text-white" : "text-gray-500"}`} />
                    </div>
                    <h3 className="font-bold text-gray-900 text-sm sm:text-base">{plan.name}</h3>
                  </div>

                  <div className="mb-4">
                    <div className="flex items-baseline gap-1">
                      {plan.currency ? (
                        <>
                          <span className="text-2xl sm:text-3xl font-black text-gray-900">{plan.price}</span>
                          <span className="text-xs text-gray-400">{plan.currency}</span>
                        </>
                      ) : (
                        <span className="text-3xl sm:text-4xl font-black text-gray-900">${plan.price}</span>
                      )}
                      {plan.period && <span className="text-sm text-gray-400">{plan.period}</span>}
                    </div>
                    <p className="text-xs text-gray-400 mt-1">{plan.desc}</p>
                  </div>

                  <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium mb-5 ${
                    isPopular ? "bg-blue-100 text-blue-700" : "bg-gray-50 text-gray-600"
                  }`}>
                    <Zap className="w-3 h-3" />
                    {plan.credits}
                  </div>

                  <button
                    onClick={() => handleGetPlan(plan.planId)}
                    className={`flex items-center justify-center gap-2 w-full py-2.5 sm:py-3 rounded-xl text-sm font-medium transition-all duration-200 mb-6 ${
                      isPopular
                        ? "bg-blue-600 text-white hover:bg-blue-700 shadow-lg shadow-blue-600/20"
                        : "bg-gray-900 text-white hover:bg-gray-800"
                    }`}
                  >
                    {isLoggedIn && plan.planId === "free" ? "Go to Dashboard" : plan.cta}
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>

                  <div className="space-y-2.5">
                    {plan.features.map((f) => (
                      <div key={f} className="flex items-start gap-2.5">
                        <div className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                          isPopular ? "bg-blue-100" : "bg-gray-100"
                        }`}>
                          <Check className={`w-2.5 h-2.5 ${isPopular ? "text-blue-600" : "text-gray-500"}`} />
                        </div>
                        <span className="text-xs sm:text-[13px] text-gray-600">{f}</span>
                      </div>
                    ))}
                    {plan.excluded.map((f) => (
                      <div key={f} className="flex items-start gap-2.5 opacity-40">
                        <div className="w-4 h-4 rounded-full bg-gray-50 flex items-center justify-center shrink-0 mt-0.5">
                          <span className="text-[9px] text-gray-300">&mdash;</span>
                        </div>
                        <span className="text-xs sm:text-[13px] text-gray-400 line-through">{f}</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Trust badges */}
      <section className="py-10 sm:py-14 px-4 sm:px-6">
        <div className="max-w-3xl mx-auto">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-6">
            {[
              { icon: Shield, label: "Secure Payments", sub: "Dinger encrypted" },
              { icon: Clock, label: "Cancel Anytime", sub: "No lock-in" },
              { icon: Users, label: "10,000+ Students", sub: "Trust Kabyar" },
              { icon: MessageSquare, label: "24/7 Support", sub: "We're here to help" },
            ].map((item) => {
              const ItemIcon = item.icon;
              return (
                <div key={item.label} className="flex items-center gap-2.5 sm:gap-3">
                  <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-gray-50 flex items-center justify-center shrink-0">
                    <ItemIcon className="w-4 h-4 text-gray-400" />
                  </div>
                  <div>
                    <p className="text-xs sm:text-sm font-semibold text-gray-900">{item.label}</p>
                    <p className="text-[10px] sm:text-xs text-gray-400">{item.sub}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-14 sm:py-20 px-4 sm:px-6 bg-gray-50">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 text-center mb-3">Questions?</h2>
          <p className="text-sm text-gray-400 text-center mb-10 sm:mb-12">Everything you need to know about our plans.</p>
          <div className="space-y-3 sm:space-y-4">
            {faqs.map((faq) => (
              <div key={faq.q} className="rounded-xl bg-white border border-gray-100 p-4 sm:p-5">
                <h3 className="font-semibold text-gray-900 text-sm sm:text-[15px] mb-2">{faq.q}</h3>
                <p className="text-xs sm:text-sm text-gray-400 leading-relaxed">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-16 sm:py-20 px-4 sm:px-6">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-3">Start Studying Smarter</h2>
          <p className="text-sm sm:text-base text-gray-400 mb-8">No credit card required. Free plan available forever.</p>
          <div className="flex flex-col sm:flex-row justify-center gap-3">
            <Link
              href={isLoggedIn ? "/dashboard" : "/register"}
              className="inline-flex items-center justify-center gap-2 px-7 py-3.5 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 transition-colors text-sm sm:text-base"
            >
              {isLoggedIn ? "Go to Dashboard" : "Get Started Free"} <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/tools"
              className="inline-flex items-center justify-center gap-2 px-7 py-3.5 bg-white text-gray-700 font-medium rounded-xl border-2 border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition-all text-sm sm:text-base"
            >
              Browse Tools
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-8 sm:py-10 px-4 sm:px-6">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <Image src="/kabyar-logo.png" alt="Kabyar" width={280} height={74} className="object-contain h-10 sm:h-12 w-auto" />
          <div className="flex gap-5 text-xs sm:text-sm">
            <Link href="/about" className="hover:text-white transition">About</Link>
            <Link href="/privacy" className="hover:text-white transition">Privacy</Link>
            <Link href="/terms" className="hover:text-white transition">Terms</Link>
          </div>
          <p className="text-xs sm:text-sm">&copy; 2026 Kabyar</p>
        </div>
      </footer>

      {/* Payment Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 fade-in duration-200">
            {/* Header */}
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
              {/* Payment Provider Selection */}
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

              {/* Phone Number */}
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

              {/* Error */}
              {error && (
                <p className="text-xs text-red-500 bg-red-50 px-3 py-2 rounded-lg">{error}</p>
              )}

              {/* Pay Button */}
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
