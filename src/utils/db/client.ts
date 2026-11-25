import { neon, types } from "@neondatabase/serverless";
import { isFixtureMode } from "@/utils/fixtures/mode";
import { fixtureSql } from "@/utils/fixtures/store";
import { timestampText, TIMESTAMPTZ_OID, type Sql } from "@/utils/db/sql";

// Server-only. The database connection: Neon Postgres in AMANAH_DATABASE_URL,
// the pooled URL for the restricted amanah_app role (db/migrations/0002). The
// owner URLs the Vercel Neon integration sets (DATABASE_URL, *_UNPOOLED) are for
// migrations and imports only. Queries go over HTTPS, one request each, so
// serverless functions hold no open connections.

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

/**
 * The app's connection string. Deployed builds use only AMANAH_DATABASE_URL, so
 * they never fall back to the owner. Local development and tests may use
 * DATABASE_URL when AMANAH_DATABASE_URL is not set.
 */
export function appDatabaseUrl(env: Record<string, string | undefined> = process.env) {
  if (env.AMANAH_DATABASE_URL) {
    return env.AMANAH_DATABASE_URL;
  }
  const local = env.NODE_ENV === "development" || env.NODE_ENV === "test";
  return local && !env.VERCEL ? env.DATABASE_URL : undefined;
}

/** The database. Throws "missing-db-config" when no connection string is set. */
export function createDb(): Sql {
  // Development fixture mode: fictional data in a local in-memory Postgres.
  if (isFixtureMode()) {
    return fixtureSql();
  }
  const url = appDatabaseUrl();
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
