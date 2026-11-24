import { parseSelect, SelectParseError, type SelectNode } from "@/utils/fixtures/selectParser";
import { RELATIONS, TABLES, type Row, type TableDef } from "@/utils/fixtures/schema";

// An in-memory stand-in for the parts of the Supabase admin client the app uses.
// Development fixture mode only (see docs/local-fixtures.md). It never opens a
// network connection.
//
// Supported: from(table).select(columns, { count, head }), insert(row | rows),
// upsert(rows, { onConflict, ignoreDuplicates: true }), update(values),
// delete({ count }) with ON DELETE CASCADE along schema foreign keys, filters eq / neq / in / is / lt / lte / gt / gte / ilike /
// not(column, op, value) / or("a.is.null,a.lt.x"), order (several, with
// nullsFirst), limit, maybeSingle, single, and rpc("consume_usage").
// Results resolve like supabase-js: { data, error, count, status, statusText }.

export type FixtureDb = { tables: Record<string, Row[]> };

export type FakeError = { code: string; message: string; details: null; hint: null };

type Result = {
  data: unknown;
  error: FakeError | null;
  count: number | null;
  status: number;
  statusText: string;
};

function fakeError(code: string, message: string): FakeError {
  return { code, message, details: null, hint: null };
}

function errorResult(error: FakeError, status = 400): Result {
  return { data: null, error, count: null, status, statusText: "Bad Request" };
}

class QueryError extends Error {
  error: FakeError;

  constructor(error: FakeError) {
    super(error.message);
    this.error = error;
  }
}

export function createEmptyDb(): FixtureDb {
  return {
    tables: Object.fromEntries(Object.keys(TABLES).map((name) => [name, [] as Row[]])),
  };
}

// ---------------------------------------------------------------------------
// Values and comparisons

const ISO_DATE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/;

function comparable(value: unknown): number | string | boolean | null {
  if (value === null || value === undefined) {
    return null;
  }
  if (typeof value === "string" && ISO_DATE.test(value)) {
    const time = Date.parse(value);
    if (!Number.isNaN(time)) {
      return time;
    }
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return value;
  }
  return String(value);
}

function compareValues(left: unknown, right: unknown): number | null {
  const a = comparable(left);
  const b = comparable(right);
  if (a === null || b === null) {
    return null;
  }
  if (typeof a === "number" && typeof b !== "number") {
    const parsed = Number(b);
    return Number.isNaN(parsed) ? null : a - parsed;
  }
  if (a === b) {
    return 0;
  }
  return a < b ? -1 : 1;
}

function equals(left: unknown, right: unknown) {
  if (left === null || left === undefined || right === null || right === undefined) {
    return false;
  }
  return compareValues(left, right) === 0;
}

function likeToRegExp(pattern: string, caseInsensitive: boolean) {
  const source = [...pattern]
    .map((char) =>
      char === "%"
        ? "[\\s\\S]*"
        : char === "_"
          ? "[\\s\\S]"
          : char.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
    )
    .join("");
  return new RegExp(`^${source}$`, caseInsensitive ? "i" : "");
}

type Predicate = (row: Row) => boolean;

function operatorPredicate(column: string, operator: string, raw: unknown): Predicate {
  switch (operator) {
    case "eq":
      return (row) => equals(row[column], raw);
    case "neq":
      return (row) => row[column] != null && raw != null && !equals(row[column], raw);
    case "lt":
      return (row) => row[column] != null && (compareValues(row[column], raw) ?? 0) < 0;
    case "lte":
      return (row) => row[column] != null && (compareValues(row[column], raw) ?? 1) <= 0;
    case "gt":
      return (row) => row[column] != null && (compareValues(row[column], raw) ?? 0) > 0;
    case "gte":
      return (row) => row[column] != null && (compareValues(row[column], raw) ?? -1) >= 0;
    case "like":
    case "ilike": {
      const pattern = likeToRegExp(String(raw), operator === "ilike");
      return (row) => typeof row[column] === "string" && pattern.test(row[column] as string);
    }
    case "is": {
      const target = raw === "null" ? null : raw === "true" ? true : raw === "false" ? false : raw;
      return (row) => (target === null ? row[column] == null : row[column] === target);
    }
    case "in": {
      const values = Array.isArray(raw)
        ? raw
        : String(raw).replace(/^\(|\)$/g, "").split(",").filter(Boolean);
      return (row) => values.some((item) => equals(row[column], item));
    }
    default:
      throw new QueryError(fakeError("PGRST100", `Unsupported filter operator "${operator}".`));
  }
}

