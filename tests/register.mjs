// Lets Node's built-in test runner load the app's TypeScript sources:
// resolves the "@/..." path alias and extensionless relative imports.
import { existsSync } from "node:fs";
import { registerHooks } from "node:module";
import { fileURLToPath } from "node:url";

const srcRoot = new URL("../src/", import.meta.url);
const EXTENSIONS = [".ts", ".tsx", "/index.ts"];

function withExtension(url) {
  if (/\.[cm]?[jt]sx?$/.test(url.pathname) || existsSync(fileURLToPath(url))) {
    return url;
  }
  for (const extension of EXTENSIONS) {
    const candidate = new URL(url.href + extension);
    if (existsSync(fileURLToPath(candidate))) {
      return candidate;
    }
  }
  return url;
}

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier.startsWith("@/")) {
      return nextResolve(withExtension(new URL(specifier.slice(2), srcRoot)).href, context);
    }
    // Only the app's own TypeScript files use extensionless relative imports.
    if (
      (specifier.startsWith("./") || specifier.startsWith("../")) &&
      context.parentURL?.startsWith("file:") &&
      /\.tsx?$/.test(context.parentURL) &&
      !context.parentURL.includes("/node_modules/")
    ) {
      return nextResolve(withExtension(new URL(specifier, context.parentURL)).href, context);
    }
    return nextResolve(specifier, context);
  },
});
