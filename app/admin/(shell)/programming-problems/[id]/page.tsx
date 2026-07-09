import Link from "next/link";
import { getProblemById } from "@/lib/actions/programming-problems";
import { ProgrammingProblemForm } from "@/components/ProgrammingProblemForm";

export default async function EditProblemPage({
  params,
}: {
  params: { id: string };
}) {
  const id = Number(params.id);

  if (isNaN(id)) {
    return (
      <div className="max-w-container-max mx-auto">
        <p className="font-body-md text-body-md text-on-surface-variant mb-3">Invalid problem ID.</p>
        <Link href="/admin/programming-problems" className="text-secondary font-medium hover:underline">
          Back to Programming Problems
        </Link>
      </div>
    );
  }

  const problem = await getProblemById(id);

  if (!problem) {
    return (
      <div className="max-w-container-max mx-auto">
        <p className="font-body-md text-body-md text-on-surface-variant mb-3">Programming problem not found.</p>
        <Link href="/admin/programming-problems" className="text-secondary font-medium hover:underline">
          Back to Programming Problems
        </Link>
      </div>
    );
  }

  return (
    <ProgrammingProblemForm
      mode="edit"
      backHref="/admin/programming-problems"
      cancelHref="/admin/programming-problems"
      initial={problem}
    />
  );
}
