import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { timestampText, TIMESTAMPTZ_OID, type Sql } from "@/utils/db/sql";

// An in-process Postgres (PGlite, Postgres compiled to WebAssembly) with the
// real schema from db/migrations. Development fixture mode and the tests use it
// instead of a fake client, so they run the same SQL, constraints and
// consume_usage function as production. It never opens a network connection.
//
// Queries run as amanah_app, the restricted role the app uses in production
// (db/migrations/0002_app_role.sql), so a query that needs a privilege the role
// lacks fails here too. Seeding runs as the owner through asOwner.

export type LocalDb = Sql & {
  close(): Promise<void>;
  /** Runs `run` as the database owner, then switches back to amanah_app. */
  asOwner<T>(run: () => Promise<T>): Promise<T>;
};

export type Row = Record<string, unknown>;

function migrationFiles() {
  const dir = join(process.cwd(), "db", "migrations");
  return readdirSync(dir)
    .filter((name) => name.endsWith(".sql"))
    .sort()
    .map((name) => readFileSync(join(dir, name), "utf8"));
}

/** A fresh, empty database with every migration applied. */
export async function createLocalDb(): Promise<LocalDb> {
  const { PGlite } = await import("@electric-sql/pglite");
  const db = new PGlite({ parsers: { [TIMESTAMPTZ_OID]: timestampText } });
  await db.exec("set time zone 'UTC'");
  for (const sql of migrationFiles()) {
    await db.exec(sql);
  }
  await db.exec("set role amanah_app");
  return {
    async query<T>(text: string, params: unknown[] = []) {
      return (await db.query<T>(text, params)).rows;
    },
    async asOwner(run) {
      await db.exec("reset role");
      try {
        return await run();
      } finally {
        await db.exec("set role amanah_app");
      }
    },
    close: () => db.close(),
  };
}

const IDENTIFIER = /^[a-z_]+$/;

/**
 * Inserts rows as they are, for seeding. Columns a row leaves out get their
 * defaults. Table and column names come from the seed code and must be plain
 * identifiers; values go in as one JSON parameter.
 */
export async function insertRows(sql: Sql, table: string, rows: Row[]) {
  if (!IDENTIFIER.test(table)) {
    throw new Error(`Bad table name ${table}`);
  }
  const groups = new Map<string, Row[]>();
  for (const row of rows) {
    const key = Object.keys(row).sort().join(",");
    groups.set(key, [...(groups.get(key) ?? []), row]);
  }
  for (const [key, group] of groups) {
    const columns = key.split(",");
    if (!columns.every((column) => IDENTIFIER.test(column))) {
      throw new Error(`Bad column name in ${table}`);
    }
    const list = columns.join(", ");
    await sql.query(
      `insert into public.${table} (${list})
       select ${list} from jsonb_populate_recordset(null::public.${table}, $1::jsonb)`,
      [JSON.stringify(group)],
    );
  }
}

/** Every table, parents first, so foreign keys hold while seeding. */
export const TABLE_ORDER = [
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
] as const;

export type TableName = (typeof TABLE_ORDER)[number];

export type SeedData = Partial<Record<TableName, Row[]>>;

/** Inserts seed rows table by table in foreign-key order, as the owner. */
export async function seedRows(db: LocalDb, data: SeedData) {
  await db.asOwner(async () => {
    for (const table of TABLE_ORDER) {
      const rows = data[table] ?? [];
      if (rows.length > 0) {
        await insertRows(db, table, rows);
      }
    }
  });
}
