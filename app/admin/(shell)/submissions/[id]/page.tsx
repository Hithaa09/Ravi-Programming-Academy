import Link from "next/link";
import { getSqlSubmissionById } from "@/lib/actions/sql-submissions";

export default async function SqlSubmissionDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const id = Number(params.id);

  if (isNaN(id)) {
    return (
      <div className="p-10 text-center">
        <p className="font-body-md text-body-md text-on-surface-variant">Invalid submission ID.</p>
        <Link href="/admin/submissions" className="text-secondary font-medium">Back to Submissions</Link>
      </div>
    );
  }

  const sub = await getSqlSubmissionById(id);

  if (!sub) {
    return (
      <div className="p-10 text-center">
        <p className="font-body-md text-body-md text-on-surface-variant">Submission not found.</p>
        <Link href="/admin/submissions" className="text-secondary font-medium">Back to Submissions</Link>
      </div>
    );
  }

  const verdictColor =
    sub.verdict === "Accepted"
      ? "text-green-600 bg-green-50 border-green-200"
      : sub.verdict === "Wrong Answer"
      ? "text-red-600 bg-red-50 border-red-200"
      : "text-amber-600 bg-amber-50 border-amber-200";

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-2">
        <Link
          href="/admin/submissions"
          className="text-on-surface-variant hover:text-on-surface transition-colors font-body-md text-body-md flex items-center gap-1"
        >
          <span className="material-symbols-outlined text-[18px]">arrow_back</span>
          Submissions
        </Link>
      </div>

      <div>
        <h1 className="font-headline-xl text-headline-xl text-on-surface">Submission #{sub.id}</h1>
        <p className="font-body-md text-body-md text-on-surface-variant mt-1">{sub.problemTitle}</p>
      </div>

      {/* Verdict banner */}
      <div className={`rounded-xl border px-6 py-4 font-semibold text-lg ${verdictColor}`}>
        {sub.verdict}
        <span className="ml-3 font-normal text-sm">
          {sub.passedDatasets} / {sub.totalDatasets} test cases passed
        </span>
      </div>

      {/* Metadata grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-surface-container-lowest rounded-xl border border-outline-variant/20 p-4">
          <p className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider mb-1">Student</p>
          <p className="font-body-md text-body-md text-on-surface break-all">{sub.studentEmail}</p>
        </div>
        <div className="bg-surface-container-lowest rounded-xl border border-outline-variant/20 p-4">
          <p className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider mb-1">Problem</p>
          <p className="font-body-md text-body-md text-on-surface">{sub.problemTitle}</p>
        </div>
        <div className="bg-surface-container-lowest rounded-xl border border-outline-variant/20 p-4">
          <p className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider mb-1">Exec Time</p>
          <p className="font-body-md text-body-md text-on-surface">{sub.executionTimeMs} ms</p>
        </div>
        <div className="bg-surface-container-lowest rounded-xl border border-outline-variant/20 p-4">
          <p className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider mb-1">Submitted On</p>
          <p className="font-body-md text-body-md text-on-surface">
            {new Date(sub.submittedAt).toLocaleString("en-US", {
              month: "short", day: "2-digit", year: "numeric",
              hour: "numeric", minute: "2-digit",
            })}
          </p>
        </div>
      </div>

      {/* Query */}
      <div className="bg-surface-container-lowest rounded-xl border border-outline-variant/20 overflow-hidden">
        <div className="px-6 py-3 border-b border-outline-variant/10 flex items-center gap-2">
          <span className="material-symbols-outlined text-[18px] text-on-surface-variant">code</span>
          <p className="font-label-md text-label-md text-on-surface-variant uppercase tracking-wider text-xs font-semibold">
            Submitted Query
          </p>
        </div>
        <pre className="px-6 py-4 font-mono text-sm text-on-surface whitespace-pre-wrap break-all overflow-x-auto">
          {sub.query}
        </pre>
      </div>
    </div>
  );
}
