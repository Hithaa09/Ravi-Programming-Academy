"use client";

// Only triggers if the root layout itself throws — a much rarer case than
// app/error.tsx (which covers every normal page). Must render its own
// <html>/<body> since it replaces the root layout entirely, so this stays
// deliberately plain/inline rather than depending on the app's Tailwind
// classes resolving correctly.
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body>
        <div
          style={{
            minHeight: "100vh",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            textAlign: "center",
            gap: "1rem",
            padding: "1rem",
            fontFamily: "system-ui, sans-serif",
          }}
        >
          <h1 style={{ fontSize: "1.5rem", fontWeight: 600 }}>Something went wrong</h1>
          <p style={{ color: "#666", maxWidth: "24rem" }}>
            This is usually a temporary issue. Please try again.
          </p>
          <button
            type="button"
            onClick={reset}
            style={{
              marginTop: "0.5rem",
              padding: "0.625rem 1.5rem",
              borderRadius: "0.75rem",
              border: "none",
              background: "#1a1a1a",
              color: "#fff",
              cursor: "pointer",
            }}
          >
            Try again
          </button>
          {error.digest && (
            <p style={{ fontSize: "0.75rem", color: "#999" }}>Error ID: {error.digest}</p>
          )}
        </div>
      </body>
    </html>
  );
}
