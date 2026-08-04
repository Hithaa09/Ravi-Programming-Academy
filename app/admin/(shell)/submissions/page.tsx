import { getAllSqlSubmissions } from "@/lib/actions/sql-submissions";
import { getAllProgrammingSubmissions } from "@/lib/actions/programming-submissions";
import { AdminSubmissionsTable, type UnifiedAdminSubmission } from "./AdminSubmissionsTable";

const NON_ACCEPTED_NON_WRONG_VERDICTS = new Set([
  "Compilation Error",
  "Runtime Error",
  "Time Limit Exceeded",
  "Memory Limit Exceeded",
  "Error",
]);

export default async function AdminSubmissionsPage() {
  const [sqlSubmissions, programmingSubmissions] = await Promise.all([
    getAllSqlSubmissions(),
    getAllProgrammingSubmissions(),
  ]);

  const submissions: UnifiedAdminSubmission[] = [
    ...sqlSubmissions.map((s) => ({
      id: s.id,
      type: "sql" as const,
      language: "SQL",
      studentEmail: s.studentEmail,
      problemTitle: s.problemTitle,
      verdict: s.verdict,
      executionTimeMs: s.executionTimeMs,
      passed: s.passedDatasets,
      total: s.totalDatasets,
      submittedAt: s.submittedAt,
    })),
    ...programmingSubmissions.map((s) => ({
      id: s.id,
      type: "programming" as const,
      language: s.language,
      studentEmail: s.studentEmail,
      problemTitle: s.problemTitle,
      verdict: s.verdict,
      executionTimeMs: s.executionTimeMs,
      passed: s.passedTests,
      total: s.totalTests,
      submittedAt: s.submittedAt,
    })),
  ].sort((a, b) => b.submittedAt.getTime() - a.submittedAt.getTime());

  const total = submissions.length;
  const accepted = submissions.filter((s) => s.verdict === "Accepted").length;
  const wrongAnswer = submissions.filter((s) => s.verdict === "Wrong Answer").length;
  const errors = submissions.filter((s) => NON_ACCEPTED_NON_WRONG_VERDICTS.has(s.verdict)).length;
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
          All SQL and programming submissions made by students.
        </p>
      </div>
      <AdminSubmissionsTable submissions={submissions} stats={stats} />
    </div>
  );
}
