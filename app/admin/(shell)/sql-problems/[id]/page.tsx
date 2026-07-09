import Link from "next/link";
import { getSqlProblemById } from "@/lib/actions/sql-problems";
import { SqlProblemForm } from "@/components/SqlProblemForm";

export default async function EditSqlProblemPage({
  params,
}: {
  params: { id: string };
}) {
  const id = Number(params.id);

  if (isNaN(id)) {
    return (
      <div className="max-w-container-max mx-auto">
        <p className="font-body-md text-body-md text-on-surface-variant mb-3">Invalid problem ID.</p>
        <Link href="/admin/sql-problems" className="text-secondary font-medium hover:underline">Back to SQL Problems</Link>
      </div>
    );
  }

  const problem = await getSqlProblemById(id);

  if (!problem) {
    return (
      <div className="max-w-container-max mx-auto">
        <p className="font-body-md text-body-md text-on-surface-variant mb-3">SQL problem not found.</p>
        <Link href="/admin/sql-problems" className="text-secondary font-medium hover:underline">Back to SQL Problems</Link>
      </div>
    );
  }

  return (
    <SqlProblemForm
      mode="edit"
      backHref="/admin/sql-problems"
      cancelHref="/admin/sql-problems"
      initial={problem}
    />
  );
}
