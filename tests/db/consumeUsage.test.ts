import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import { createLocalDb, type LocalDb } from "@/utils/db/local";
import { consumeUsage } from "@/utils/db/queries";
import { submitSlots } from "@/utils/limits/usageBuckets";

// The real consume_usage function from db/migrations, in a local Postgres.

describe("consume_usage", () => {
  let db: LocalDb;
  before(async () => {
    db = await createLocalDb();
  });
  after(() => db.close());

  async function count(bucket: string) {
    const [row] = await db.query<{ count: number }>(
      "select count from public.usage_counters where bucket = $1",
      [bucket],
    );
    return row?.count ?? 0;
  }

  it("takes one slot from every bucket until a limit is reached", async () => {
    const buckets = ["submit:ip:aa:2026-11-01T13", "submit:ip:aa:2026-11-01"];
    for (let i = 0; i < 2; i += 1) {
      assert.equal((await consumeUsage(db, buckets, [2, 5], ["submit_hour", "submit_day"])).data, "ok");
    }
    assert.equal(
      (await consumeUsage(db, buckets, [2, 5], ["submit_hour", "submit_day"])).data,
      "submit_hour",
    );
    assert.equal(await count(buckets[0]), 2);
    assert.equal(await count(buckets[1]), 2);
  });

  it("takes none when a later bucket is full (atomic)", async () => {
    const buckets = ["submit:ip:bb:2026-11-01T13", "submit:ip:bb:2026-11-01"];
    assert.equal((await consumeUsage(db, [buckets[1]], [1], ["submit_day"])).data, "ok");
    assert.equal(
      (await consumeUsage(db, buckets, [8, 1], ["submit_hour", "submit_day"])).data,
      "submit_day",
    );
    // The hour bucket was incremented first, then rolled back with the block.
    assert.equal(await count(buckets[0]), 0);
    assert.equal(await count(buckets[1]), 1);
  });

  it("is unavailable for malformed input instead of counting it", async () => {
    assert.equal((await consumeUsage(db, [], [], [])).data, "unavailable");
    assert.equal((await consumeUsage(db, ["bad bucket"], [1], ["submit_day"])).data, "unavailable");
    assert.equal((await consumeUsage(db, ["submit:ip:cc:1"], [1], ["other"])).data, "unavailable");
  });

  it("accepts the app's own buckets", async () => {
    const slots = submitSlots("dd".repeat(16), new Date("2026-11-01T13:05:00Z"));
    const result = await consumeUsage(
      db,
      slots.map((slot) => slot.bucket),
      slots.map((slot) => slot.limit),
      slots.map((slot) => slot.label),
    );
    assert.equal(result.data, "ok");
  });
});
