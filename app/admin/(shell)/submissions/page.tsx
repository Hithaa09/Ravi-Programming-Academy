import { getAllSqlSubmissions } from "@/lib/actions/sql-submissions";
import { AdminSubmissionsTable } from "./AdminSubmissionsTable";

export default async function AdminSubmissionsPage() {
  const submissions = await getAllSqlSubmissions();

  const total = submissions.length;
  const accepted = submissions.filter((s) => s.verdict === "Accepted").length;
  const wrongAnswer = submissions.filter((s) => s.verdict === "Wrong Answer").length;
  const errors = submissions.filter((s) => s.verdict === "Error").length;
  const pct = (n: number) => total === 0 ? 0 : Math.round((n / total) * 100);

  const stats = {
    total,
    accepted,
    acceptedPct: pct(accepted),
    wrongAnswer,
    wrongAnswerPct: pct(wrongAnswer),
    errors,
    errorsPct: pct(errors),
  };

  return (
    <div className="max-w-container-max mx-auto space-y-6">
      <div>
        <h1 className="font-headline-xl text-headline-xl text-on-surface">Submissions</h1>
        <p className="font-body-md text-body-md text-on-surface-variant mt-1">
          All SQL submissions made by students.
        </p>
      </div>
      <AdminSubmissionsTable submissions={submissions} stats={stats} />
    </div>
  );
}
