import Link from "next/link";

export function MobileSolveNotice({ backHref, backLabel }: { backHref: string; backLabel: string }) {
  return (
    <div className="md:hidden h-screen flex flex-col items-center justify-center text-center px-8 bg-background">
      <span className="material-symbols-outlined text-[48px] text-on-surface-variant mb-4">laptop_mac</span>
      <h1 className="font-headline-md text-headline-md text-on-surface mb-2">Best experienced on a laptop</h1>
      <p className="font-body-md text-body-md text-on-surface-variant max-w-xs">
        The code editor needs a larger screen. Please attempt this problem on a laptop or desktop.
      </p>
      <Link href={backHref} className="mt-6 font-label-md text-label-md text-secondary font-medium">
        {backLabel}
      </Link>
    </div>
  );
}
