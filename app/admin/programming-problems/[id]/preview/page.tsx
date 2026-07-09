import Link from "next/link";
import { getProblemById } from "@/lib/actions/programming-problems";
import { ProblemSolveView } from "@/components/ProblemSolveView";
import { AdminPreviewBanner } from "@/components/AdminPreviewBanner";

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

  return (
    <ProblemSolveView
      problem={problem}
      backHref="/admin/programming-problems"
      backLabel="Back to Programming Problems"
      banner={<AdminPreviewBanner />}
    />
  );
}
