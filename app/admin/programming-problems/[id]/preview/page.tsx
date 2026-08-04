import Link from "next/link";
import { getProblemById } from "@/lib/actions/programming-problems";
import { ProblemSolveView } from "@/components/ProblemSolveView";
import { AdminPreviewBanner } from "@/components/AdminPreviewBanner";
import { getWrapperAdapter, FUNCTION_ONLY_LANGUAGES } from "@/lib/wrappers";

export default async function AdminProblemPreviewPage({
  params,
}: {
  params: { id: string };
}) {
  const id = Number(params.id);

  if (isNaN(id)) {
    return (
      <div className="p-10 text-center">
        <p className="font-body-md text-body-md text-on-surface-variant mb-3">Invalid problem ID.</p>
        <Link href="/admin/programming-problems" className="text-secondary font-medium hover:underline">Back to Programming Problems</Link>
      </div>
    );
  }

  const problem = await getProblemById(id);

  if (!problem) {
    return (
      <div className="p-10 text-center">
        <p className="font-body-md text-body-md text-on-surface-variant mb-3">Programming problem not found.</p>
        <Link href="/admin/programming-problems" className="text-secondary font-medium hover:underline">Back to Programming Problems</Link>
      </div>
    );
  }

  const functionStub: Record<string, string> = {};
  if (problem.executionStyle === "FUNCTION_ONLY" && problem.functionSignature) {
    for (const langId of FUNCTION_ONLY_LANGUAGES) {
      const adapter = getWrapperAdapter(langId);
      if (adapter) functionStub[langId] = adapter.renderFunctionStub(problem.functionSignature);
    }
  }

  return (
    <ProblemSolveView
      problem={problem}
      functionStub={functionStub}
      backHref="/admin/programming-problems"
      backLabel="Back to Programming Problems"
      banner={<AdminPreviewBanner />}
    />
  );
}
