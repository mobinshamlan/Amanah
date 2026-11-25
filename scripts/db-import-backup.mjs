// One-time import of a Supabase table export (one JSON array per table, named
// <table>.json) into the database in DATABASE_URL_UNPOOLED (or DATABASE_URL).
// Ids, timestamps, arrays and nulls are kept as they are: each row goes through
// jsonb_populate_recordset, so Postgres converts values to the column types.
//
//   npm run db:import -- ~/backups/amanah/2026-11-25
//
// Runs in one transaction and stops if any target table already has rows.
// Ends by comparing row counts with the files. Prints counts only, never data.
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { Pool } from "@neondatabase/serverless";

// Parents before children, so foreign keys hold at every step.
const TABLES = [
  "reports",
  "report_submissions",
  "report_matches",
  "report_pair_checks",
  "report_candidate_reviews",
  "ownership_verifications",
  "ownership_answers",
  "ownership_assessments",
  "ownership_followups",
  "ownership_followup_answers",
  "ownership_decisions",
  "matching_runs",
  "usage_counters",
];

const source = process.argv[2];
const url = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;
if (!source || !url) {
  console.error("Usage: DATABASE_URL=... node scripts/db-import-backup.mjs <backup folder>");
  process.exit(1);
}

/** Each decision row after the one it names, so the self-reference holds. */
function chainOrder(rows) {
  const placed = new Set();
  const ordered = [];
  let pending = [...rows];
  while (pending.length > 0) {
    const ready = pending.filter((row) => !row.previous_decision_id || placed.has(row.previous_decision_id));
    if (ready.length === 0) {
      throw new Error("ownership_decisions: broken previous_decision_id chain");
    }
    ready.forEach((row) => placed.add(row.id));
    ordered.push(...ready);
    pending = pending.filter((row) => !placed.has(row.id));
  }
  return ordered;
}

const data = {};
for (const table of TABLES) {
  const rows = JSON.parse(await readFile(join(source, `${table}.json`), "utf8"));
  if (!Array.isArray(rows)) {
    throw new Error(`${table}.json is not an array`);
  }
  data[table] = table === "ownership_decisions" ? chainOrder(rows) : rows;
}

const pool = new Pool({ connectionString: url });
const client = await pool.connect();
let failed = false;

try {
  await client.query("begin");
  for (const table of TABLES) {
    const { rows } = await client.query(`select count(*)::int as n from public.${table}`);
    if (rows[0].n > 0) {
      throw new Error(`${table} already has ${rows[0].n} rows; import only into an empty database`);
    }
  }
  for (const table of TABLES) {
    if (data[table].length === 0) {
      continue;
    }
    // Table names come from the fixed list above, never from the files.
    await client.query(
      `insert into public.${table} select * from jsonb_populate_recordset(null::public.${table}, $1::jsonb)`,
      [JSON.stringify(data[table])],
    );
  }
  await client.query("commit");
} catch (error) {
  failed = true;
  await client.query("rollback");
  console.error("Import failed, nothing was saved:", error.code ?? "", error.message);
}

if (!failed) {
  console.log("table                        backup  database");
  for (const table of TABLES) {
    const { rows } = await client.query(`select count(*)::int as n from public.${table}`);
    const ok = rows[0].n === data[table].length;
    failed ||= !ok;
    console.log(`${table.padEnd(28)} ${String(data[table].length).padStart(6)}  ${String(rows[0].n).padStart(8)}${ok ? "" : "  MISMATCH"}`);
  }
}

client.release();
await pool.end();
process.exitCode = failed ? 1 : 0;
