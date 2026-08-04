"use server";

import { createClient } from "@/lib/supabase/server";
import { hasLifetimeAccess, recordPurchaseAndGrantAccess } from "@/lib/payments/access";
import { getPlatformSettings } from "@/lib/payments/settings";
import { isRazorpayConfigured, createOrder, fetchOrder, verifyPaymentSignature } from "@/lib/payments/razorpay";
import { logError } from "@/lib/log";

const NOT_AVAILABLE = "Payments are not yet available. Check back soon.";

export type InitiateCheckoutResult =
  | { available: false; message: string }
  | { available: true; orderId: string; amountPaise: number; currency: string; keyId: string };

// Every "Buy Now" button calls this. Derives the student from the session
// itself — never trusts a client-supplied id, matching run-code.ts/
// submit-code.ts's established pattern.
export async function initiateCheckout(): Promise<InitiateCheckoutResult> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { available: false, message: "You must be signed in to buy a subscription." };

  const settings = await getPlatformSettings();
  if (!settings.paymentsEnabled || settings.subscriptionPriceInr <= 0) {
    return { available: false, message: NOT_AVAILABLE };
  }
  if (!isRazorpayConfigured()) {
    return { available: false, message: NOT_AVAILABLE };
  }
  if (await hasLifetimeAccess(user.id)) {
    return { available: false, message: "You already have lifetime access." };
  }

  try {
    const amountPaise = settings.subscriptionPriceInr * 100;
    const order = await createOrder(amountPaise, "INR", { studentId: user.id });
    return { available: true, orderId: order.orderId, amountPaise: order.amountPaise, currency: order.currency, keyId: order.keyId };
  } catch (e) {
    logError("initiateCheckout: failed to create Razorpay order", {
      userId: user.id,
      context: { error: e instanceof Error ? e.message : String(e) },
    });
    return { available: false, message: "Could not start checkout. Please try again in a moment." };
  }
}

export interface VerifyPaymentInput {
  razorpayOrderId: string;
  razorpayPaymentId: string;
  razorpaySignature: string;
}

export interface VerifyPaymentResult {
  ok: boolean;
  message: string;
}

// Called by the client immediately after Razorpay's Checkout modal reports
// success. Verifies everything server-side before granting anything —
// never trusts the client's word that the payment succeeded.
export async function verifyPayment(input: VerifyPaymentInput): Promise<VerifyPaymentResult> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, message: "You must be signed in to complete a purchase." };

  try {
    // Inside the try block deliberately — verifyPaymentSignature reads env
    // vars and throws if Razorpay isn't configured (the same shape of bug
    // caught and fixed in the webhook route: an uncaught throw here would
    // surface as a raw unhandled-rejection error to the client instead of
    // the graceful { ok: false, message } every other failure path returns).
    const validSignature = verifyPaymentSignature(input.razorpayOrderId, input.razorpayPaymentId, input.razorpaySignature);
    if (!validSignature) {
      logError("verifyPayment: signature mismatch", { userId: user.id, context: { orderId: input.razorpayOrderId } });
      return { ok: false, message: "Payment verification failed. If money was deducted, contact support." };
    }

    const order = await fetchOrder(input.razorpayOrderId);
    if (order.status !== "paid") {
      return { ok: false, message: "Payment has not completed yet. Please try again in a moment." };
    }
    // The order was created with notes.studentId set to whoever initiated
    // checkout — confirm it matches the session calling verifyPayment now,
    // so a valid signature for someone else's order can't be replayed here.
    if (order.notes.studentId !== user.id) {
      logError("verifyPayment: order studentId mismatch", { userId: user.id, context: { orderId: input.razorpayOrderId } });
      return { ok: false, message: "This payment doesn't belong to your account." };
    }

    await recordPurchaseAndGrantAccess({
      studentId: user.id,
      provider: "razorpay",
      providerReference: input.razorpayPaymentId,
      amountPaise: order.amountPaidPaise,
      currency: order.currency,
      status: "completed",
    });

    return { ok: true, message: "Payment successful! You now have lifetime access." };
  } catch (e) {
    logError("verifyPayment: failed to finalize", {
      userId: user.id,
      context: { orderId: input.razorpayOrderId, error: e instanceof Error ? e.message : String(e) },
    });
    return { ok: false, message: "Could not confirm your payment. If money was deducted, contact support." };
  }
}
