import Link from "next/link";

interface BuySubscriptionPromptProps {
  backHref: string;
  backLabel: string;
}

// Shown in place of the solve view when a non-purchasing student tries to
// open a Premium problem directly. Matches the existing "not found"/"locked"
// card style already used on both solve pages.
export function BuySubscriptionPrompt({ backHref, backLabel }: BuySubscriptionPromptProps) {
  return (
    <div className="p-10 text-center">
      <span className="material-symbols-outlined text-[48px] text-tertiary-fixed-dim/70 block mb-3">workspace_premium</span>
      <p className="font-headline-md text-headline-md text-on-surface mb-2">This is a Premium problem</p>
      <p className="font-body-md text-body-md text-on-surface-variant mb-6">
        Purchase lifetime access to unlock every Premium problem on the platform.
      </p>
      <Link
        href="/buy-subscription"
        className="inline-block bg-primary-container text-white font-label-md text-label-md px-5 py-2.5 rounded-lg hover:bg-primary-fixed-variant transition-colors shadow-sm mb-4"
      >
        Buy Subscription
      </Link>
      <div>
        <Link href={backHref} className="text-secondary font-medium">{backLabel}</Link>
      </div>
    </div>
  );
}