/** Parses or() filters like "processing_until.is.null,processing_until.lt.2026-01-01T00:00:00Z". */
function orPredicate(filters: string): Predicate {
  const parts = filters.split(",").map((part) => part.trim()).filter(Boolean);
  const predicates = parts.map((part) => {
    const match = /^([A-Za-z_][A-Za-z0-9_]*)\.(not\.)?([a-z]+)\.(.*)$/.exec(part);
    if (!match) {
      throw new QueryError(fakeError("PGRST100", `Unsupported or() filter "${part}".`));
    }
    const [, column, negate, operator, raw] = match;
    const predicate = operatorPredicate(column, operator, raw);
    return negate ? (row: Row) => row[column] != null && !predicate(row) : predicate;
  });
  return (row) => predicates.some((predicate) => predicate(row));
}

// ---------------------------------------------------------------------------
// Embedded selects

function relationFor(from: string, to: string, hint: string | null) {
  const options = RELATIONS.filter(
    (relation) => relation.from === from && relation.to === to && (!hint || relation.hint === hint),
  );
  if (options.length !== 1) {
    throw new QueryError(
      fakeError(
        options.length === 0 ? "PGRST200" : "PGRST201",
        `Could not find a single relationship between '${from}' and '${to}'${hint ? ` using '${hint}'` : ""}.`,
      ),
    );
  }
  return options[0];
}

function checkColumn(table: string, column: string) {
  if (!TABLES[table].columns.includes(column)) {
    throw new QueryError(fakeError("42703", `column ${table}.${column} does not exist`));
  }
}

function validateSelect(table: string, nodes: SelectNode[]) {
  for (const node of nodes) {
    if (node.kind === "column") {
      checkColumn(table, node.name);
    } else if (node.kind === "embed") {
      if (!TABLES[node.table]) {
        throw new QueryError(fakeError("PGRST200", `Could not find the table '${node.table}'.`));
      }
      relationFor(table, node.table, node.hint);
      validateSelect(node.table, node.children);
    }
  }
}

function project(db: FixtureDb, table: string, row: Row, nodes: SelectNode[]): Row {
  const output: Row = {};
  for (const node of nodes) {
    if (node.kind === "star") {
      for (const column of TABLES[table].columns) {
        output[column] = row[column] ?? null;
      }
    } else if (node.kind === "column") {
      output[node.alias] = row[node.name] ?? null;
    } else {
      const relation = relationFor(table, node.table, node.hint);
      const related = db.tables[node.table].filter((other) =>
        equals(other[relation.foreign], row[relation.local]),
      );
      output[node.alias] =
        relation.kind === "many"
          ? related.map((other) => project(db, node.table, other, node.children))
          : related[0]
            ? project(db, node.table, related[0], node.children)
            : null;
    }
  }
  return output;
}

// ---------------------------------------------------------------------------
// Writes

function sameKey(def: { columns: string[]; nullsNotDistinct?: boolean }, a: Row, b: Row) {
  return def.columns.every((column) => {
    const left = a[column] ?? null;
    const right = b[column] ?? null;
    if (left === null || right === null) {
      return Boolean(def.nullsNotDistinct) && left === null && right === null;
    }
    return equals(left, right);
  });
}

