#!/usr/bin/env node
/**
 * Self-check for scripts/lib/splitSqlStatements.mjs (KI-017 / migrate-pg).
 * Run: node scripts/validate-split-sql.mjs
 */
import { splitSqlStatements } from "./lib/splitSqlStatements.mjs";
import assert from "node:assert/strict";

const sql = `
CREATE FUNCTION foo() RETURNS text AS $body$
BEGIN
  -- semicolon inside dollar quote must not split:
  SELECT 'a;b';
END;
$body$ LANGUAGE plpgsql;

CREATE TABLE bar (id int);
`;

const stmts = splitSqlStatements(sql);
assert.equal(stmts.length, 2, `expected 2 statements, got ${stmts.length}`);
assert.match(stmts[0], /\$body\$/);
assert.match(stmts[0], /a;b/);
assert.match(stmts[1], /CREATE TABLE bar/);

console.log("validate-split-sql: OK");
process.exit(0);
