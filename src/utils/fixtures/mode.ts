// Development-only local fixture mode: an in-memory database and a fake Gemini,
// so the whole app can be used locally with fictional data. It never reads or
// writes Supabase and never calls Gemini. See docs/local-fixtures.md.
//
// Kept free of imports so the proxy and any server module can use it.

/** True only in `next dev` with AMANAH_FIXTURES=1. Never true in a build or in production. */
export function isFixtureMode(
  env: { NODE_ENV?: string; AMANAH_FIXTURES?: string } = process.env,
) {
  return env.NODE_ENV === "development" && env.AMANAH_FIXTURES === "1";
}

/** Model name recorded on fixture-made rows. Contains no "demo" so Monitoring counts them. */
export const FIXTURE_MODEL = "gemini-3.5-flash-lite";
