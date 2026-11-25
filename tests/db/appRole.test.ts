import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import { createLocalDb, type LocalDb } from "@/utils/db/local";
import { attempt } from "@/utils/db/sql";
import {
  claimMatchingLease,
  deleteReportsExcept,
  insertReport,
  insertSubmission,
  releaseMatchingLease,
} from "@/utils/db/queries";

// The privileges of amanah_app from db/migrations/0002_app_role.sql: what the
// queries need works, everything else is refused with 42501.

const LOST = "00000000-0000-4000-8000-00000000c001";
const HASH = "ab".repeat(32);

describe("amanah_app role", () => {
  let db: LocalDb;
  before(async () => {
    db = await createLocalDb();
  });
  after(() => db.close());

  async function code(text: string) {
    return (await attempt(() => db.query(text))).error?.code ?? "allowed";
  }

  it("is the role the app's queries run as, and it is not the owner", async () => {
    const [row] = await db.query<{ role: string; owner: string; definer: boolean }>(
      `select current_user as role, pg_get_userbyid(p.proowner) as owner, p.prosecdef as definer
       from pg_proc p where p.proname = 'consume_usage'`,
    );
    assert.deepEqual(row, { role: "amanah_app", owner: "amanah_usage_owner", definer: true });
  });

  it("can add a report, move the matching lease and run test-mode cleanup", async () => {
    const report = { id: LOST, report_type: "lost" as const, item_name: "Umbrella", description: "Blue", location: "Gate" };
    assert.equal((await insertReport(db, report)).error, null);
    assert.equal((await insertSubmission(db, { report_id: LOST, token_hash: HASH })).error, null);
    const lease = await claimMatchingLease(db, LOST, "2030-01-01T00:00:00Z", "2026-01-01T00:00:00Z");
    assert.equal(lease.data?.length, 1);
    assert.equal((await releaseMatchingLease(db, LOST)).error, null);
    assert.equal((await deleteReportsExcept(db, [], null)).data, 1);
  });

  it("cannot change reports, credentials or append-only logs", async () => {
    assert.equal(await code("update public.reports set item_name = 'x'"), "42501");
    assert.equal(await code("update public.report_submissions set token_hash = 'x'"), "42501");
    assert.equal(await code("update public.ownership_decisions set decision = 'approved'"), "42501");
    assert.equal(await code("delete from public.report_matches"), "42501");
    assert.equal(await code("delete from public.ownership_decisions"), "42501");
    assert.equal(await code("truncate public.reports"), "42501");
  });

  it("cannot touch usage_counters except through consume_usage", async () => {
    assert.equal(await code("select * from public.usage_counters"), "42501");
    assert.equal(await code("insert into public.usage_counters values ('submit:ip:x:1', 0)"), "42501");
    assert.equal(await code("delete from public.usage_counters"), "42501");
  });

  it("cannot change the schema or read the migration log", async () => {
    assert.equal(await code("create table public.extra (id int)"), "42501");
    assert.equal(await code("alter table public.reports add column extra text"), "42501");
    assert.equal(await code("drop function public.consume_usage(text[], integer[], text[])"), "42501");
  });
});

describe("appDatabaseUrl", () => {
  it("uses AMANAH_DATABASE_URL, and falls back to the owner URL only locally", async () => {
    const { appDatabaseUrl } = await import("@/utils/db/client");
    const app = "postgres://app", owner = "postgres://owner";
    assert.equal(appDatabaseUrl({ NODE_ENV: "production", AMANAH_DATABASE_URL: app, DATABASE_URL: owner }), app);
    assert.equal(appDatabaseUrl({ NODE_ENV: "production", DATABASE_URL: owner }), undefined);
    assert.equal(appDatabaseUrl({ NODE_ENV: "development", VERCEL: "1", DATABASE_URL: owner }), undefined);
    assert.equal(appDatabaseUrl({ NODE_ENV: "development", DATABASE_URL: owner }), owner);
    assert.equal(appDatabaseUrl({ NODE_ENV: "test", DATABASE_URL: owner }), owner);
  });
});
