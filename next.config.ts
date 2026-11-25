import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Don't write AI-agent instruction files (AGENTS.md) into the repo.
  agentRules: false,
  // Lets parallel local previews keep separate build folders (.next-<name>).
  distDir: process.env.NEXT_DIST_DIR || ".next",
  // PGlite (the local Postgres for fixture mode) loads its WebAssembly from
  // node_modules at run time, so it is not bundled, and it is left out of
  // deployed functions: builds and production never use fixture mode.
  serverExternalPackages: ["@electric-sql/pglite"],
  outputFileTracingExcludes: {
    "/*": ["./node_modules/@electric-sql/pglite/**/*"],
  },
  // Server Function logs include call arguments, which would print report text.
  logging: {
    serverFunctions: false,
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
