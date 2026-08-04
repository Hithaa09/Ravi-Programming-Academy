import { getStudentDashboardData } from "@/lib/actions/student-dashboard";
import { getAuthUser } from "@/lib/auth/get-user";
import { hasLifetimeAccess } from "@/lib/payments/access";
import { getMyPurchases } from "@/lib/actions/settings";
import { SettingsClient } from "./SettingsClient";

export default async function SettingsPage() {
  const [dashboardData, user] = await Promise.all([
    getStudentDashboardData(),
    getAuthUser(),
  ]);
  const [alreadyHasAccess, purchases] = await Promise.all([
    user ? hasLifetimeAccess(user.id) : Promise.resolve(false),
    getMyPurchases(),
  ]);

  return (
    <SettingsClient
      initialFullName={dashboardData.fullName ?? ""}
      initialEmail={dashboardData.email}
      hasLifetimeAccess={alreadyHasAccess}
      purchases={purchases}
    />
  );
}
