/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // Next.js 14: prevent webpack from bundling server-only packages.
    // These use Node.js native APIs or contain inner webpack bundles
    // that conflict with the outer bundler when processed directly.
    serverComponentsExternalPackages: ["pdf-parse", "mammoth", "pdfjs-dist", "better-sqlite3"],
  },
};

export default nextConfig;
