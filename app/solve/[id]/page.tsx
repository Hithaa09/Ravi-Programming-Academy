import Link from "next/link";
import { getProblemById } from "@/lib/actions/programming-problems";
import { ProblemSolveView } from "@/components/ProblemSolveView";
import { BuySubscriptionPrompt } from "@/components/BuySubscriptionPrompt";
import { getAuthUser } from "@/lib/auth/get-user";
import { hasLifetimeAccess } from "@/lib/payments/access";
import { getWrapperAdapter, FUNCTION_ONLY_LANGUAGES } from "@/lib/wrappers";

export default async function SolveProblemPage({
  params,
}: {
  params: { id: string };
}) {
  const id = Number(params.id);

  if (isNaN(id)) {
    return (
      <div className="p-10 text-center">
        <p className="font-body-md text-body-md text-on-surface-variant">Invalid problem ID.</p>
        <Link href="/problems" className="text-secondary font-medium">Back to Problems</Link>
      </div>
    );
  }

  const problem = await getProblemById(id);

  if (!problem || problem.status !== "Published") {
    return (
      <div className="p-10 text-center">
        <p className="font-body-md text-body-md text-on-surface-variant">Problem not found.</p>
        <Link href="/problems" className="text-secondary font-medium">Back to Problems</Link>
      </div>
    );
  }

  if (problem.availability === "Locked") {
    return (
      <div className="p-10 text-center">
        <span className="material-symbols-outlined text-[48px] text-on-surface-variant/40 block mb-3">lock</span>
        <p className="font-body-md text-body-md text-on-surface-variant">This problem is currently locked.</p>
        <Link href="/problems" className="text-secondary font-medium">Back to Problems</Link>
      </div>
    );
  }

  // Premium gate — enforced here (not just visually on the list) so a direct
  // link can't bypass it. Admins are exempt, same as the Locked check above;
  // this is also independently re-enforced in run-code.ts/submit-code.ts,
  // since those actions are callable on their own regardless of this page.
  const user = await getAuthUser();
  const role = user?.app_metadata?.role;
  const isAdmin = role === "admin";
  if (problem.accessType === "PREMIUM" && !isAdmin && !(user && (await hasLifetimeAccess(user.id)))) {
    return <BuySubscriptionPrompt backHref="/problems" backLabel="Back to Problems" />;
  }

  // Strip hidden test cases and official solutions before sending to the
  // client — ProblemSolveView never renders either, and leaving them in
  // would ship the answer key in the page's RSC payload. Same treatment for
  // Function Only's functionHiddenTestCases.
  const clientSafeProblem = { ...problem, hiddenTestCases: [], officialSolutions: {}, functionHiddenTestCases: [] };

  // Function Only starter code is generated server-side (from the
  // signature) rather than stored — computed here so the client never needs
  // the wrapper-generation module itself, just the resulting stub text.
  const functionStub: Record<string, string> = {};
  if (problem.executionStyle === "FUNCTION_ONLY" && problem.functionSignature) {
    for (const langId of FUNCTION_ONLY_LANGUAGES) {
      const adapter = getWrapperAdapter(langId);
      if (adapter) functionStub[langId] = adapter.renderFunctionStub(problem.functionSignature);
    }
  }

  return (
    <ProblemSolveView
      problem={clientSafeProblem}
      functionStub={functionStub}
      backHref="/problems"
      backLabel="Back to Problems"
    />
  );
}
