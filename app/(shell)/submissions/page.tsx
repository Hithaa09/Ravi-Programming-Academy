import { createClient } from "@/lib/supabase/server";
import { getSqlSubmissionsByStudent } from "@/lib/actions/sql-submissions";
import { getProgrammingSubmissionsByStudent } from "@/lib/actions/programming-submissions";
import { SubmissionsTable, type UnifiedSubmission } from "./SubmissionsTable";

export default async function SubmissionsPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const [sqlSubmissions, programmingSubmissions] = user
    ? await Promise.all([
        getSqlSubmissionsByStudent(user.id),
        getProgrammingSubmissionsByStudent(user.id),
      ])
    : [[], []];

  const submissions: UnifiedSubmission[] = [
    ...sqlSubmissions.map((s) => ({
      key: `sql-${s.id}`,
      language: "SQL",
      problemTitle: s.problemTitle,
      problemDifficulty: s.problemDifficulty,
      verdict: s.verdict,
      executionTimeMs: s.executionTimeMs,
      passed: s.passedDatasets,
      total: s.totalDatasets,
      submittedAt: s.submittedAt,
    })),
    ...programmingSubmissions.map((s) => ({
      key: `programming-${s.id}`,
      language: s.language,
      problemTitle: s.problemTitle,
      problemDifficulty: s.problemDifficulty,
      verdict: s.verdict,
      executionTimeMs: s.executionTimeMs,
      passed: s.passedTests,
      total: s.totalTests,
      submittedAt: s.submittedAt,
    })),
  ].sort((a, b) => b.submittedAt.getTime() - a.submittedAt.getTime());

  return (
    <div className="max-w-container-max mx-auto">
      <h1 className="font-headline-xl text-headline-xl text-on-surface mb-8">Submissions</h1>
      <SubmissionsTable submissions={submissions} />
    </div>
  );
}
