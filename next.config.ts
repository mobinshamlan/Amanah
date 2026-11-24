import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Don't write AI-agent instruction files (AGENTS.md) into the repo.
  agentRules: false,
  // Lets parallel local previews keep separate build folders (.next-<name>).
  distDir: process.env.NEXT_DIST_DIR || ".next",
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
