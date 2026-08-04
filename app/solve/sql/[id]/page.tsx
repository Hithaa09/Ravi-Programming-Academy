import Link from "next/link";
import { getSqlProblemById } from "@/lib/actions/sql-problems";
import { SqlSolveView } from "@/components/SqlSolveView";
import { BuySubscriptionPrompt } from "@/components/BuySubscriptionPrompt";
import { getAuthUser } from "@/lib/auth/get-user";
import { hasLifetimeAccess } from "@/lib/payments/access";

export default async function SolveSqlProblemPage({
  params,
}: {
  params: { id: string };
}) {
  const id = Number(params.id);

  if (isNaN(id)) {
    return (
      <div className="p-10 text-center">
        <p className="font-body-md text-body-md text-on-surface-variant">Invalid problem ID.</p>
        <Link href="/sql" className="text-secondary font-medium">Back to SQL</Link>
      </div>
    );
  }

  const problem = await getSqlProblemById(id);

  if (!problem || problem.status !== "Published") {
    return (
      <div className="p-10 text-center">
        <p className="font-body-md text-body-md text-on-surface-variant">SQL problem not found.</p>
        <Link href="/sql" className="text-secondary font-medium">Back to SQL</Link>
      </div>
    );
  }

  if (problem.availability === "Locked") {
    return (
      <div className="p-10 text-center">
        <span className="material-symbols-outlined text-[48px] text-on-surface-variant/40 block mb-3">lock</span>
        <p className="font-body-md text-body-md text-on-surface-variant">This problem is currently locked.</p>
        <Link href="/sql" className="text-secondary font-medium">Back to SQL</Link>
      </div>
    );
  }

  // Premium gate — see the identical comment in app/solve/[id]/page.tsx.
  const user = await getAuthUser();
  const role = user?.app_metadata?.role;
  const isAdmin = role === "admin";
  if (problem.accessType === "PREMIUM" && !isAdmin && !(user && (await hasLifetimeAccess(user.id)))) {
    return <BuySubscriptionPrompt backHref="/sql" backLabel="Back to SQL" />;
  }

  // Strip the reference solution and hidden grading datasets before sending
  // to the client — students must not see either. Submission grading now
  // re-fetches this data server-side (see submitSqlAction), so the client
  // never needs it.
  return <SqlSolveView problem={{ ...problem, solutionQuery: null, hiddenDatasets: [] }} backHref="/sql" backLabel="Back to SQL" />;
}
