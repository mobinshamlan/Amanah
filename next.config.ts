import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
