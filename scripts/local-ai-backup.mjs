#!/usr/bin/env node
import { execSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const url =
  process.env.LOCAL_AI_DATABASE_URL ??
  "postgresql://nelvyon_local_app:nelvyon_local_app_dev@127.0.0.1:5434/nelvyon_local_ai";
const container = "nelvyon-local-ai-postgres";
const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "backend", "local-ai", "backups");
const stamp = new Date().toISOString().replace(/[:.]/g, "-");
const out = path.join(dir, `local_ai_${stamp}.sql`);
const dumpInContainer = `/tmp/local_ai_${stamp}.sql`;

execSync(`mkdir "${dir}" 2>nul || mkdir -p "${dir}"`, { shell: true, stdio: "ignore" });
execSync(`docker exec ${container} pg_dump -U nelvyon_local -d nelvyon_local_ai --no-owner -f ${dumpInContainer}`, {
  stdio: "inherit",
});
execSync(`docker cp ${container}:${dumpInContainer} "${out}"`, { stdio: "inherit" });
execSync(`docker exec ${container} rm -f ${dumpInContainer}`, { stdio: "ignore" });
console.log(`LOCAL_AI_BACKUP_OK ${out}`);
