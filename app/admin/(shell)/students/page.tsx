import { getStudents } from "@/lib/actions/admin-students";
import { StudentsClientPage } from "./StudentsClientPage";

interface SearchParams { search?: string; status?: string; page?: string; size?: string }

export default async function AdminStudentsPage({ searchParams }: { searchParams: SearchParams }) {
  const search = searchParams.search ?? "";
  const status = searchParams.status ?? "all";
  const page = Math.max(1, Number(searchParams.page ?? "1"));
  const pageSize = [10, 25, 50, 100].includes(Number(searchParams.size)) ? Number(searchParams.size) : 25;

  const initial = await getStudents({ search, status, page, pageSize });

  return (
    <StudentsClientPage
      initial={initial}
      initialSearch={search}
      initialStatus={status}
      initialPage={page}
      pageSize={pageSize}
    />
  );
}