function prepareInsert(db: FixtureDb, table: string, def: TableDef, input: Row, pending: Row[]) {
  for (const column of Object.keys(input)) {
    if (!def.columns.includes(column)) {
      throw new QueryError(
        fakeError("PGRST204", `Could not find the '${column}' column of '${table}' in the schema cache`),
      );
    }
  }
  const row: Row = {};
  for (const column of def.columns) {
    if (input[column] !== undefined) {
      row[column] = structuredClone(input[column]);
    } else if (def.defaults[column]) {
      row[column] = def.defaults[column]();
    } else {
      row[column] = null;
    }
  }
  for (const column of def.required) {
    if (row[column] === null || row[column] === undefined) {
      throw new QueryError(
        fakeError("23502", `null value in column "${column}" of relation "${table}" violates not-null constraint`),
      );
    }
  }
  for (const [column, allowed] of Object.entries(def.allowed ?? {})) {
    if (row[column] !== null && !allowed.includes(row[column])) {
      throw new QueryError(
        fakeError("23514", `new row for relation "${table}" violates check constraint on "${column}"`),
      );
    }
  }
  for (const key of def.foreignKeys ?? []) {
    // MATCH SIMPLE: a NULL in any referencing column skips the check.
    if (key.columns.some((column) => row[column] === null)) {
      continue;
    }
    const target = [...db.tables[key.table], ...(key.table === table ? pending : [])];
    const found = target.some((other) =>
      key.columns.every((column, index) => equals(row[column], other[key.refColumns[index]])),
    );
    if (!found) {
      throw new QueryError(
        fakeError("23503", `insert or update on table "${table}" violates foreign key constraint "${key.name}"`),
      );
    }
  }
  for (const key of def.unique) {
    if ([...db.tables[table], ...pending].some((other) => sameKey(key, row, other))) {
      throw new QueryError(
        fakeError("23505", `duplicate key value violates unique constraint "${key.name}"`),
      );
    }
  }
  return row;
}

/**
 * Removes rows and, like the migrations' ON DELETE CASCADE, every row that
 * references them through a schema foreign key. Returns the rows removed from
 * `table` itself.
 */
function deleteRows(db: FixtureDb, table: string, doomed: Row[]): Row[] {
  if (doomed.length === 0) {
    return [];
  }
  const removed = new Set(doomed);
  db.tables[table] = db.tables[table].filter((row) => !removed.has(row));
  for (const [child, def] of Object.entries(TABLES)) {
    for (const key of def.foreignKeys ?? []) {
      if (key.table !== table) {
        continue;
      }
      const dependents = db.tables[child].filter((row) =>
        doomed.some((parent) =>
          key.columns.every((column, index) => equals(row[column], parent[key.refColumns[index]])),
        ),
      );
      deleteRows(db, child, dependents);
    }
  }
  return doomed;
}

// ---------------------------------------------------------------------------
// Query builder

type Order = { column: string; ascending: boolean; nullsFirst: boolean };

class FakeQuery implements PromiseLike<Result> {
  private db: FixtureDb;
  private table: string;
  private action: "select" | "insert" | "upsert" | "update" | "delete" = "select";
  private conflictColumns: string[] = [];
  private columns: string | null = null;
  private countMode: "exact" | null = null;
  private head = false;
  private predicates: Predicate[] = [];
  private orders: Order[] = [];
  private limitCount: number | null = null;
  private singleMode: "maybe" | "one" | null = null;
  private values: Row | Row[] | null = null;
  private deferredError: FakeError | null = null;

  constructor(db: FixtureDb, table: string) {
    this.db = db;
    this.table = table;
  }

  select(columns = "*", options: { count?: "exact" | "planned" | "estimated"; head?: boolean } = {}) {
    this.columns = columns;
    if (options.count) {
      this.countMode = "exact";
    }
    this.head = Boolean(options.head);
    return this;
  }

  insert(values: Row | Row[]) {
    this.action = "insert";
    this.values = values;
    return this;
  }

  // Only ON CONFLICT DO NOTHING, which is all the app uses.
  upsert(values: Row | Row[], options: { onConflict?: string; ignoreDuplicates?: boolean } = {}) {
    this.action = "upsert";
    this.values = values;
    this.conflictColumns = (options.onConflict ?? "id").split(",").map((column) => column.trim());
    if (!options.ignoreDuplicates) {
      this.deferredError ??= fakeError("PGRST100", "The fixture upsert supports only ignoreDuplicates: true.");
    }
    return this;
  }

