import { Suspense } from "react";
import { getSqlProblems } from "@/lib/actions/sql-problems";
import { AdminSqlProblemsTable } from "@/components/AdminSqlProblemsTable";

type SearchParams = { [key: string]: string | string[] | undefined };
function sp(params: SearchParams, key: string): string | undefined {
  const v = params[key];
  return typeof v === "string" ? v : undefined;
}

export default async function AdminSqlPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const problems = await getSqlProblems({
    search: sp(searchParams, "search"),
    difficulty: sp(searchParams, "difficulty"),
    status: sp(searchParams, "status"),
    availability: sp(searchParams, "availability"),
  });
  return (
    <Suspense>
      <AdminSqlProblemsTable problems={problems} />
    </Suspense>
  );
}
