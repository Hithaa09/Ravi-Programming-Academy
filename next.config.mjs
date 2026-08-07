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
};

export default nextConfig;
