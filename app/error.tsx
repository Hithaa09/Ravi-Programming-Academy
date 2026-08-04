"use client";

export default function GlobalPageError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="max-w-container-max mx-auto flex flex-col items-center justify-center min-h-screen text-center space-y-4 px-4">
      <span className="material-symbols-outlined text-[48px] text-on-surface-variant">error</span>
      <h1 className="font-headline-xl text-headline-xl text-on-surface">Something went wrong</h1>
      <p className="font-body-md text-body-md text-on-surface-variant max-w-sm">
        This is usually a temporary issue. Try again, or head back and pick up where you left off.
      </p>
      <button
        type="button"
        onClick={reset}
        className="mt-2 px-6 py-2.5 bg-primary text-on-primary rounded-xl font-label-md text-label-md hover:opacity-90 transition-opacity"
      >
        Try again
      </button>
      {error.digest && (
        <p className="font-label-sm text-label-sm text-on-surface-variant/60">Error ID: {error.digest}</p>
      )}
    </div>
  );
}
