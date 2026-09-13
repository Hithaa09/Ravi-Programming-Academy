/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // Next.js 14: prevent webpack from bundling server-only packages.
    // These use Node.js native APIs or contain inner webpack bundles
    // that conflict with the outer bundler when processed directly.
    serverComponentsExternalPackages: ["pdf-parse", "mammoth", "pdfjs-dist", "better-sqlite3"],
    // lib/sql/run-isolated.ts forks lib/sql/sql-worker.cjs as a real child
    // process (required for reliably killing a runaway SQL query — see the
    // comment there). The fork target is a runtime-constructed path
    // (path.join(process.cwd(), ...)), not a static import, so a serverless
    // bundler (Vercel) can't discover it by tracing imports and would
    // otherwise silently leave it out of the deployed function — this forces
    // it to be included. Verified on real Vercel infrastructure: the worker
    // script alone was not enough — better-sqlite3 (required only inside
    // sql-worker.cjs, via require("better-sqlite3")) was never traced either,
    // since Next's tracer only follows requires from files already in its
    // normal build graph, and sql-worker.cjs never is (only reachable via
    // fork() at runtime). Deploy failed with "Cannot find module
    // 'better-sqlite3'" until its package (native .node binary included) and
    // its own runtime dependency "bindings" were force-included too. Still
    // experimental in Next.js 14.x (this key lives under `experimental`,
    // unlike Next 15+ where it's stable and top-level) — worth re-checking
    // after any future Next.js upgrade.
    outputFileTracingIncludes: {
      "/**": [
        "./lib/sql/sql-worker.cjs",
        "./node_modules/better-sqlite3/**/*",
        "./node_modules/bindings/**/*",
        "./node_modules/file-uri-to-path/**/*",
      ],
    },
  },
  // Deliberately NOT including Content-Security-Policy here — this app
  // loads Monaco (needs web workers/blob: URLs), Razorpay's external
  // checkout script, and calls Supabase directly from the browser. A wrong
  // CSP could silently break the code editor or checkout for real students,
  // and there's no way to verify one live from this environment before
  // shipping it — safer to add the headers below now (all low-risk,
  // standard, and verified not to affect any of those integrations) and
  // treat a real CSP as a separate, carefully-tested piece of future work.
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          // Stops the browser from guessing a different content type than
          // what the server actually declared — a classic MIME-sniffing
          // vector for serving up an "innocent" upload as executable script.
          { key: "X-Content-Type-Options", value: "nosniff" },
          // No legitimate reason for this app to ever be framed by another
          // site — SAMEORIGIN still allows the app to frame its own pages
          // if that's ever needed, just blocks a third-party clickjacking
          // wrapper.
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          // Sends the full referrer only on same-origin navigations; for a
          // cross-origin link, only the origin (not the full path/query) is
          // sent — balances analytics usefulness against leaking, say, a
          // password-reset URL's query string to an external site.
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          // This app never uses the camera, microphone, or geolocation —
          // explicitly denying them means an embedded/compromised
          // third-party script has no way to request them either.
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          // Vercel already serves everything over HTTPS by default; this
          // header tells browsers to enforce that themselves for a year,
          // closing the narrow window where a first HTTP request could be
          // intercepted before any redirect happens.
          { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
        ],
      },
    ];
  },
};

export default nextConfig;
