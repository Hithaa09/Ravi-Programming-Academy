// Razorpay integration — plain server-only module, deliberately NOT marked
// "use server" (same reason lib/judge0.ts isn't): it's imported by both a
// Server Actions file (lib/payments/checkout.ts) and a Route Handler
// (app/webhooks/razorpay/route.ts), and must never become a client-callable
// RPC endpoint itself.
//
// RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET are needed for checkout (order
// creation + payment verification) — this works standalone from localhost,
// no public URL needed. RAZORPAY_WEBHOOK_SECRET is a separate, independent
// requirement used only by the webhook route, generated when the webhook URL
// is registered in the Razorpay dashboard — which needs a public URL, so it's
// only available post-deploy (or via a tunnel like ngrok). Deliberately two
// separate config checks, not one all-or-nothing gate: requiring the webhook
// secret before checkout would work would block all local testing for no
// reason, since checkout itself never touches it.
//
// Test-mode keys (from the Razorpay dashboard, no KYC required) work
// identically to live keys — which mode you're in is purely a property of
// which key you configured, unlike Judge0's JUDGE0_MODE (that one exists
// because self-hosted vs RapidAPI are genuinely different APIs; Razorpay
// test vs live is the same API, different keys).

import Razorpay from "razorpay";

class RazorpayConfigError extends Error {}

function getConfig(): { keyId: string; keySecret: string } {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;

  if (!keyId) throw new RazorpayConfigError("RAZORPAY_KEY_ID environment variable is not set.");
  if (!keySecret) throw new RazorpayConfigError("RAZORPAY_KEY_SECRET environment variable is not set.");

  return { keyId, keySecret };
}

function getWebhookSecret(): string {
  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!webhookSecret) throw new RazorpayConfigError("RAZORPAY_WEBHOOK_SECRET environment variable is not set.");
  return webhookSecret;
}

// True once the checkout-only config (key id/secret) is present — checked
// before ever attempting a real API call, so a missing/incomplete config
// fails with a clear "not available" message instead of a raw exception
// reaching a student. Does NOT require the webhook secret — see note above.
export function isRazorpayConfigured(): boolean {
  try {
    getConfig();
    return true;
  } catch {
    return false;
  }
}

function getClient(): Razorpay {
  const { keyId, keySecret } = getConfig();
  return new Razorpay({ key_id: keyId, key_secret: keySecret });
}

export interface CreatedOrder {
  orderId: string;
  amountPaise: number;
  currency: string;
  keyId: string;
}

// notes.studentId is how the webhook (which has no session) knows who to
// grant access to — Razorpay echoes notes back on every payment/order object.
export async function createOrder(amountPaise: number, currency: string, notes: Record<string, string>): Promise<CreatedOrder> {
  const { keyId } = getConfig();
  const client = getClient();
  const order = await client.orders.create({
    amount: amountPaise,
    currency,
    notes,
  });
  return { orderId: order.id, amountPaise: Number(order.amount), currency: order.currency, keyId };
}

export interface FetchedOrder {
  status: string;
  amountPaidPaise: number;
  currency: string;
  notes: Record<string, string>;
}

// Used by verifyPayment to get the authoritative paid amount server-side —
// never trust an amount the client could have tampered with.
export async function fetchOrder(orderId: string): Promise<FetchedOrder> {
  const client = getClient();
  const order = await client.orders.fetch(orderId);
  return {
    status: order.status,
    amountPaidPaise: order.amount_paid,
    currency: order.currency,
    notes: (order.notes ?? {}) as Record<string, string>,
  };
}

// Both the client-side post-checkout verification and the webhook use the
// same primitive (Razorpay.validateWebhookSignature, HMAC-SHA256) — only the
// payload string differs. This is Razorpay's own documented formula for
// payment verification ("order_id|payment_id"), not a hand-rolled scheme.
export function verifyPaymentSignature(orderId: string, paymentId: string, signature: string): boolean {
  const { keySecret } = getConfig();
  return Razorpay.validateWebhookSignature(`${orderId}|${paymentId}`, signature, keySecret);
}

export function verifyWebhookSignature(rawBody: string, signature: string): boolean {
  const webhookSecret = getWebhookSecret();
  return Razorpay.validateWebhookSignature(rawBody, signature, webhookSecret);
}
