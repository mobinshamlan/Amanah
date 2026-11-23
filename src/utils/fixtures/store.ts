import { createFakeSupabase, type FixtureDb } from "@/utils/fixtures/fakeSupabase";
import { seedFixtureDb } from "@/utils/fixtures/seed";

// One in-memory fixture database per dev server process. It lives on globalThis
// so Server Components, Server Actions, and route handlers share it, and it
// survives module reloads while you edit code. Restarting the server reseeds it.

const GLOBAL_KEY = "__amanahFixtureDb";

type FixtureGlobal = typeof globalThis & { [GLOBAL_KEY]?: FixtureDb };

export function fixtureDb(): FixtureDb {
  const holder = globalThis as FixtureGlobal;
  if (!holder[GLOBAL_KEY]) {
    holder[GLOBAL_KEY] = seedFixtureDb();
    console.info("Fixtures: seeded fictional in-memory data. No Supabase or Gemini requests are made.");
  }
  return holder[GLOBAL_KEY];
}

/** The admin client used in fixture mode. */
export function createFixtureAdminClient() {
  return createFakeSupabase(fixtureDb());
}
