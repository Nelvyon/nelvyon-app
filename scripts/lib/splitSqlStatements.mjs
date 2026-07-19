#!/usr/bin/env node
/**
 * Port of backend/db/splitSqlStatements.ts for plain Node migrate-pg.mjs (KI-017).
 */
export function splitSqlStatements(sql) {
  const statements = [];
  let buf = "";
  let i = 0;

  while (i < sql.length) {
    const ch = sql[i];

    if (ch === "-" && sql[i + 1] === "-") {
      const nl = sql.indexOf("\n", i);
      if (nl === -1) {
        buf += sql.slice(i);
        break;
      }
      buf += sql.slice(i, nl + 1);
      i = nl + 1;
      continue;
    }

    if (ch === "$") {
      const match = sql.slice(i).match(/^\$([a-zA-Z0-9_]*)\$/);
      if (match) {
        const tag = match[0];
        buf += tag;
        i += tag.length;
        const end = sql.indexOf(tag, i);
        if (end === -1) throw new Error("Unclosed dollar-quoted string in migration SQL");
        buf += sql.slice(i, end + tag.length);
        i = end + tag.length;
        continue;
      }
    }

    if (ch === "'") {
      buf += ch;
      i += 1;
      while (i < sql.length) {
        if (sql[i] === "'") {
          buf += sql[i];
          i += 1;
          if (sql[i] === "'") {
            buf += sql[i];
            i += 1;
            continue;
          }
          break;
        }
        buf += sql[i];
        i += 1;
      }
      continue;
    }

    if (ch === '"') {
      buf += ch;
      i += 1;
      while (i < sql.length) {
        if (sql[i] === '"') {
          buf += sql[i];
          i += 1;
          if (sql[i] === '"') {
            buf += sql[i];
            i += 1;
            continue;
          }
          break;
        }
        buf += sql[i];
        i += 1;
      }
      continue;
    }

    if (ch === ";") {
      pushStatement(statements, buf);
      buf = "";
      i += 1;
      continue;
    }

    buf += ch;
    i += 1;
  }

  pushStatement(statements, buf);
  return statements;
}

function pushStatement(statements, raw) {
  const stmt = stripLeadingComments(raw).trim();
  if (stmt.length > 0) statements.push(stmt);
}

function stripLeadingComments(sql) {
  let s = sql.trimStart();
  for (;;) {
    if (s.startsWith("--")) {
      const nl = s.indexOf("\n");
      if (nl === -1) return "";
      s = s.slice(nl + 1).trimStart();
      continue;
    }
    break;
  }
  return s;
}

const TOLERABLE_CODES = new Set(["42601", "42701", "42703", "42710", "42830", "42883", "42P01", "42P16"]);

export function isTolerableConsolidatedMigrationError(err) {
  const code = err?.code ?? "";
  return TOLERABLE_CODES.has(code);
}
