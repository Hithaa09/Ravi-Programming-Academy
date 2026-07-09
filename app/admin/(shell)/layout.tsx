import { AdminLayout } from "@/components/AdminLayout";

export default function AdminShellLayout({ children }: { children: React.ReactNode }) {
  return <AdminLayout>{children}</AdminLayout>;
}