  update(values: Row) {
    this.action = "update";
    this.values = values;
    return this;
  }

  delete(options: { count?: "exact" | "planned" | "estimated" } = {}) {
    this.action = "delete";
    if (options.count) {
      this.countMode = "exact";
    }
    return this;
  }

  private filter(column: string, operator: string, value: unknown) {
    try {
      this.predicates.push(operatorPredicate(column, operator, value));
    } catch (error) {
      this.deferredError ??= error instanceof QueryError ? error.error : fakeError("PGRST100", "Bad filter.");
    }
    return this;
  }

  eq(column: string, value: unknown) {
    return this.filter(column, "eq", value);
  }

  neq(column: string, value: unknown) {
    return this.filter(column, "neq", value);
  }

  lt(column: string, value: unknown) {
    return this.filter(column, "lt", value);
  }

  lte(column: string, value: unknown) {
    return this.filter(column, "lte", value);
  }

  gt(column: string, value: unknown) {
    return this.filter(column, "gt", value);
  }

  gte(column: string, value: unknown) {
    return this.filter(column, "gte", value);
  }

  like(column: string, pattern: string) {
    return this.filter(column, "like", pattern);
  }

  ilike(column: string, pattern: string) {
    return this.filter(column, "ilike", pattern);
  }

  is(column: string, value: null | boolean) {
    return this.filter(column, "is", value === null ? "null" : String(value));
  }

  in(column: string, values: unknown[]) {
    return this.filter(column, "in", values);
  }

  not(column: string, operator: string, value: unknown) {
    try {
      const predicate = operatorPredicate(column, operator, value);
      // Like SQL, NOT of a comparison with NULL is still not true.
      this.predicates.push((row) => row[column] != null && !predicate(row));
    } catch (error) {
      this.deferredError ??= error instanceof QueryError ? error.error : fakeError("PGRST100", "Bad filter.");
    }
    return this;
  }

  or(filters: string) {
    try {
      this.predicates.push(orPredicate(filters));
    } catch (error) {
      this.deferredError ??= error instanceof QueryError ? error.error : fakeError("PGRST100", "Bad filter.");
    }
    return this;
  }

  order(column: string, options: { ascending?: boolean; nullsFirst?: boolean } = {}) {
    const ascending = options.ascending ?? true;
    // PostgreSQL default: NULLS LAST when ascending, NULLS FIRST when descending.
    this.orders.push({ column, ascending, nullsFirst: options.nullsFirst ?? !ascending });
    return this;
  }

  limit(count: number) {
    this.limitCount = count;
    return this;
  }

  maybeSingle() {
    this.singleMode = "maybe";
    return this;
  }

  single() {
    this.singleMode = "one";
    return this;
  }

