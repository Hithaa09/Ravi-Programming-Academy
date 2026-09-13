import { getAuditLogEntries } from "@/lib/actions/admin-audit-log";
import { AdminAuditLogTable } from "@/components/AdminAuditLogTable";

export default async function AdminAuditLogPage() {
  const entries = await getAuditLogEntries();
  return <AdminAuditLogTable entries={entries} />;
}
