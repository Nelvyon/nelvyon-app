#!/usr/bin/env node
/** @deprecated Use scripts/apply-local-ai-rls-role.mjs (same behavior; prod gate added). */
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const target = join(dirname(fileURLToPath(import.meta.url)), "apply-local-ai-rls-role.mjs");
const r = spawnSync(process.execPath, [target], { stdio: "inherit", env: process.env });
process.exit(r.status ?? 1);
