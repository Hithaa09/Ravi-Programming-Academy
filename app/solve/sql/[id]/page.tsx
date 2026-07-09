import Link from "next/link";
import { getSqlProblemById } from "@/lib/actions/sql-problems";
import { SqlSolveView } from "@/components/SqlSolveView";

export default async function SolveSqlProblemPage({
  params,
}: {
  params: { id: string };
}) {
  const id = Number(params.id);

  if (isNaN(id)) {
    return (
      <div className="p-10 text-center">
        <p className="font-body-md text-body-md text-on-surface-variant">Invalid problem ID.</p>
        <Link href="/sql" className="text-secondary font-medium">Back to SQL</Link>
      </div>
    );
  }

  const problem = await getSqlProblemById(id);

  if (!problem || problem.status !== "Published") {
    return (
      <div className="p-10 text-center">
        <p className="font-body-md text-body-md text-on-surface-variant">SQL problem not found.</p>
        <Link href="/sql" className="text-secondary font-medium">Back to SQL</Link>
      </div>
    );
  }

  if (problem.availability === "Locked") {
    return (
      <div className="p-10 text-center">
        <span className="material-symbols-outlined text-[48px] text-on-surface-variant/40 block mb-3">lock</span>
        <p className="font-body-md text-body-md text-on-surface-variant">This problem is currently locked.</p>
        <Link href="/sql" className="text-secondary font-medium">Back to SQL</Link>
      </div>
    );
  }

  // Strip the reference solution before sending to the client — students must not see it.
  return <SqlSolveView problem={{ ...problem, solutionQuery: null }} backHref="/sql" backLabel="Back to SQL" />;
}
