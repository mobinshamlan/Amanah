// Test mode ("sandbox") for the public MVP. When AMANAH_SANDBOX=1, visitors
// try the real flow end to end: sample found reports give them a possible
// match, they can play the staff role on their own claim (approve or reject),
// and everything they save is deleted after SANDBOX_RETENTION_DAYS. With the
// setting off, only staff decide, as in the real product.
//
// Kept free of imports so server modules, pages and the proxy can use it.

export const SANDBOX_RETENTION_DAYS = 3;

/** True when the deployment runs as a public test version. */
export function isSandboxMode(env: { AMANAH_SANDBOX?: string; NODE_ENV?: string } = process.env) {
  return env.AMANAH_SANDBOX === "1";
}
