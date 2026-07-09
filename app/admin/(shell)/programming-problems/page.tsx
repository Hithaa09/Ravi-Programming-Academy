import { Suspense } from "react";
import { getProblems } from "@/lib/actions/programming-problems";
import { AdminProgrammingProblemsTable } from "@/components/AdminProgrammingProblemsTable";

type SearchParams = { [key: string]: string | string[] | undefined };
function sp(params: SearchParams, key: string): string | undefined {
  const v = params[key];
  return typeof v === "string" ? v : undefined;
}

export default async function AdminProblemsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const problems = await getProblems({
    search: sp(searchParams, "search"),
    difficulty: sp(searchParams, "difficulty"),
    status: sp(searchParams, "status"),
    availability: sp(searchParams, "availability"),
  });
  return (
    <Suspense>
      <AdminProgrammingProblemsTable problems={problems} />
    </Suspense>
  );
}