  then<TResult1 = Result, TResult2 = never>(
    onfulfilled?: ((value: Result) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ): PromiseLike<TResult1 | TResult2> {
    return Promise.resolve()
      .then(() => this.execute())
      .then(onfulfilled, onrejected);
  }

  private matchingRows() {
    return this.db.tables[this.table].filter((row) =>
      this.predicates.every((predicate) => predicate(row)),
    );
  }

  private sorted(rows: Row[]) {
    if (this.orders.length === 0) {
      return rows;
    }
    return [...rows].sort((a, b) => {
      for (const order of this.orders) {
        const left = a[order.column];
        const right = b[order.column];
        if (left == null || right == null) {
          if (left == null && right == null) {
            continue;
          }
          return (left == null) === order.nullsFirst ? -1 : 1;
        }
        const compared = compareValues(left, right) ?? 0;
        if (compared !== 0) {
          return order.ascending ? compared : -compared;
        }
      }
      return 0;
    });
  }

  private output(rows: Row[]): Result {
    const nodes = parseSelect(this.columns ?? "*");
    validateSelect(this.table, nodes);
    const count = this.countMode ? rows.length : null;
    let selected = this.sorted(rows);
    if (this.limitCount !== null) {
      selected = selected.slice(0, this.limitCount);
    }
    const data = selected.map((row) => structuredClone(project(this.db, this.table, row, nodes)));

    if (this.singleMode) {
      if (data.length > 1 || (this.singleMode === "one" && data.length === 0)) {
        return errorResult(
          fakeError("PGRST116", "JSON object requested, multiple (or no) rows returned"),
          406,
        );
      }
      return { data: data[0] ?? null, error: null, count, status: 200, statusText: "OK" };
    }
    return {
      data: this.head ? null : data,
      error: null,
      count,
      status: 200,
      statusText: "OK",
    };
  }

  private execute(): Result {
    try {
      const def = TABLES[this.table];
      if (!def) {
        throw new QueryError(
          fakeError("PGRST205", `Could not find the table 'public.${this.table}' in the schema cache`),
        );
      }
      if (this.deferredError) {
        throw new QueryError(this.deferredError);
      }

      if (this.action === "insert") {
        const inputs = Array.isArray(this.values) ? this.values : [this.values ?? {}];
        const pending: Row[] = [];
        for (const input of inputs) {
          pending.push(prepareInsert(this.db, this.table, def, input, pending));
        }
        this.db.tables[this.table].push(...pending);
        if (this.columns === null) {
          return { data: null, error: null, count: null, status: 201, statusText: "Created" };
        }
        return { ...this.output(pending), status: 201, statusText: "Created" };
      }

      if (this.action === "upsert") {
        const inputs = Array.isArray(this.values) ? this.values : [this.values ?? {}];
        const pending: Row[] = [];
        for (const input of inputs) {
          const conflict = [...this.db.tables[this.table], ...pending].some((other) =>
            this.conflictColumns.every((column) => equals(other[column], input[column])),
          );
          if (!conflict) {
            pending.push(prepareInsert(this.db, this.table, def, input, pending));
          }
        }
        this.db.tables[this.table].push(...pending);
        if (this.columns === null) {
          return { data: null, error: null, count: null, status: 201, statusText: "Created" };
        }
        return { ...this.output(pending), status: 201, statusText: "Created" };
      }

      if (this.action === "delete") {
        const rows = deleteRows(this.db, this.table, this.matchingRows());
        const count = this.countMode ? rows.length : null;
        if (this.columns === null) {
          return { data: null, error: null, count, status: 204, statusText: "No Content" };
        }
        return { ...this.output(rows), count };
      }

      if (this.action === "update") {
        const values = (this.values ?? {}) as Row;
        for (const column of Object.keys(values)) {
          checkColumn(this.table, column);
        }
        const rows = this.matchingRows();
        for (const row of rows) {
          Object.assign(row, structuredClone(values));
        }
        if (this.columns === null) {
          return { data: null, error: null, count: null, status: 204, statusText: "No Content" };
        }
        return this.output(rows);
      }

      return this.output(this.matchingRows());
    } catch (error) {
      if (error instanceof QueryError) {
        return errorResult(error.error);
      }
      if (error instanceof SelectParseError) {
        return errorResult(fakeError("PGRST100", error.message));
      }
      throw error;
    }
  }
}

const USAGE_FUNCTION = "consume_usage";

/** The fake client. Shape-compatible with the calls the app makes on the admin client. */
export function createFakeSupabase(db: FixtureDb) {
  return {
    from(table: string) {
      return new FakeQuery(db, table);
    },
    // Usage limits always allow in fixture mode; nothing is counted.
    async rpc(name: string, args: Record<string, unknown> = {}): Promise<Result> {
      if (name !== USAGE_FUNCTION) {
        return errorResult(fakeError("PGRST202", `Could not find the function public.${name}`), 404);
      }
      const buckets = args.p_buckets;
      if (!Array.isArray(buckets) || buckets.length < 1 || buckets.length > 6) {
        return { data: "unavailable", error: null, count: null, status: 200, statusText: "OK" };
      }
      return { data: "ok", error: null, count: null, status: 200, statusText: "OK" };
    },
  };
}

export type FakeSupabase = ReturnType<typeof createFakeSupabase>;
