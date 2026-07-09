import Link from "next/link";
import { getSqlProblemById } from "@/lib/actions/sql-problems";
import { SqlSolveView } from "@/components/SqlSolveView";
import { AdminPreviewBanner } from "@/components/AdminPreviewBanner";

export default async function AdminSqlProblemPreviewPage({
  params,
}: {
  params: { id: string };
}) {
  const id = Number(params.id);

  if (isNaN(id)) {
    return (
      <div className="p-10 text-center">
        <p className="font-body-md text-body-md text-on-surface-variant mb-3">Invalid problem ID.</p>
        <Link href="/admin/sql-problems" className="text-secondary font-medium hover:underline">Back to SQL Problems</Link>
      </div>
    );
  }

  const problem = await getSqlProblemById(id);

  if (!problem) {
    return (
      <div className="p-10 text-center">
        <p className="font-body-md text-body-md text-on-surface-variant mb-3">SQL problem not found.</p>
        <Link href="/admin/sql-problems" className="text-secondary font-medium hover:underline">Back to SQL Problems</Link>
      </div>
    );
  }

  return (
    <SqlSolveView
      problem={problem}
      backHref="/admin/sql-problems"
      backLabel="Back to SQL Problems"
      banner={<AdminPreviewBanner />}
    />
  );
}
