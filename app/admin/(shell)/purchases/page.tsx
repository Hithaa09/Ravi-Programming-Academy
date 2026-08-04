import { getPurchases } from "@/lib/actions/admin-purchases";
import { AdminPurchasesTable } from "@/components/AdminPurchasesTable";

export default async function AdminPurchasesPage() {
  const purchases = await getPurchases();
  return <AdminPurchasesTable purchases={purchases} />;
}
