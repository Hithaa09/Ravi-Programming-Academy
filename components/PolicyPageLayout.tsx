import Link from "next/link";

interface PolicyPageLayoutProps {
  title: string;
  lastUpdated: string;
  children: React.ReactNode;
}

// Shared chrome for /privacy and /terms — both are public, unauthenticated
// pages (see middleware.ts's isStudentRoute exclusions), so this is a plain
// Server Component with no client interactivity.
export function PolicyPageLayout({ title, lastUpdated, children }: PolicyPageLayoutProps) {
  return (
    <div className="min-h-screen bg-surface-bright">
      <header className="bg-primary-container">
        <div className="max-w-3xl mx-auto px-6 py-5 flex items-center justify-between">
          <Link href="/login" className="flex items-center gap-2 min-w-0">
            <span className="font-headline-lg text-headline-lg text-white tracking-tight shrink-0">{"{R.}"}</span>
            <span className="font-body-md text-body-md text-surface-container-lowest/80 truncate hidden sm:inline">Ravi Programming Academy</span>
          </Link>
          <Link href="/login" className="font-label-md text-label-md text-white/90 hover:text-white transition-colors shrink-0">
            Back to Login
          </Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-10 md:py-14">
        <h1 className="font-headline-xl text-headline-xl text-on-surface">{title}</h1>
        <p className="font-label-sm text-label-sm text-on-surface-variant mt-2 mb-8 md:mb-10">Last updated: {lastUpdated}</p>

        <div className="space-y-8 md:space-y-10">{children}</div>

        <div className="mt-12 pt-8 border-t border-outline-variant/20 flex flex-col sm:flex-row gap-3 sm:gap-6 items-start sm:items-center justify-between">
          <p className="font-label-sm text-label-sm text-on-surface-variant">
            © {new Date().getFullYear()} Ravi Programming Academy. All rights reserved.
          </p>
          <div className="flex gap-4">
            <Link href="/privacy" className="font-label-sm text-label-sm text-secondary hover:underline">Privacy Policy</Link>
            <Link href="/terms" className="font-label-sm text-label-sm text-secondary hover:underline">Terms of Service</Link>
          </div>
        </div>
      </main>
    </div>
  );
}

export function PolicySection({ heading, children }: { heading: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="font-headline-md text-headline-md text-on-surface mb-3">{heading}</h2>
      <div className="font-body-md text-body-md text-on-surface-variant leading-relaxed space-y-3">{children}</div>
    </section>
  );
}
