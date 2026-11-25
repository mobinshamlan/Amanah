import { createLocalDb, seedRows, type LocalDb } from "@/utils/db/local";
import type { Sql } from "@/utils/db/sql";
import { seedFixtureDb } from "@/utils/fixtures/seed";

// One in-memory fixture database per dev server process: a local Postgres
// (PGlite) with the real schema, seeded with fictional rows. It lives on
// globalThis so Server Components, Server Actions, and route handlers share it,
// and it survives module reloads while you edit code. Restarting the server
// reseeds it.

const GLOBAL_KEY = "__amanahFixtureDb";

type FixtureGlobal = typeof globalThis & { [GLOBAL_KEY]?: Promise<LocalDb> };

async function seededDb() {
  const db = await createLocalDb();
  await seedRows(db, seedFixtureDb().tables);
  console.info("Fixtures: seeded fictional in-memory data. No database or Gemini requests leave this machine.");
  return db;
}

function fixtureDb(): Promise<LocalDb> {
  const holder = globalThis as FixtureGlobal;
  holder[GLOBAL_KEY] ??= seededDb().catch((error: unknown) => {
    holder[GLOBAL_KEY] = undefined;
    throw error;
  });
  return holder[GLOBAL_KEY];
}

/** The database used in fixture mode. */
export function fixtureSql(): Sql {
  return {
    async query<T>(text: string, params?: unknown[]) {
      return (await fixtureDb()).query<T>(text, params);
    },
  };
}
