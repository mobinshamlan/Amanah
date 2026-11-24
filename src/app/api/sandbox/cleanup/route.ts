import { timingSafeEqual } from "node:crypto";
import { isSandboxMode } from "@/utils/sandbox";
import { cleanupSandbox } from "@/utils/sandbox/cleanup";
import { createAdminClient } from "@/utils/supabase/admin";

// Daily test-mode cleanup, called by Vercel Cron (vercel.json) with
// "Authorization: Bearer $CRON_SECRET": GET deletes visitor reports past the
// retention window. A POST with `?purge=all` and the same secret deletes every
// non-sample report regardless of age, for a deliberate clean; the cron only
// sends GET, so it can never purge. Responds with counts only. Outside test
// mode the route does not exist.

function authorized(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return false;
  }
  const given = Buffer.from(request.headers.get("authorization") ?? "");
  const expected = Buffer.from(`Bearer ${secret}`);
  return given.length === expected.length && timingSafeEqual(given, expected);
}

async function run(request: Request, mode: "expired" | "all") {
  if (!isSandboxMode()) {
    return new Response("Not Found", { status: 404 });
  }
  if (!authorized(request)) {
    return Response.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  try {
    const summary = await cleanupSandbox(createAdminClient(), new Date(), mode);
    console.info(
      `Test mode cleanup (${summary.mode}): deleted=${summary.deletedReports} samples_added=${summary.samplesAdded}`,
    );
    return Response.json({ ok: true, ...summary });
  } catch (error) {
    console.error("Test mode cleanup failed:", error instanceof Error ? error.message : "unknown");
    return Response.json({ ok: false, error: "cleanup_failed" }, { status: 500 });
  }
}

/** Daily cleanup: only reports past the retention window. */
export async function GET(request: Request) {
  return run(request, "expired");
}

/** Deliberate full purge of visitor reports: POST /api/sandbox/cleanup?purge=all. */
export async function POST(request: Request) {
  if (new URL(request.url).searchParams.get("purge") !== "all") {
    return Response.json({ ok: false, error: "purge=all required" }, { status: 400 });
  }
  return run(request, "all");
}
