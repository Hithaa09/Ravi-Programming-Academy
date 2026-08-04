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
    // it to be included. Untested on real Vercel infrastructure as of this
    // writing; verify a real SQL Run/Submit actually works after deploying,
    // not just that the build succeeds. Still experimental in Next.js 14.x
    // (this key lives under `experimental`, unlike Next 15+ where it's stable
    // and top-level) — worth re-checking after any future Next.js upgrade.
    outputFileTracingIncludes: {
      "/**": ["./lib/sql/sql-worker.cjs"],
    },
  },
};

export default nextConfig;
