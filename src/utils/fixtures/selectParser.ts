// Parses the PostgREST select strings the app uses, for the fixture database:
//   "id, report_type"                       columns
//   "alias:column"                          renamed column
//   "*"                                     every column
//   "report:reports(report_type, id)"       embedded table
//   "lost:reports!some_fkey(item_name)"     embedded table through a named foreign key
// Whitespace and newlines are ignored, and embeds may nest.

export type SelectNode =
  | { kind: "star" }
  | { kind: "column"; name: string; alias: string }
  | { kind: "embed"; alias: string; table: string; hint: string | null; children: SelectNode[] };

export class SelectParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SelectParseError";
  }
}

/** Splits on commas that are not inside parentheses. */
function splitTopLevel(text: string) {
  const parts: string[] = [];
  let depth = 0;
  let current = "";
  for (const char of text) {
    if (char === "(") {
      depth += 1;
    } else if (char === ")") {
      depth -= 1;
      if (depth < 0) {
        throw new SelectParseError("Unbalanced parentheses in select.");
      }
    }
    if (char === "," && depth === 0) {
      parts.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  if (depth !== 0) {
    throw new SelectParseError("Unbalanced parentheses in select.");
  }
  parts.push(current);
  return parts;
}

const IDENTIFIER = /^[A-Za-z_][A-Za-z0-9_]*$/;

function identifier(value: string, what: string) {
  if (!IDENTIFIER.test(value)) {
    throw new SelectParseError(`Invalid ${what} "${value}" in select.`);
  }
  return value;
}

function parseItem(item: string): SelectNode {
  if (item === "*") {
    return { kind: "star" };
  }
  const open = item.indexOf("(");
  if (open === -1) {
    const [first, second] = item.split(":");
    if (item.split(":").length > 2) {
      throw new SelectParseError(`Invalid select item "${item}".`);
    }
    return second === undefined
      ? { kind: "column", name: identifier(first, "column"), alias: first }
      : { kind: "column", name: identifier(second, "column"), alias: identifier(first, "alias") };
  }
  if (!item.endsWith(")")) {
    throw new SelectParseError(`Invalid embedded select "${item}".`);
  }
  const head = item.slice(0, open);
  const inner = item.slice(open + 1, -1);
  const colon = head.indexOf(":");
  const alias = colon === -1 ? null : head.slice(0, colon);
  const target = colon === -1 ? head : head.slice(colon + 1);
  const [table, hint] = target.split("!");
  identifier(table, "table");
  return {
    kind: "embed",
    alias: alias === null ? table : identifier(alias, "alias"),
    table,
    hint: hint === undefined ? null : identifier(hint, "foreign key hint"),
    children: parseSelect(inner),
  };
}

export function parseSelect(columns: string): SelectNode[] {
  const compact = columns.replace(/\s+/g, "");
  if (!compact) {
    return [{ kind: "star" }];
  }
  return splitTopLevel(compact).map((item) => {
    if (!item) {
      throw new SelectParseError("Empty item in select.");
    }
    return parseItem(item);
  });
}
