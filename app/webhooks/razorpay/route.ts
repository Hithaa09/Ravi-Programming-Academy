import { NextResponse } from "next/server";
import { verifyWebhookSignature } from "@/lib/payments/razorpay";
import { recordPurchaseAndGrantAccess, revokeAccessForRefund } from "@/lib/payments/access";
import { logError } from "@/lib/log";

// Razorpay calls this directly — no session, no browser. Must stay publicly
// reachable (see the exclusion in middleware.ts) and do its own auth via
// signature verification instead of a Supabase session.
//
// Defense in depth alongside lib/payments/checkout.ts's verifyPayment: this
// webhook is the source of truth if the browser closes before the
// client-side success callback fires. Both paths call the exact same
// recordPurchaseAndGrantAccess(), which is idempotent (a duplicate call for
// the same payment is a no-op, not a duplicate grant) — see its comment in
// lib/payments/access.ts.
//
// Explicit, not relying on the default: the razorpay SDK and its crypto
// usage need the Node.js runtime, not Edge — Route Handlers default to
// Node.js already, but stating it removes any doubt on a platform (Vercel)
// where Edge is the default for Middleware and easy to reach for elsewhere.
export const runtime = "nodejs";

export async function POST(request: Request) {
  // Raw text, not request.json() — signature verification needs the exact
  // raw bytes Razorpay signed, not a re-serialized object (this is the
  // first raw-body-reading Route Handler in this codebase; no other route
  // needed one before).
  const rawBody = await request.text();
  const signature = request.headers.get("x-razorpay-signature");

  // Everything below can throw (verifyWebhookSignature reads env vars and
  // throws a RazorpayConfigError if any are missing/misconfigured;
  // recordPurchaseAndGrantAccess touches the DB) — wrapped so a genuinely
  // unexpected failure always comes back as a clean JSON response, never a
  // raw framework error page. Razorpay retries on any non-2xx status, so a
  // 500 here is safe/expected for transient failures, not silently dropped.
  try {
    if (!signature || !verifyWebhookSignature(rawBody, signature)) {
      logError("razorpay webhook: invalid or missing signature", { context: { hasSignature: Boolean(signature) } });
      return NextResponse.json({ error: "invalid signature" }, { status: 400 });
    }

    let event: unknown;
    try {
      event = JSON.parse(rawBody);
    } catch {
      return NextResponse.json({ error: "invalid payload" }, { status: 400 });
    }

    const eventName = (event as { event?: string })?.event;
    if (eventName === "payment.captured") {
      const payment = (event as { payload?: { payment?: { entity?: Record<string, unknown> } } })?.payload?.payment?.entity;
      const studentId = payment?.notes && typeof payment.notes === "object" ? (payment.notes as Record<string, string>).studentId : undefined;
      const paymentId = payment?.id as string | undefined;
      const amount = payment?.amount as number | undefined;
      const currency = payment?.currency as string | undefined;

      if (studentId && paymentId) {
        await recordPurchaseAndGrantAccess({
          studentId,
          provider: "razorpay",
          providerReference: paymentId,
          amountPaise: amount ?? null,
          currency: currency ?? "INR",
          status: "completed",
        });
      } else {
        logError("razorpay webhook: payment.captured missing studentId note or payment id", { context: { paymentId } });
      }
    } else if (eventName === "refund.processed") {
      // Any refund (partial or full) on a lifetime-access purchase revokes
      // access — this is a flat one-time purchase, not usage-based, so a
      // partial refund still means the admin decided this purchase should
      // no longer stand.
      const refund = (event as { payload?: { refund?: { entity?: Record<string, unknown> } } })?.payload?.refund?.entity;
      const paymentId = refund?.payment_id as string | undefined;

      if (paymentId) {
        const result = await revokeAccessForRefund(paymentId);
        if (!result.ok) {
          logError("razorpay webhook: refund.processed could not find matching purchase", {
            context: { paymentId, reason: result.reason },
          });
        }
      } else {
        logError("razorpay webhook: refund.processed missing payment_id", { context: {} });
      }
    }

    // 2xx tells Razorpay not to retry; any other event type is intentionally
    // ignored (acknowledged, not an error) — only payment.captured and
    // refund.processed change access.
    return NextResponse.json({ ok: true });
  } catch (e) {
    logError("razorpay webhook: unhandled error", { context: { error: e instanceof Error ? e.message : String(e) } });
    return NextResponse.json({ error: "internal error" }, { status: 500 });
  }
}
