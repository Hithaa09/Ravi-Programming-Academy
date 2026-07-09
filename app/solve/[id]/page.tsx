import Link from "next/link";
import { getProblemById } from "@/lib/actions/programming-problems";
import { ProblemSolveView } from "@/components/ProblemSolveView";

export default async function SolveProblemPage({
  params,
}: {
  params: { id: string };
}) {
  const id = Number(params.id);

  if (isNaN(id)) {
    return (
      <div className="p-10 text-center">
        <p className="font-body-md text-body-md text-on-surface-variant">Invalid problem ID.</p>
        <Link href="/problems" className="text-secondary font-medium">Back to Problems</Link>
      </div>
    );
  }

  const problem = await getProblemById(id);

  if (!problem || problem.status !== "Published") {
    return (
      <div className="p-10 text-center">
        <p className="font-body-md text-body-md text-on-surface-variant">Problem not found.</p>
        <Link href="/problems" className="text-secondary font-medium">Back to Problems</Link>
      </div>
    );
  }

  if (problem.availability === "Locked") {
    return (
      <div className="p-10 text-center">
        <span className="material-symbols-outlined text-[48px] text-on-surface-variant/40 block mb-3">lock</span>
        <p className="font-body-md text-body-md text-on-surface-variant">This problem is currently locked.</p>
        <Link href="/problems" className="text-secondary font-medium">Back to Problems</Link>
      </div>
    );
  }

  return <ProblemSolveView problem={problem} backHref="/problems" backLabel="Back to Problems" />;
}
