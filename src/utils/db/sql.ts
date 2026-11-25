// The one interface every query in src/utils/db/queries.ts runs through.
// Production uses Neon's HTTP driver; development fixture mode and the tests use
// an in-process Postgres (PGlite) with the same schema. Every value goes in as a
// $n parameter. Table and column names are fixed strings in the code, never
// built from input.

export type Sql = {
  query<T = Record<string, unknown>>(text: string, params?: unknown[]): Promise<T[]>;
};

/** A failed query. `code` is the Postgres SQLSTATE, for example 23505 or 42P01. */
export type DbError = { code?: string; message: string };

/** Like the old Supabase results: data, or an error with its code. Queries never throw. */
export type DbResult<T> = { data: T; error: null } | { data: null; error: DbError };

function toDbError(error: unknown): DbError {
  const code =
    error && typeof error === "object" && "code" in error && typeof error.code === "string"
      ? error.code
      : undefined;
  // The message can hold values from the query, so only the code is kept.
  return { code, message: code ? `database error ${code}` : "database error" };
}

export async function attempt<T>(run: () => Promise<T>): Promise<DbResult<T>> {
  try {
    return { data: await run(), error: null };
  } catch (error) {
    return { data: null, error: toDbError(error) };
  }
}

/** The table does not exist yet: its migration has not been applied. */
export function isMissingTableCode(code: string | undefined) {
  return code === "42P01";
}

export const UNIQUE_VIOLATION = "23505";

/**
 * timestamptz as text, in the same ISO form Postgres uses inside JSON
 * ("2026-11-24T16:48:11.897321+00:00"), so a top-level column and an embedded
 * one compare and sort the same way. This is also the form the app received
 * before, from Supabase.
 */
export function timestampText(raw: string) {
  return raw.replace(" ", "T").replace(/([+-]\d{2})$/, "$1:00");
}

export const TIMESTAMPTZ_OID = 1184;
