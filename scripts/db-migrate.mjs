// Applies db/migrations/*.sql to the database in DATABASE_URL_UNPOOLED (or
// DATABASE_URL), in filename order, each file once and in its own transaction.
// Applied files are recorded in public.schema_migrations.
//
//   npm run db:migrate            apply pending files
//   npm run db:migrate -- --list  show what is applied and what is pending
//
// Reads .env.local when it exists. Never prints connection strings.
import { readdir, readFile } from "node:fs/promises";
import { Pool } from "@neondatabase/serverless";

const dir = new URL("../db/migrations/", import.meta.url);
const url = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;
if (!url) {
  console.error("Set DATABASE_URL (or DATABASE_URL_UNPOOLED) first, for example in .env.local.");
  process.exit(1);
}

const listOnly = process.argv.includes("--list");
const pool = new Pool({ connectionString: url });
const client = await pool.connect();

try {
  await client.query(`
    create table if not exists public.schema_migrations (
      name text primary key,
      applied_at timestamptz not null default now()
    )`);
  const applied = new Set(
    (await client.query("select name from public.schema_migrations")).rows.map((row) => row.name),
  );
  const files = (await readdir(dir)).filter((name) => name.endsWith(".sql")).sort();

  for (const name of files) {
    if (applied.has(name)) {
      console.log(`applied  ${name}`);
      continue;
    }
    if (listOnly) {
      console.log(`pending  ${name}`);
      continue;
    }
    const text = await readFile(new URL(name, dir), "utf8");
    try {
      await client.query("begin");
      await client.query(text);
      await client.query("insert into public.schema_migrations (name) values ($1)", [name]);
      await client.query("commit");
      console.log(`applying ${name} ... done`);
    } catch (error) {
      await client.query("rollback");
      console.error(`applying ${name} ... failed: ${error.code ?? ""} ${error.message}`);
      process.exitCode = 1;
      break;
    }
  }
} finally {
  client.release();
  await pool.end();
}
