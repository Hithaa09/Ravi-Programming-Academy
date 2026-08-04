import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { getPlatformSettings } from "@/lib/payments/settings";
import { AdminSettingsClient } from "./AdminSettingsClient";

function initialsFrom(fullName: string | null, email: string): string {
  const src = (fullName ?? email).trim();
  const parts = src.split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase() || "?";
}

export default async function AdminSettingsPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) notFound();

  const profile = await prisma.profile.findUnique({
    where: { id: user.id },
    select: { fullName: true, email: true, role: true, createdAt: true },
  });
  if (!profile) notFound();

  const platformSettings = await getPlatformSettings();

  return (
    <AdminSettingsClient
      initials={initialsFrom(profile.fullName, profile.email)}
      fullName={profile.fullName ?? profile.email}
      email={profile.email}
      role={profile.role}
      joinedOn={profile.createdAt.toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" })}
      initialPaymentsEnabled={platformSettings.paymentsEnabled}
      initialSubscriptionPriceInr={platformSettings.subscriptionPriceInr}
    />
  );
}
