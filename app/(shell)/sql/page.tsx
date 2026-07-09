import { Suspense } from "react";
import { getSqlProblems } from "@/lib/actions/sql-problems";
import { StudentSqlTable } from "@/components/StudentSqlTable";

type SearchParams = { [key: string]: string | string[] | undefined };
function sp(params: SearchParams, key: string): string | undefined {
  const v = params[key];
  return typeof v === "string" ? v : undefined;
}

export default async function SqlPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const problems = await getSqlProblems({
    onlyPublished: true,
    search: sp(searchParams, "search"),
    difficulty: sp(searchParams, "difficulty"),
    availability: sp(searchParams, "availability"),
  });
  return (
    <Suspense>
      <StudentSqlTable problems={problems} />
    </Suspense>
  );
}
