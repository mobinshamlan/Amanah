import { neon, types } from "@neondatabase/serverless";
import { isFixtureMode } from "@/utils/fixtures/mode";
import { fixtureSql } from "@/utils/fixtures/store";
import { timestampText, TIMESTAMPTZ_OID, type Sql } from "@/utils/db/sql";

// Server-only. The database connection: Neon Postgres in DATABASE_URL (the
// pooled URL that the Vercel Neon integration sets). Queries go over HTTPS, one
// request each, so serverless functions hold no open connections.

export function isLocalAdminEnabled() {
  return process.env.NODE_ENV === "development";
}

const typeParsers = {
  getTypeParser(id: number, format?: "text" | "binary") {
    if (id === TIMESTAMPTZ_OID) {
      return timestampText;
    }
    return types.getTypeParser(id, format);
  },
};

let cached: { url: string; sql: Sql } | null = null;

function neonSql(url: string): Sql {
  if (cached?.url === url) {
    return cached.sql;
  }
  const run = neon(url, { types: typeParsers });
  const sql: Sql = {
    async query<T>(text: string, params: unknown[] = []) {
      return (await run.query(text, params)) as T[];
    },
  };
  cached = { url, sql };
  return sql;
}

/** The database. Throws "missing-db-config" when DATABASE_URL is not set. */
export function createDb(): Sql {
  // Development fixture mode: fictional data in a local in-memory Postgres.
  if (isFixtureMode()) {
    return fixtureSql();
  }
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("missing-db-config");
  }
  return neonSql(url);
}

/** The database, or null when it is not configured. */
export function tryCreateDb(): Sql | null {
  try {
    return createDb();
  } catch {
    return null;
  }
}
