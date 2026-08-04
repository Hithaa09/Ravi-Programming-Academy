"use client";

import { useState } from "react";
import Link from "next/link";
import Script from "next/script";
import { initiateCheckout, verifyPayment } from "@/lib/payments/checkout";

interface RazorpayInstance {
  open: () => void;
}
interface RazorpaySuccessResponse {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

declare global {
  interface Window {
    Razorpay: new (options: Record<string, unknown>) => RazorpayInstance;
  }
}

interface Props {
  alreadyHasAccess: boolean;
  studentName: string;
  studentEmail: string;
}

export function BuySubscriptionCheckout({ alreadyHasAccess, studentName, studentEmail }: Props) {
  const [scriptReady, setScriptReady] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleBuyNow() {
    if (!scriptReady) {
      setMessage("Payment form is still loading — please try again in a moment.");
      return;
    }
    setLoading(true);
    setMessage(null);

    const result = await initiateCheckout();
    if (!result.available) {
      setLoading(false);
      setMessage(result.message);
      return;
    }

    const razorpay = new window.Razorpay({
      key: result.keyId,
      amount: result.amountPaise,
      currency: result.currency,
      order_id: result.orderId,
      name: "Ravi Programming Academy",
      description: "Lifetime Access — Premium Problems",
      prefill: { name: studentName, email: studentEmail },
      theme: { color: "#4f46e5" },
      handler: async (response: RazorpaySuccessResponse) => {
        setMessage("Confirming your payment…");
        const verifyResult = await verifyPayment({
          razorpayOrderId: response.razorpay_order_id,
          razorpayPaymentId: response.razorpay_payment_id,
          razorpaySignature: response.razorpay_signature,
        });
        setLoading(false);
        setMessage(verifyResult.message);
        if (verifyResult.ok) setSuccess(true);
      },
      modal: {
        ondismiss: () => {
          setLoading(false);
          setMessage("Checkout was closed before completing payment.");
        },
      },
    });
    razorpay.open();
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-primary-container p-6 md:p-4">
      <Script src="https://checkout.razorpay.com/v1/checkout.js" onReady={() => setScriptReady(true)} strategy="afterInteractive" />
      <div className="w-full max-w-md bg-surface-bright rounded-2xl shadow-card p-8 md:p-10 text-center">
        <span className="material-symbols-outlined text-[48px] text-tertiary-fixed-dim">workspace_premium</span>
        <h1 className="font-headline-xl text-headline-xl text-on-surface mt-4">
          {alreadyHasAccess || success ? "You Have Lifetime Access" : "Unlock Premium Problems"}
        </h1>
        <p className="font-body-lg text-body-lg text-on-surface-variant mt-2">
          {alreadyHasAccess || success
            ? "Every Premium Programming and SQL problem on the platform is unlocked for you, forever."
            : "Get lifetime access to every Premium Programming and SQL problem on the platform — one purchase, unlocked forever."}
        </p>

        {message && !alreadyHasAccess && (
          <p className={`font-label-md text-label-md rounded-lg px-4 py-3 mt-6 ${success ? "bg-status-solved-bg text-status-solved-text" : "bg-surface-container-low text-on-surface-variant"}`}>
            {message}
          </p>
        )}

        {!alreadyHasAccess && !success && (
          <button
            type="button"
            onClick={handleBuyNow}
            disabled={loading}
            className="w-full mt-6 bg-primary-container text-white py-2.5 md:py-3 rounded-lg font-label-md text-label-md font-bold hover:bg-primary-container/90 transition-colors disabled:opacity-60"
          >
            {loading ? "Processing…" : "Buy Now"}
          </button>
        )}

        <div className="mt-6">
          <Link href="/problems" className="font-label-md text-label-md text-secondary font-medium hover:underline">
            Back to Problems
          </Link>
        </div>
      </div>
    </div>
  );
}
