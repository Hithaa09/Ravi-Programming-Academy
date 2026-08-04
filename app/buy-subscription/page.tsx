import { redirect } from "next/navigation";
import { getAuthUser } from "@/lib/auth/get-user";
import { hasLifetimeAccess } from "@/lib/payments/access";
import { prisma } from "@/lib/prisma";
import { BuySubscriptionCheckout } from "@/components/BuySubscriptionCheckout";

export default async function BuySubscriptionPage() {
  const user = await getAuthUser();
  // Middleware already redirects unauthenticated visitors to /login for this
  // route (it's not in the public-route exclusion list) — this is a defensive
  // fallback, not the primary auth gate.
  if (!user) redirect("/login");

  const [alreadyHasAccess, profile] = await Promise.all([
    hasLifetimeAccess(user.id),
    prisma.profile.findUnique({ where: { id: user.id }, select: { fullName: true, email: true } }),
  ]);

  return (
    <BuySubscriptionCheckout
      alreadyHasAccess={alreadyHasAccess}
      studentName={profile?.fullName ?? ""}
      studentEmail={profile?.email ?? user.email ?? ""}
    />
  );
}
