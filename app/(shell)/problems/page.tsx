import { Suspense } from "react";
import { getProblems } from "@/lib/actions/programming-problems";
import { StudentProblemsTable } from "@/components/StudentProblemsTable";

type SearchParams = { [key: string]: string | string[] | undefined };
function sp(params: SearchParams, key: string): string | undefined {
  const v = params[key];
  return typeof v === "string" ? v : undefined;
}

export default async function ProblemsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const problems = await getProblems({
    onlyPublished: true,
    search: sp(searchParams, "search"),
    difficulty: sp(searchParams, "difficulty"),
    availability: sp(searchParams, "availability"),
  });
  return (
    <Suspense>
      <StudentProblemsTable problems={problems} />
    </Suspense>
  );
}
