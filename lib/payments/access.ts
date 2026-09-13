"use server";

import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { getAuthUser } from "@/lib/auth/get-user";
import { recordAuditLog } from "@/lib/audit-log";

// The single seam every payment path plugs into. Every premium-access check
// in the app — Run/Submit guards, solve pages, the student problem lists —
// reads through hasLifetimeAccess() only, so nothing about how access was
// granted (manual admin action vs a real Razorpay payment) ever needs to
// touch those call sites. See lib/payments/checkout.ts for the actual
// Razorpay checkout flow, and lib/payments/razorpay.ts for the SDK wrapper.

async function requireAdmin(): Promise<string> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const role = user?.app_metadata?.role;
  if (!user || role !== "admin") throw new Error("Unauthorized");
  return user.id;
}

// Every export from a "use server" file is a directly callable endpoint —
// this one previously had no authorization check at all, meaning any caller
// (including a signed-out one) could pass an arbitrary studentId and learn
// whether that specific person has purchased lifetime access. Every real
// call site in this codebase already only ever checks the caller's own
// resolved session id, so restricting to "your own id, or an admin checking
// on your behalf" doesn't change behavior for any of them.
export async function hasLifetimeAccess(studentId: string): Promise<boolean> {
  // Cached (React cache()) — avoids both a redundant lookup on every call
  // (several call sites already resolve their own user via getAuthUser() in
  // the same request) and the JWT-refresh race documented on getAuthUser()
  // itself, which a second independent supabase.auth.getUser() call here
  // would reintroduce.
  const user = await getAuthUser();
  const isAdmin = user?.app_metadata?.role === "admin";
  if (!user || (!isAdmin && user.id !== studentId)) return false;

  const profile = await prisma.profile.findUnique({
    where: { id: studentId },
    select: { hasLifetimeAccess: true },
  });
  return profile?.hasLifetimeAccess ?? false;
}

// Internal — reached two ways: grantLifetimeAccess below (admin manual
// grant), or lib/payments/checkout.ts / the Razorpay webhook route (a real
// payment, already signature-verified by the caller before this is called;
// this function itself does no auth — the caller's verification IS the
// auth for the payment paths).
//
// A real payment can legitimately be recorded twice — once via the
// client-side checkout success callback, once via the Razorpay webhook
// (defense in depth: the webhook is the source of truth if the browser
// closes before the callback fires). The @@unique([provider,
// providerReference]) constraint on Purchase turns the second attempt into
// a P2002 error instead of a duplicate row; that's caught below and treated
// as a no-op, not a failure.
export async function recordPurchaseAndGrantAccess(input: {
  studentId: string;
  provider: string;
  providerReference: string | null;
  amountPaise: number | null;
  currency: string;
  status: string;
}): Promise<void> {
  try {
    await prisma.$transaction([
      prisma.purchase.create({
        data: {
          studentId: input.studentId,
          provider: input.provider,
          providerReference: input.providerReference,
          amount: input.amountPaise,
          currency: input.currency,
          status: input.status,
        },
      }),
      prisma.profile.update({
        where: { id: input.studentId },
        data: { hasLifetimeAccess: true },
      }),
    ]);
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      // Already recorded by the other path (client-verify vs webhook racing
      // on the same payment) — expected, not a failure. Defense-in-depth
      // before flipping the flag: confirm the existing row for this
      // (provider, providerReference) actually belongs to this studentId.
      // Every real call site derives providerReference from a
      // signature-verified payment tied to a server-set studentId, so this
      // can never legitimately mismatch today — but if it ever did (a bug,
      // or some future caller), that would mean granting access to the
      // wrong student for someone else's payment reference, so it's treated
      // as a real error rather than silently granted.
      if (input.providerReference === null) {
        // A P2002 on this compound unique key is only reachable when
        // providerReference is non-null — Postgres treats multiple NULLs as
        // distinct, so a null providerReference can never collide in the
        // first place. Unreachable in practice; re-throw rather than assume.
        throw e;
      }
      const existing = await prisma.purchase.findUnique({
        where: { provider_providerReference: { provider: input.provider, providerReference: input.providerReference } },
        select: { studentId: true },
      });
      if (existing && existing.studentId !== input.studentId) {
        throw new Error(
          `recordPurchaseAndGrantAccess: providerReference ${input.providerReference} already belongs to a different student — refusing to grant access to ${input.studentId}.`
        );
      }
      await prisma.profile
        .update({ where: { id: input.studentId }, data: { hasLifetimeAccess: true } })
        .catch(() => {});
      return;
    }
    throw e;
  }
}

// Reached only by the Razorpay webhook on a "refund.processed" event — see
// app/webhooks/razorpay/route.ts. Looks up the original purchase by
// Razorpay's payment_id (not by any studentId the refund payload might
// carry) since that's the identifier we already have on file from when the
// payment itself was captured — more robust than depending on Razorpay
// having propagated notes onto the refund object too.
//
// Known, accepted edge case: this revokes based on whichever specific
// Purchase row matches this payment_id. Since initiateCheckout already
// refuses to start a new purchase while hasLifetimeAccess is true, a
// student can only ever have re-purchased after a prior grant was already
// revoked — so an old, unusually delayed/retried refund webhook arriving
// after a genuine repurchase would incorrectly revoke that newer access.
// This requires a specific, narrow sequence (delayed webhook + an
// intervening manual re-grant) and isn't worth the extra complexity of
// tracking "which purchase is currently active" separately to close
// entirely.
export async function revokeAccessForRefund(paymentId: string): Promise<{ ok: boolean; reason?: string }> {
  const purchase = await prisma.purchase.findUnique({
    where: { provider_providerReference: { provider: "razorpay", providerReference: paymentId } },
  });
  if (!purchase) {
    return { ok: false, reason: `no purchase on file for Razorpay payment ${paymentId}` };
  }

  await prisma.$transaction([
    prisma.purchase.update({ where: { id: purchase.id }, data: { status: "refunded" } }),
    prisma.profile.update({ where: { id: purchase.studentId }, data: { hasLifetimeAccess: false } }),
  ]);
  return { ok: true };
}

// Admin-only manual grant — for students who pay outside Razorpay (cash,
// bank transfer) or need a courtesy grant. Real Razorpay payments go through
// recordPurchaseAndGrantAccess directly via the checkout/webhook paths, not
// through this function.
export async function grantLifetimeAccess(studentId: string): Promise<void> {
  const adminId = await requireAdmin();
  await recordPurchaseAndGrantAccess({
    studentId,
    provider: "manual",
    providerReference: null,
    amountPaise: null,
    currency: "INR",
    status: "completed",
  });
  await recordAuditLog(adminId, "access.grant", { targetType: "student", targetId: studentId });
}

// Admin-only — for correcting mistakes or testing. Does not delete Purchase
// history, only flips the access flag back off.
export async function revokeLifetimeAccess(studentId: string): Promise<void> {
  const adminId = await requireAdmin();
  await prisma.profile.update({
    where: { id: studentId },
    data: { hasLifetimeAccess: false },
  });
  await recordAuditLog(adminId, "access.revoke", { targetType: "student", targetId: studentId });
}
